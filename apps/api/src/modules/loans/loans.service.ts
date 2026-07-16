import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { DocumentsService } from '../catalog/documents.service';
import { Document } from '../catalog/entities/document.entity';
import { Hold } from '../holds/entities/hold.entity';
import {
  LOAN_CREATED,
  LOAN_EXPIRING,
  LOAN_RELEASED,
  LoanCreatedEvent,
  LoanExpiringEvent,
  LoanReleasedEvent,
} from '../notifications/events';
import { Loan } from './entities/loan.entity';

const MAX_ACTIVE_LOANS_PER_USER = 3;

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);

  constructor(
    @InjectRepository(Loan)
    private readonly repo: Repository<Loan>,
    @InjectRepository(Hold)
    private readonly holds: Repository<Hold>,
    private readonly documentsService: DocumentsService,
    private readonly dataSource: DataSource,
    private readonly events: EventEmitter2,
  ) {}

  async borrow(
    userId: string,
    documentId: string,
    durationDays: number,
  ): Promise<Loan> {
    const doc = await this.assertLoanable(documentId, durationDays);

    // Transaksi: cek kuota lisensi + batas pinjaman lalu buat loan secara atomik.
    const loan = await this.dataSource.transaction(async (manager) => {
      const loans = manager.getRepository(Loan);
      const now = new Date();

      const existing = await loans.findOne({
        where: { userId, document: { id: documentId }, status: 'ACTIVE' },
      });
      if (existing && existing.expiresAt > now) {
        throw new ConflictException('Anda sudah meminjam koleksi ini');
      }

      await this.assertWithinUserLimit(loans, userId, now);

      // Slot terpakai = pinjaman aktif + tawaran antrian yang masih berlaku.
      const used = await this.usedSlots(documentId, now, manager);
      if (used >= doc.licenseCount) {
        throw new ConflictException(
          'Semua kopi digital sedang dipinjam. Silakan masuk antrian.',
        );
      }

      return loans.save(
        loans.create({
          userId,
          document: doc,
          status: 'ACTIVE',
          durationDays,
          expiresAt: this.dueDate(now, durationDays),
        }),
      );
    });

    this.emitCreated(loan);
    return loan;
  }

  /**
   * Buat pinjaman dari klaim antrian — slot sudah dipesan oleh tawaran,
   * jadi cek kapasitas dilewati (tetap cek batas per-user).
   */
  async grantLoan(
    userId: string,
    documentId: string,
    durationDays: number,
  ): Promise<Loan> {
    const doc = await this.assertLoanable(documentId, durationDays);
    const now = new Date();
    await this.assertWithinUserLimit(this.repo, userId, now);

    const loan = await this.repo.save(
      this.repo.create({
        userId,
        document: doc,
        status: 'ACTIVE',
        durationDays,
        expiresAt: this.dueDate(now, durationDays),
      }),
    );
    this.emitCreated(loan);
    return loan;
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
    const saved = await this.repo.save(loan);
    this.emitReleased(saved, 'returned');
    return saved;
  }

  /** Pinjaman user (dengan lazy expiry — yang lewat tempo ditandai EXPIRED). */
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
        this.emitReleased(loan, 'expired');
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
      this.emitReleased(loan, 'expired');
      return null;
    }
    return loan;
  }

  /** Jumlah slot terpakai (pinjaman aktif + tawaran antrian berlaku). */
  async usedSlots(
    documentId: string,
    now = new Date(),
    manager = this.dataSource.manager,
  ): Promise<number> {
    const activeLoans = await manager.getRepository(Loan).count({
      where: {
        document: { id: documentId },
        status: 'ACTIVE',
      },
    });
    const liveOffers = await manager
      .getRepository(Hold)
      .createQueryBuilder('hold')
      .where(
        'hold.documentId = :documentId AND hold.status = :st AND hold.offerExpiresAt > :now',
        { documentId, st: 'OFFERED', now },
      )
      .getCount();
    // Catatan: pinjaman aktif dihitung apa adanya; lazy/cron expiry menjaga
    // agar yang lewat tempo tak lagi berstatus ACTIVE.
    return activeLoans + liveOffers;
  }

  countActiveLoans(documentId: string): Promise<number> {
    return this.repo.count({
      where: { document: { id: documentId }, status: 'ACTIVE' },
    });
  }

  /** Penegakan lapis kedua: tandai pinjaman lewat tempo tiap menit + picu antrian. */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireOverdueLoans(): Promise<void> {
    const overdue = await this.repo.find({
      where: { status: 'ACTIVE', expiresAt: LessThanOrEqual(new Date()) },
    });
    for (const loan of overdue) {
      loan.status = 'EXPIRED';
      await this.repo.save(loan);
      this.emitReleased(loan, 'expired');
    }
    if (overdue.length) {
      this.logger.log(`${overdue.length} pinjaman ditandai kedaluwarsa`);
    }
  }

  /** Pengingat H-1: kirim sekali untuk pinjaman yang jatuh tempo < 24 jam. */
  @Cron(CronExpression.EVERY_HOUR)
  async remindExpiringLoans(): Promise<void> {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const loans = await this.repo
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.document', 'document')
      .where(
        'loan.status = :st AND loan.expiringNotifiedAt IS NULL AND loan.expiresAt > :now AND loan.expiresAt <= :soon',
        { st: 'ACTIVE', now, soon },
      )
      .getMany();
    for (const loan of loans) {
      loan.expiringNotifiedAt = now;
      await this.repo.save(loan);
      this.events.emit(
        LOAN_EXPIRING,
        new LoanExpiringEvent(loan.userId, loan.document.title, loan.expiresAt),
      );
    }
    if (loans.length) {
      this.logger.log(`${loans.length} pengingat jatuh tempo dikirim`);
    }
  }

  // ===== Pembantu privat =====

  private async assertLoanable(
    documentId: string,
    durationDays: number,
  ): Promise<Document> {
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
    return doc;
  }

  private async assertWithinUserLimit(
    loans: Repository<Loan>,
    userId: string,
    now: Date,
  ): Promise<void> {
    const activeByUser = await loans
      .createQueryBuilder('loan')
      .where(
        'loan.userId = :userId AND loan.status = :st AND loan.expiresAt > :now',
        { userId, st: 'ACTIVE', now },
      )
      .getCount();
    if (activeByUser >= MAX_ACTIVE_LOANS_PER_USER) {
      throw new ConflictException(
        `Batas pinjaman aktif tercapai (maksimal ${MAX_ACTIVE_LOANS_PER_USER})`,
      );
    }
  }

  private dueDate(now: Date, durationDays: number): Date {
    return new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  }

  private emitCreated(loan: Loan): void {
    this.events.emit(
      LOAN_CREATED,
      new LoanCreatedEvent(loan.userId, loan.document.title, loan.expiresAt),
    );
  }

  private emitReleased(loan: Loan, reason: 'returned' | 'expired'): void {
    this.events.emit(
      LOAN_RELEASED,
      new LoanReleasedEvent(
        loan.document.id,
        loan.userId,
        loan.document.title,
        reason,
      ),
    );
  }
}
