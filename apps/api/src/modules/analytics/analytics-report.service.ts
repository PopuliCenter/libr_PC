import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { AnalyticsService, Dashboard } from './analytics.service';

/** Ekspor dasbor analitik ke xlsx — bahan laporan dampak ke funder/manajemen. */
@Injectable()
export class AnalyticsReportService {
  constructor(private readonly analytics: AnalyticsService) {}

  async xlsx(days: number): Promise<Buffer> {
    const d = await this.analytics.dashboard(days);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Populi Library';

    this.overviewSheet(wb, d);
    this.tableSheet(wb, 'Publikasi Terbaca', ['Judul', 'Kategori', 'Dibaca', 'Dipinjam'],
      d.topDocuments.map((t) => [t.title, t.category ?? '—', t.reads, t.loans]));
    this.tableSheet(wb, 'Per Institusi', ['Institusi', 'Dibaca'],
      d.byInstitution.map((r) => [r.label, r.reads]));
    this.tableSheet(wb, 'Per Topik', ['Kategori', 'Dibaca'],
      d.byCategory.map((r) => [r.label, r.reads]));
    this.tableSheet(wb, 'Tren Pembacaan', ['Periode', 'Dibaca'],
      d.trend.map((r) => [r.bucket, r.reads]));

    return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  }

  private overviewSheet(wb: ExcelJS.Workbook, d: Dashboard): void {
    const ws = wb.addWorksheet('Ringkasan');
    ws.columns = [{ width: 28 }, { width: 20 }];
    const label =
      d.window.days > 0 ? `${d.window.days} hari terakhir` : 'Sepanjang waktu';
    ws.addRow(['Laporan Diseminasi — Populi Library']).font = { bold: true, size: 14 };
    ws.addRow(['Rentang', label]);
    ws.addRow(['Dibuat', new Date(d.window.generatedAt).toLocaleString('id-ID')]);
    ws.addRow([]);
    const rows: [string, number][] = [
      ['Total pembacaan', d.overview.reads],
      ['Pembaca unik', d.overview.uniqueReaders],
      ['Peminjaman', d.overview.loans],
      ['Peminjaman aktif', d.overview.activeLoans],
      ['Koleksi terpublikasi', d.overview.publishedDocuments],
      ['Anggota aktif', d.overview.totalMembers],
      ['Anggota baru', d.overview.newMembers],
      ['Antrean menunggu', d.overview.waitlist],
    ];
    rows.forEach((r) => ws.addRow(r));
    ws.getColumn(1).font = { bold: false };
  }

  private tableSheet(
    wb: ExcelJS.Workbook,
    name: string,
    headers: string[],
    rows: (string | number)[][],
  ): void {
    const ws = wb.addWorksheet(name);
    ws.columns = headers.map((h, i) => ({ width: i === 0 ? 42 : 14 }));
    const head = ws.addRow(headers);
    head.font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
  }
}
