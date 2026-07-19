import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { hasInternalAccess } from '../../common/access';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { DocumentsService } from './documents.service';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { Document } from './entities/document.entity';

/** Katalog publik — dapat diakses tanpa login (auth opsional untuk koleksi internal). */
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Public()
  @Get()
  search(@Query() query: QueryDocumentsDto, @CurrentUser() user?: User) {
    return this.documentsService.search(query, {
      includeInternal: hasInternalAccess(user),
    });
  }

  @Public()
  @Get(':slug')
  async detail(@Param('slug') slug: string, @CurrentUser() user?: User) {
    const doc = await this.documentsService.findBySlug(slug);
    // Koleksi INTERNAL disembunyikan (404) dari non-internal — tak membocorkan keberadaannya.
    if (doc.accessType === 'INTERNAL' && !hasInternalAccess(user)) {
      throw new NotFoundException('Koleksi tidak ditemukan');
    }
    return this.toPublicView(doc);
  }

  /** Detail publik tidak mengekspos kunci storage internal. */
  private toPublicView(doc: Document) {
    const { masterObjectKey, ...rest } = doc;
    return { ...rest, hasDigitalCopy: !!masterObjectKey };
  }
}
