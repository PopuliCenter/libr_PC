import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DocumentsService } from '../catalog/documents.service';
import { Loan } from './entities/loan.entity';

const MAX_ACTIVE_LOANS_PER_USER = 3;

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);

  constructor(
    @InjectRepository(Loan)
    private readonly repo: Repository<Loan>,
    private readonly documentsService: DocumentsService,
    private readonly dataSource: DataSource,
  ) {}

  async borrow(
    userId: string,
    documentId: string,
    durationDays: number,
  ): Promise<Loan> {
    const doc = await this.documentsService.findById(documentId);
    if (doc.status !== 'PUBLISHED' || doc.accessType !== 'LOAN') {
      throw new BadRequestException('Koleksi ini tidak memakai skema peminjaman');
    }
    if (!doc.masterObjectKey) {
      throw new BadRequestException('Versi digital koleksi ini belum tersedia');
    }
    if (!doc.loanDurations.includes(durationDays)) {
      throw new BadRequestException(
        `Durasi tidak valid. Pilihan: ${doc.loanDurations.join(', ')} hari`,
      );
    }

    // Transaksi: cek kuota lisensi + batas pinjaman lalu buat loan secara atomik.
    return this.dataSource.transaction(async (manager) => {
      const loans = manager.getRepository(Loan);
      const now = new Date();

      const existing = await loans.findOne({
        where: { userId, document: { id: documentId }, status: 'ACTIVE' },
      });
      if (existing && existing.expiresAt > now) {
        throw new ConflictException('Anda sudah meminjam koleksi ini');
      }

      const activeByUser = await loans
        .createQueryBuilder('loan')
        .where('loan.userId = :userId AND loan.status = :st AND loan.expiresAt > :now', {
          userId,
          st: 'ACTIVE',
          now,
        })
        .getCount();
      if (activeByUser >= MAX_ACTIVE_LOANS_PER_USER) {
        throw new ConflictException(
          `Batas pinjaman aktif tercapai (maksimal ${MAX_ACTIVE_LOANS_PER_USER})`,
        );
      }

      const activeOnDoc = await loans
        .createQueryBuilder('loan')
        .where(
          'loan.documentId = :documentId AND loan.status = :st AND loan.expiresAt > :now',
          { documentId, st: 'ACTIVE', now },
        )
        .getCount();
      if (activeOnDoc >= doc.licenseCount) {
        throw new ConflictException(
          'Semua kopi digital sedang dipinjam. Silakan coba lagi nanti.',
        );
      }

      return loans.save(
        loans.create({
          userId,
          document: doc,
          status: 'ACTIVE',
          durationDays,
          expiresAt: new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000),
        }),
      );
    });
  }

  async returnLoan(userId: string, loanId: string): Promise<Loan> {
    const loan = await this.repo.findOne({ where: { id: loanId } });
    if (!loan) throw new NotFoundException('Peminjaman tidak ditemukan');
    if (loan.userId !== userId) {
      throw new ForbiddenException('Peminjaman ini bukan milik Anda');
    }
    if (loan.status !== 'ACTIVE') {
      throw new BadRequestException('Peminjaman sudah tidak aktif');
    }
    loan.status = 'RETURNED';
    loan.returnedAt = new Date();
    return this.repo.save(loan);
  }

  /** Pinjaman aktif user (dengan lazy expiry — yang lewat tempo ditandai EXPIRED). */
  async myLoans(userId: string): Promise<Loan[]> {
    const loans = await this.repo.find({
      where: { userId },
      order: { borrowedAt: 'DESC' },
      take: 50,
    });
    const now = new Date();
    for (const loan of loans) {
      if (loan.status === 'ACTIVE' && loan.expiresAt <= now) {
        loan.status = 'EXPIRED';
        await this.repo.save(loan);
      }
    }
    return loans;
  }

  /**
   * Validasi hak baca via pinjaman — dipanggil reader pada SETIAP permintaan
   * halaman (lazy check), sehingga akses mati seketika saat jatuh tempo.
   */
  async findActiveLoan(
    userId: string,
    documentId: string,
  ): Promise<Loan | null> {
    const loan = await this.repo.findOne({
      where: { userId, document: { id: documentId }, status: 'ACTIVE' },
    });
    if (!loan) return null;
    if (loan.expiresAt <= new Date()) {
      loan.status = 'EXPIRED';
      await this.repo.save(loan);
      return null;
    }
    return loan;
  }

  /** Penegakan lapis kedua: scheduler menandai pinjaman lewat tempo tiap menit. */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireOverdueLoans(): Promise<void> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Loan)
      .set({ status: 'EXPIRED' })
      .where('status = :st AND expiresAt <= :now', {
        st: 'ACTIVE',
        now: new Date(),
      })
      .execute();
    if (result.affected) {
      this.logger.log(`${result.affected} pinjaman ditandai kedaluwarsa`);
    }
  }
}
