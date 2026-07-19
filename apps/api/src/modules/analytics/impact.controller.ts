import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AnalyticsService } from './analytics.service';

/** Statistik dampak publik (PRD P6) — halaman akuntabilitas, tanpa login. */
@Controller()
export class ImpactController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Public()
  @Get('impact')
  @Header('Cache-Control', 'public, max-age=600')
  impact() {
    return this.analytics.publicImpact();
  }
}
