import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentsService } from '../catalog/documents.service';
import { LoansService } from '../loans/loans.service';
import {
  HOLD_OFFERED,
  HoldOfferedEvent,
  LOAN_RELEASED,
  LoanReleasedEvent,
} from '../notifications/events';
import { Hold } from './entities/hold.entity';

const OFFER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 jam untuk klaim

@Injectable()
export class HoldsService {
  private readonly logger = new Logger(HoldsService.name);

  constructor(
    @InjectRepository(Hold)
    private readonly repo: Repository<Hold>,
    private readonly documentsService: DocumentsService,
    private readonly loansService: LoansService,
    private readonly events: EventEmitter2,
  ) {}

  /** Masuk antrian untuk koleksi yang lisensinya sedang penuh. */
  async join(userId: string, documentId: string): Promise<Hold> {
    const doc = await this.documentsService.findById(documentId);
    if (doc.status !== 'PUBLISHED' || doc.accessType !== 'LOAN') {
      throw new BadRequestException('Koleksi ini tidak memakai skema peminjaman');
    }

    const activeLoan = await this.loansService.findActiveLoan(userId, documentId);
    if (activeLoan) {
      throw new ConflictException('Anda sedang meminjam koleksi ini');
    }

    const existing = await this.myActiveHold(userId, documentId);
    if (existing) {
      throw new ConflictException('Anda sudah berada dalam antrian koleksi ini');
    }

    const used = await this.loansService.usedSlots(documentId);
    if (used < doc.licenseCount) {
      throw new ConflictException(
        'Masih ada kopi tersedia — silakan langsung pinjam.',
      );
    }

    return this.repo.save(
      this.repo.create({ userId, document: doc, status: 'WAITING' }),
    );
  }

  async myHolds(userId: string): Promise<Hold[]> {
    return this.repo.find({
      where: { userId },
      order: { queuedAt: 'DESC' },
      take: 50,
    });
  }

  async cancel(userId: string, holdId: string): Promise<Hold> {
    const hold = await this.repo.findOne({ where: { id: holdId } });
    if (!hold) throw new NotFoundException('Antrian tidak ditemukan');
    if (hold.userId !== userId) {
      throw new ForbiddenException('Antrian ini bukan milik Anda');
    }
    if (hold.status !== 'WAITING' && hold.status !== 'OFFERED') {
      throw new BadRequestException('Antrian sudah tidak aktif');
    }
    const wasOffered = hold.status === 'OFFERED';
    const documentId = hold.document.id;
    hold.status = 'CANCELLED';
    const saved = await this.repo.save(hold);
    // Bila tawaran dibatalkan, slot bebas → tawarkan ke antrian berikutnya.
    if (wasOffered) await this.offerNextInQueue(documentId);
    return saved;
  }

  /** Klaim tawaran → jadi pinjaman. Slot sudah dipesan oleh tawaran. */
  async claim(
    userId: string,
    holdId: string,
    durationDays?: number,
  ): Promise<{ loanId: string }> {
    const hold = await this.repo.findOne({ where: { id: holdId } });
    if (!hold) throw new NotFoundException('Antrian tidak ditemukan');
    if (hold.userId !== userId) {
      throw new ForbiddenException('Antrian ini bukan milik Anda');
    }
    if (hold.status !== 'OFFERED') {
      throw new BadRequestException('Tidak ada tawaran aktif untuk diklaim');
    }
    if (hold.offerExpiresAt && hold.offerExpiresAt <= new Date()) {
      throw new BadRequestException('Tawaran sudah kedaluwarsa');
    }

    // Durasi default = pilihan pertama koleksi bila tak disebut/invalid.
    const durations = hold.document.loanDurations ?? [7];
    const duration =
      durationDays && durations.includes(durationDays)
        ? durationDays
        : durations[0];

    // Tandai CLAIMED lebih dulu agar slot tidak terhitung ganda; revert bila gagal.
    hold.status = 'CLAIMED';
    await this.repo.save(hold);
    try {
      const loan = await this.loansService.grantLoan(
        userId,
        hold.document.id,
        duration,
      );
      return { loanId: loan.id };
    } catch (err) {
      hold.status = 'OFFERED';
      await this.repo.save(hold);
      throw err;
    }
  }

