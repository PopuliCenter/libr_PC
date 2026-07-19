import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RecommendationsService } from './recommendations.service';

/** Rekomendasi bacaan publik untuk halaman detail koleksi (PRD P3). */
@Controller('documents')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Public()
  @Get(':id/recommendations')
  @Header('Cache-Control', 'public, max-age=300')
  forDocument(@Param('id') id: string, @Query('limit') limit?: string) {
    const n = Math.min(Math.max(Number(limit) || 5, 1), 12);
    return this.recommendations.forDocument(id, n);
  }
}
