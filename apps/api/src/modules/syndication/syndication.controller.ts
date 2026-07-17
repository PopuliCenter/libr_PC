import { Controller, Get, Header, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SyndicationService } from './syndication.service';

/**
 * Sindikasi publik untuk situs utama Populi (PRD I3):
 *   - GET /api/v1/feed.rss                → umpan RSS 2.0 "Publikasi Terbaru"
 *   - GET /api/v1/widget.js               → skrip widget tersemat
 *   - GET /api/v1/widget/publications     → data JSON widget (CORS terbuka)
 * Semua read-only & publik; hanya koleksi PUBLISHED yang tampil.
 */
@Controller()
export class SyndicationController {
  constructor(private readonly syndication: SyndicationService) {}

  @Public()
  @Get('feed.rss')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  rss(@Query('category') category?: string) {
    return this.syndication.rss(category);
  }

  @Public()
  @Get('widget.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  widgetScript() {
    return this.syndication.widgetScript();
  }

  @Public()
  @Get('widget/publications')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Cache-Control', 'public, max-age=300')
  widgetData(
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ) {
    return this.syndication.widgetData(Number(limit) || 5, category);
  }
}