  /**
   * Ringkasan ketersediaan + posisi antrian untuk satu koleksi & user.
   * Dipakai frontend menentukan tombol: Pinjam / Antre / Klaim / Baca.
   */
  async availability(userId: string, documentId: string) {
    const doc = await this.documentsService.findById(documentId);
    const now = new Date();

    const activeLoans = await this.loansService.countActiveLoans(documentId);
    const used = await this.loansService.usedSlots(documentId, now);
    const queueLength = await this.repo.count({
      where: { document: { id: documentId }, status: 'WAITING' },
    });

    const myLoan = await this.loansService.findActiveLoan(userId, documentId);
    const myHold = await this.myActiveHold(userId, documentId);

    let position: number | null = null;
    if (myHold?.status === 'WAITING') {
      // Cari indeks berbasis id agar tidak bergantung pada perbandingan
      // datetime di SQL (format CreateDateColumn beda antar driver).
      const queue = await this.repo.find({
        where: { document: { id: documentId }, status: 'WAITING' },
        order: { queuedAt: 'ASC' },
      });
      const idx = queue.findIndex((h) => h.id === myHold.id);
      position = idx >= 0 ? idx + 1 : null;
    }

    return {
      licenseCount: doc.licenseCount,
      activeLoans,
      available: used < doc.licenseCount,
      queueLength,
      loanDurations: doc.loanDurations,
      myLoan: myLoan
        ? { id: myLoan.id, expiresAt: myLoan.expiresAt }
        : null,
      myHold: myHold
        ? {
            id: myHold.id,
            status: myHold.status,
            position,
            offerExpiresAt: myHold.offerExpiresAt,
          }
        : null,
    };
  }

  /** Saat lisensi bebas: tawarkan ke antrian terdepan (FIFO). */
  async offerNextInQueue(documentId: string): Promise<void> {
    const doc = await this.documentsService.findById(documentId);
    const now = new Date();
    if ((await this.loansService.usedSlots(documentId, now)) >= doc.licenseCount) {
      return; // tidak ada slot bebas
    }
    const next = await this.repo.findOne({
      where: { document: { id: documentId }, status: 'WAITING' },
      order: { queuedAt: 'ASC' },
    });
    if (!next) return;

    next.status = 'OFFERED';
    next.offeredAt = now;
    next.offerExpiresAt = new Date(now.getTime() + OFFER_WINDOW_MS);
    await this.repo.save(next);

    this.events.emit(
      HOLD_OFFERED,
      new HoldOfferedEvent(
        next.userId,
        doc.title,
        doc.slug,
        next.offerExpiresAt,
      ),
    );
    this.logger.log(`Tawaran antrian dikirim untuk "${doc.title}"`);
  }

  /** Listener: lisensi kembali ke pool → geser antrian. */
  @OnEvent(LOAN_RELEASED)
  async onLoanReleased(event: LoanReleasedEvent): Promise<void> {
    await this.offerNextInQueue(event.documentId).catch((err) =>
      this.logger.error(`Gagal menawarkan antrian: ${err.message}`),
    );
  }

  /** Tawaran yang lewat jendela klaim → kedaluwarsa, lanjut ke berikutnya. */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireStaleOffers(): Promise<void> {
    const stale = await this.repo
      .createQueryBuilder('hold')
      .leftJoinAndSelect('hold.document', 'document')
      .where('hold.status = :st AND hold.offerExpiresAt <= :now', {
        st: 'OFFERED',
        now: new Date(),
      })
      .getMany();
    for (const hold of stale) {
      hold.status = 'EXPIRED';
      await this.repo.save(hold);
      await this.offerNextInQueue(hold.document.id);
    }
    if (stale.length) {
      this.logger.log(`${stale.length} tawaran antrian kedaluwarsa`);
    }
  }

  private myActiveHold(
    userId: string,
    documentId: string,
  ): Promise<Hold | null> {
    return this.repo.findOne({
      where: [
        { userId, document: { id: documentId }, status: 'WAITING' },
        { userId, document: { id: documentId }, status: 'OFFERED' },
      ],
    });
  }
}
