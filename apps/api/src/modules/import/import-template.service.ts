import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

interface ColumnSpec {
  key: string;
  header: string;
  width: number;
  wajib: boolean;
  keterangan: string;
  contoh: string;
}

export const TEMPLATE_COLUMNS: ColumnSpec[] = [
  { key: 'nama_file', header: 'nama_file', width: 26, wajib: true, keterangan: 'Nama berkas PDF di dalam ZIP (persis, termasuk .pdf)', contoh: '2023_survei_nasional.pdf' },
  { key: 'judul', header: 'judul', width: 40, wajib: true, keterangan: 'Judul koleksi', contoh: 'Survei Nasional Persepsi Publik 2023' },
  { key: 'penulis', header: 'penulis', width: 28, wajib: true, keterangan: 'Penulis/editor; pisahkan dengan ; bila lebih dari satu', contoh: 'Tim Riset Populi Center' },
  { key: 'tahun', header: 'tahun', width: 8, wajib: false, keterangan: 'Tahun terbit (angka)', contoh: '2023' },
  { key: 'tipe_koleksi', header: 'tipe_koleksi', width: 14, wajib: true, keterangan: 'buku / laporan / jurnal / prosiding / dataset / lainnya', contoh: 'laporan' },
  { key: 'kategori', header: 'kategori', width: 22, wajib: true, keterangan: 'Nama kategori (dibuat otomatis bila belum ada)', contoh: 'Politik' },
  { key: 'tipe_akses', header: 'tipe_akses', width: 12, wajib: true, keterangan: 'OPEN (terbuka) / MEMBER (anggota) / LOAN (sewa)', contoh: 'MEMBER' },
  { key: 'jumlah_lisensi', header: 'jumlah_lisensi', width: 14, wajib: false, keterangan: 'Wajib bila tipe_akses = LOAN. Jumlah kopi digital', contoh: '3' },
  { key: 'durasi_sewa_hari', header: 'durasi_sewa_hari', width: 16, wajib: false, keterangan: 'Wajib bila LOAN. Pilihan durasi, pisah koma', contoh: '3,7' },
  { key: 'penerbit', header: 'penerbit', width: 20, wajib: false, keterangan: 'Nama penerbit', contoh: 'Populi Center' },
  { key: 'isbn_issn', header: 'isbn_issn', width: 18, wajib: false, keterangan: 'ISBN atau ISSN', contoh: '978-602-1234-56-7' },
  { key: 'bahasa', header: 'bahasa', width: 8, wajib: false, keterangan: 'Kode bahasa (id/en). Default id', contoh: 'id' },
  { key: 'subjek', header: 'subjek', width: 24, wajib: false, keterangan: 'Kata kunci subjek; pisah dengan ;', contoh: 'survei opini; politik' },
  { key: 'abstrak', header: 'abstrak', width: 40, wajib: false, keterangan: 'Ringkasan koleksi', contoh: 'Laporan survei nasional tentang…' },
  { key: 'no_panggil', header: 'no_panggil', width: 14, wajib: false, keterangan: 'Nomor panggil / klasifikasi', contoh: '320 S POP' },
  { key: 'halaman_preview', header: 'halaman_preview', width: 16, wajib: false, keterangan: 'Jumlah halaman pratinjau publik (angka)', contoh: '5' },
];

/** Membangun berkas template .xlsx: sheet Koleksi (isian) + Petunjuk. */
@Injectable()
export class ImportTemplateService {
  async build(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Populi Library';

    const sheet = wb.addWorksheet('Koleksi');
    sheet.columns = TEMPLATE_COLUMNS.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width,
    }));
    const head = sheet.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF14508C' },
    };
    head.alignment = { vertical: 'middle' };
    // Baris contoh (bisa dihapus admin sebelum mengisi data asli).
    sheet.addRow(
      Object.fromEntries(TEMPLATE_COLUMNS.map((c) => [c.key, c.contoh])),
    );

    const guide = wb.addWorksheet('Petunjuk');
    guide.columns = [
      { header: 'Kolom', key: 'kolom', width: 20 },
      { header: 'Wajib', key: 'wajib', width: 8 },
      { header: 'Keterangan', key: 'ket', width: 70 },
    ];
    guide.getRow(1).font = { bold: true };
    for (const c of TEMPLATE_COLUMNS) {
      guide.addRow({
        kolom: c.header,
        wajib: c.wajib ? 'Ya' : '—',
        ket: c.keterangan,
      });
    }
    guide.addRow({});
    guide.addRow({
      kolom: 'CARA PAKAI',
      ket: '1) Isi sheet "Koleksi" (hapus baris contoh). 2) Kumpulkan semua PDF + file .xlsx ini ke dalam satu ZIP. 3) Unggah ZIP di menu Impor Massal.',
    });

    return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  }
}
