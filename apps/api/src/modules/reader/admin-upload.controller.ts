import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Audited } from '../../common/decorators/audited.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DocumentsService } from '../catalog/documents.service';
import { DOCUMENT_DIGITIZED } from '../notifications/events';
import { StorageService } from '../storage/storage.service';
import { PageCacheService } from './page-cache.service';
import { PdfRenderService } from './pdf-render.service';

const MAX_PDF_BYTES = 200 * 1024 * 1024;

/** Upload PDF master untuk sebuah koleksi (pustakawan). */
@Roles('librarian', 'superadmin')
@Controller('admin/documents')
export class AdminUploadController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly storage: StorageService,
    private readonly renderService: PdfRenderService,
    private readonly pageCache: PageCacheService,
    private readonly events: EventEmitter2,
  ) {}

  @Audited('document.upload-pdf', 'document')
  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_PDF_BYTES } }),
  )
  async upload(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Sertakan file PDF di field "file"');
    // Validasi magic bytes, bukan sekadar ekstensi/mimetype dari klien.
    if (!file.buffer.subarray(0, 5).toString('latin1').startsWith('%PDF-')) {
      throw new BadRequestException('File bukan PDF yang valid');
    }

    const doc = await this.documentsService.findById(id);
    let pageCount: number;
    try {
      pageCount = await this.renderService.pageCount(file.buffer);
    } catch {
      throw new BadRequestException('PDF tidak dapat dibaca (rusak/terenkripsi)');
    }

    const key = `masters/${doc.id}.pdf`;
    await this.storage.put(key, file.buffer);
    // Master diganti → cache halaman lama harus dibuang, kalau tidak pembaca
    // masih disuguhi halaman dari PDF sebelumnya (kunci cache-nya sama).
    await this.pageCache.evictDocument(doc.id);
    const updated = await this.documentsService.setDigitalFile(
      doc.id,
      key,
      pageCount,
    );

    // Picu pengindeksan RAG (PRD P2) di latar belakang.
    this.events.emit(DOCUMENT_DIGITIZED, { documentId: doc.id });

    return {
      id: updated.id,
      title: updated.title,
      pageCount: updated.pageCount,
      message: `PDF tersimpan (${pageCount} halaman)`,
    };
  }
}
