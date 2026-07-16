import { Controller, Get, Header, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { OaiService } from './oai.service';

/**
 * Endpoint OAI-PMH untuk harvesting oleh Indonesia OneSearch (Perpusnas)
 * dan agregator perpustakaan lain. Contoh: GET /api/v1/oai?verb=Identify
 */
@Controller('oai')
export class OaiController {
  constructor(private readonly oaiService: OaiService) {}

  @Public()
  @Get()
  @Header('Content-Type', 'text/xml; charset=utf-8')
  handle(@Query() params: Record<string, string>) {
    return this.oaiService.handle(params);
  }
}
