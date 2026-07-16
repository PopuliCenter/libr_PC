import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from '../../catalog/documents.service';
import {
  ChatProviderStrategy,
  ChatReply,
  ChatTurn,
} from './chat-provider.interface';

const SYSTEM_PROMPT = `Kamu adalah asisten Perpustakaan Digital Populi Center — lembaga riset dan survei opini publik di Jakarta.

Tugasmu: membantu pengunjung menemukan koleksi (buku, laporan riset, jurnal, dataset) dan menjawab pertanyaan tentang layanan perpustakaan, dalam Bahasa Indonesia yang ramah dan ringkas.

Fakta layanan yang boleh kamu sampaikan:
- Koleksi dibaca online lewat browser; tidak bisa diunduh, disalin, atau dicetak (perlindungan hak cipta).
- Pendaftaran anggota gratis via halaman Daftar dengan verifikasi email.
- Koleksi bertipe "Sewa" dipinjam dengan batas waktu (mis. 3/7 hari) dan bisa antri bila kopi habis.
- Kontak pustakawan: library@populicenter.org.

Aturan:
- Saat pengguna mencari topik/judul/penulis, WAJIB gunakan tool search_catalog sebelum menjawab — jangan mengarang koleksi.
- Sebut hanya koleksi yang benar-benar dikembalikan tool. Bila tidak ada hasil, katakan jujur dan sarankan kata kunci lain.
- Jangan menjawab pertanyaan di luar konteks perpustakaan/riset Populi Center; arahkan kembali dengan sopan.`;

const SEARCH_TOOL: Anthropic.Tool = {
  name: 'search_catalog',
  description:
    'Cari koleksi di katalog perpustakaan berdasarkan kata kunci (judul, penulis, subjek, abstrak). Panggil tool ini setiap kali pengguna menanyakan ketersediaan koleksi atau topik tertentu.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Kata kunci pencarian, mis. "partisipasi pemilih muda"',
      },
    },
    required: ['query'],
  },
};

/** Penjawab berbasis Claude dengan grounding ke katalog via tool use. */
@Injectable()
export class ClaudeProvider implements ChatProviderStrategy {
  private readonly logger = new Logger(ClaudeProvider.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(
    config: ConfigService,
    private readonly documentsService: DocumentsService,
  ) {
    this.client = new Anthropic({ apiKey: config.get('ANTHROPIC_API_KEY') });
    this.model = config.get('CHAT_MODEL', 'claude-opus-4-8');
  }

  async answer(history: ChatTurn[], message: string): Promise<ChatReply> {
    const messages: Anthropic.MessageParam[] = [
      ...history.map((t) => ({ role: t.role, content: t.content })),
      { role: 'user' as const, content: message },
    ];

    // Loop tool-use manual, maksimal 5 iterasi sebagai pengaman.
    for (let i = 0; i < 5; i++) {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: [SEARCH_TOOL],
        messages,
      });

      if (response.stop_reason !== 'tool_use') {
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim();
        return {
          provider: 'claude',
          reply: text || 'Maaf, saya tidak dapat menjawab saat ini.',
        };
      }

      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const result = await this.runTool(block.name, block.input as any);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }
      messages.push({ role: 'user', content: toolResults });
    }

    return {
      provider: 'claude',
      reply:
        'Maaf, pencarian memakan waktu terlalu lama. Coba persempit kata kunci Anda.',
    };
  }

  private async runTool(
    name: string,
    input: { query?: string },
  ): Promise<string> {
    if (name !== 'search_catalog') return 'Tool tidak dikenal.';
    try {
      const result = await this.documentsService.search({
        query: input.query ?? '',
        page: 1,
        perPage: 5,
      } as any);
      if (result.data.length === 0) {
        return 'Tidak ada koleksi yang cocok dengan kata kunci tersebut.';
      }
      return JSON.stringify(
        result.data.map((d) => ({
          judul: d.title,
          penulis: d.authors,
          tahun: d.year,
          tipe: d.collectionType,
          akses: d.accessType,
          slug: d.slug,
          abstrak: d.abstract?.slice(0, 300) ?? null,
        })),
      );
    } catch (err) {
      this.logger.warn(`search_catalog gagal: ${(err as Error).message}`);
      return 'Terjadi kesalahan saat mencari katalog.';
    }
  }
}
