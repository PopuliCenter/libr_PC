import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnalyticsReportService } from './analytics-report.service';
import { AnalyticsService } from './analytics.service';

/** Dasbor analitik diseminasi — hanya pustakawan/superadmin (PRD I7). */
@Roles('librarian', 'superadmin')
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly report: AnalyticsReportService,
  ) {}

  @Get()
  dashboard(@Query('days') days?: string) {
    return this.analytics.dashboard(clampDays(days));
  }

  @Get('report.xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async xlsx(@Query('days') days?: string, @Res() res?: Response) {
    const buffer = await this.report.xlsx(clampDays(days));
    res!.setHeader(
      'Content-Disposition',
      'attachment; filename="laporan-diseminasi.xlsx"',
    );
    res!.end(buffer);
  }
}

/** 0 = sepanjang waktu; selain itu 1..3650 hari. */
function clampDays(raw?: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), 3650);
}
