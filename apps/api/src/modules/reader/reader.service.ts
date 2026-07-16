import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentsService } from '../catalog/documents.service';
import { LoansService } from '../loans/loans.service';
import { User } from '../users/entities/user.entity';
import { PdfRenderService } from './pdf-render.service';
import { ReadingSession } from './entities/reading-session.entity';

const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 jam

@Injectable()
export class ReaderService {
  constructor(
    @InjectRepository(ReadingSession)
    private readonly sessions: Repository<ReadingSession>,
    private readonly documentsService: DocumentsService,
    private readonly loansService: LoansService,
    private readonly renderService: PdfRenderService,
  ) {}

  /** Buka sesi baca — memeriksa hak akses sesuai tipe koleksi. */
  async openSession(user: User, documentId: string) {
    const doc = await this.documentsService.findById(documentId);
    if (doc.status !== 'PUBLISHED') {
      throw new NotFoundException('Koleksi tidak ditemukan');
    }
    if (!doc.masterObjectKey) {
      throw new BadRequestException('Versi digital koleksi ini belum tersedia');
    }

    let loanId: string | null = null;
    if (doc.accessType === 'LOAN' && !this.isStaff(user)) {
      const loan = await this.loansService.findActiveLoan(user.id, doc.id);
      if (!loan) {
        throw new ForbiddenException(
          'Koleksi ini harus dipinjam terlebih dahulu sebelum dibaca',
        );
      }
      loanId = loan.id;
    }

    // Lanjutkan dari halaman terakhir pada sesi sebelumnya (bila ada).
    const previous = await this.sessions.findOne({
      where: { userId: user.id, documentId: doc.id },
      order: { createdAt: 'DESC' },
    });

    const session = await this.sessions.save(
      this.sessions.create({
        userId: user.id,
        documentId: doc.id,
        loanId,
        lastPage: previous?.lastPage ?? 1,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      }),
    );

    return {
      sessionId: session.id,
      documentId: doc.id,
      title: doc.title,
      pageCount: doc.pageCount,
      lastPage: session.lastPage,
      expiresAt: session.expiresAt,
    };
  }

  /** Halaman ber-watermark. Divalidasi ulang TIAP permintaan (lazy check). */
  async getPage(user: User, sessionId: string, pageNo: number): Promise<Buffer> {
    const session = await this.validateSession(user, sessionId);
    const doc = await this.documentsService.findById(session.documentId);

    if (!doc.masterObjectKey || doc.status !== 'PUBLISHED') {
      throw new NotFoundException('Koleksi tidak tersedia');
    }
    if (pageNo < 1 || (doc.pageCount && pageNo > doc.pageCount)) {
      throw new BadRequestException('Nomor halaman di luar jangkauan');
    }
    // Pinjaman kedaluwarsa = akses langsung tertutup, tanpa menunggu scheduler.
    if (session.loanId && !this.isStaff(user)) {
      const loan = await this.loansService.findActiveLoan(user.id, doc.id);
      if (!loan) {
        throw new ForbiddenException('Masa pinjam telah berakhir');
      }
    }

    session.lastPage = pageNo;
    await this.sessions.save(session);

    return this.renderService.renderPageWithWatermark(
      doc.id,
      doc.masterObjectKey,
      pageNo,
      { name: user.name, email: user.email },
    );
  }

  private async validateSession(
    user: User,
    sessionId: string,
  ): Promise<ReadingSession> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session || session.userId !== user.id) {
      throw new ForbiddenException('Sesi baca tidak valid');
    }
    if (session.revokedAt || session.expiresAt <= new Date()) {
      throw new ForbiddenException('Sesi baca berakhir — buka ulang dokumen');
    }
    return session;
  }

  private isStaff(user: User): boolean {
    return user.role === 'librarian' || user.role === 'superadmin';
  }
}
