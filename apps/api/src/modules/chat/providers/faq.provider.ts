import { Injectable } from '@nestjs/common';
import { DocumentsService } from '../../catalog/documents.service';
import {
  ChatProviderStrategy,
  ChatReply,
  ChatTurn,
} from './chat-provider.interface';

interface FaqRule {
  keywords: string[];
  answer: string;
}

const FAQ_RULES: FaqRule[] = [
  {
    keywords: ['daftar', 'registrasi', 'buat akun'],
    answer:
      'Untuk mendaftar: buka halaman Daftar, isi nama, email, dan password, lalu klik tautan verifikasi yang dikirim ke email Anda. Setelah terverifikasi, Anda bisa langsung login dan membaca koleksi.',
  },
  {
    keywords: ['pinjam', 'sewa', 'meminjam'],
    answer:
      'Koleksi bertanda "Sewa" dapat dipinjam setelah login: buka halaman koleksi, pilih durasi (mis. 3 atau 7 hari), lalu klik Pinjam. Akses baca otomatis berakhir saat jatuh tempo. Bila semua kopi sedang dipinjam, Anda bisa masuk daftar antrian.',
  },
  {
    keywords: ['baca', 'membaca', 'reader', 'pdf'],
    answer:
      'Koleksi dibaca langsung di browser melalui pembaca online kami. File tidak dapat diunduh, disalin, atau dicetak untuk melindungi hak cipta. Posisi baca terakhir tersimpan otomatis.',
  },
  {
    keywords: ['download', 'unduh', 'copy', 'salin', 'print', 'cetak'],
    answer:
      'Mohon maaf, koleksi digital hanya bisa dibaca online dan tidak dapat diunduh, disalin, atau dicetak — ini bagian dari perlindungan hak cipta penulis dan penerbit.',
  },
  {
    keywords: ['lupa password', 'reset password'],
    answer:
      'Gunakan menu "Lupa Password" di halaman login. Kami akan mengirim tautan reset ke email terdaftar Anda.',
  },
  {
    keywords: ['kontak', 'hubungi', 'bantuan', 'admin'],
    answer:
      'Anda dapat menghubungi pustakawan Populi Center melalui email library@populicenter.org.',
  },
];

/**
 * Penjawab rule-based — dipakai bila ANTHROPIC_API_KEY belum dikonfigurasi.
 * Mencocokkan kata kunci FAQ; selain itu menawarkan hasil pencarian katalog.
 */
@Injectable()
export class FaqProvider implements ChatProviderStrategy {
  constructor(private readonly documentsService: DocumentsService) {}

  async answer(_history: ChatTurn[], message: string): Promise<ChatReply> {
    const lower = message.toLowerCase();

    const rule = FAQ_RULES.find((r) =>
      r.keywords.some((k) => lower.includes(k)),
    );
    if (rule) return { reply: rule.answer, provider: 'faq' };

    // Bukan FAQ — coba tawarkan hasil pencarian katalog per kata kunci.
    const docs = await this.searchByKeywords(lower);

    if (docs.length > 0) {
      const list = docs
        .map((d) => `• ${d.title} (${d.authors.join(', ')}${d.year ? ', ' + d.year : ''})`)
        .join('\n');
      return {
        provider: 'faq',
        reply: `Berikut koleksi yang mungkin relevan dengan pertanyaan Anda:\n${list}\n\nBuka halaman katalog untuk membaca detailnya. Untuk pertanyaan lain, hubungi library@populicenter.org.`,
      };
    }

    return {
      provider: 'faq',
      reply:
        'Maaf, saya belum bisa menjawab pertanyaan itu. Coba kata kunci lain (mis. "cara daftar", "cara pinjam"), telusuri katalog, atau hubungi library@populicenter.org.',
    };
  }

  /** Pecah pertanyaan menjadi kata kunci bermakna, cari per kata, gabungkan unik. */
  private async searchByKeywords(text: string) {
    const STOPWORDS = new Set([
      'ada', 'yang', 'tentang', 'apakah', 'dengan', 'untuk', 'dari', 'atau',
      'dan', 'apa', 'saya', 'bisa', 'koleksi', 'buku', 'laporan', 'cari',
      'punya', 'tolong', 'mohon', 'ini', 'itu', 'di', 'ke', 'nya',
    ]);
    const keywords = text
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
      .slice(0, 3);

    const seen = new Map<string, any>();
    for (const keyword of [text, ...keywords]) {
      const result = await this.documentsService.search({
        query: keyword,
        page: 1,
        perPage: 5,
      } as any);
      for (const doc of result.data) {
        if (!seen.has(doc.id)) seen.set(doc.id, doc);
      }
      if (seen.size >= 5) break;
    }
    return [...seen.values()].slice(0, 5);
  }
}
