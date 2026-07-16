import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Audited } from '../../common/decorators/audited.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

/** Manajemen koleksi — khusus pustakawan/superadmin. */
@Roles('librarian', 'superadmin')
@Controller('admin/documents')
export class AdminDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(@Query() query: QueryDocumentsDto) {
    return this.documentsService.adminList(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.documentsService.findById(id);
  }

  @Audited('document.create', 'document')
  @Post()
  create(@Body() dto: CreateDocumentDto) {
    return this.documentsService.create(dto);
  }

  @Audited('document.update', 'document')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto);
  }

  @Audited('document.delete', 'document')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.documentsService.remove(id);
  }
}
