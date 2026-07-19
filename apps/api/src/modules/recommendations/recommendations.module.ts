import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../catalog/entities/document.entity';
import { ReadingSession } from '../reader/entities/reading-session.entity';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

/** Rekomendasi bacaan (PRD P3) — co-read dari reading_sessions. */
@Module({
  imports: [TypeOrmModule.forFeature([ReadingSession, Document])],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
