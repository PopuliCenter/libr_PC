import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { DocumentsService } from './documents.service';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { Document } from './entities/document.entity';

/** Katalog publik — dapat diakses tanpa login. */
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Public()
  @Get()
  search(@Query() query: QueryDocumentsDto) {
    return this.documentsService.search(query);
  }

  @Public()
  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    const doc = await this.documentsService.findBySlug(slug);
    return this.toPublicView(doc);
  }

  /** Detail publik tidak mengekspos kunci storage internal. */
  private toPublicView(doc: Document) {
    const { masterObjectKey, ...rest } = doc;
    return { ...rest, hasDigitalCopy: !!masterObjectKey };
  }
}
