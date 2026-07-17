import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../catalog/entities/document.entity';
import { Hold } from '../holds/entities/hold.entity';
import { Loan } from '../loans/entities/loan.entity';
import { ReadingSession } from '../reader/entities/reading-session.entity';
import { User } from '../users/entities/user.entity';
import { AnalyticsReportService } from './analytics-report.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

/** Analitik diseminasi (PRD I7) — dasbor read-only di atas data Fase 1. */
@Module({
  imports: [
    TypeOrmModule.forFeature([ReadingSession, Loan, Hold, Document, User]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsReportService],
})
export class AnalyticsModule {}
