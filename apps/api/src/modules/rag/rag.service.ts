import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Passage, RetrievalService } from './retrieval.service';

export interface Citation {
  n: number;
  title: string;
  slug: string;
  pageNo: number;
  snippet: string;
}

export interface RagAnswer {
  mode: 'ai' | 'extractive' | 'none';
  answer: string;
  citations: Citation[];
}

const SYSTEM = `Kamu asisten riset Perpustakaan Digital Populi Center. Jawab pertanyaan pengguna HANYA berdasarkan kutipan bernomor yang diberikan. Setiap klaim WAJIB diberi rujukan seperti [1], [2] sesuai nomor kutipan. Bila kutipan tidak memuat jawabannya, katakan dengan jujur bahwa informasinya tidak ditemukan pada koleksi. Jawab ringkas dalam Bahasa Indonesia. Jangan mengarang fakta di luar kutipan.`;

/**
 * Tanya-jawab koleksi (RAG — PRD P2): ambil kutipan relevan lalu susun jawaban
 * ber-rujukan halaman. Bila ANTHROPIC_API_KEY ada → jawaban disintesis Claude
 * (grounded ke kutipan); bila tidak → mode ekstraktif (kutipan langsung).
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(
    private readonly retrieval: RetrievalService,
    config: ConfigService,
  ) {
    const key = config.get<string>('ANTHROPIC_API_KEY');
    this.client = key ? new Anthropic({ apiKey: key }) : null;
    this.model = config.get('CHAT_MODEL', 'claude-opus-4-8');
  }

  async ask(question: string): Promise<RagAnswer> {
    const passages = await this.retrieval.retrieve(question, 6);
    if (passages.length === 0) {
      return {
        mode: 'none',
        answer:
          'Tidak ditemukan bagian koleksi yang relevan. Coba kata kunci lain atau lebih spesifik.',
        citations: [],
      };
    }

    const citations = passages.map((p, i) => ({
      n: i + 1,
      title: p.title,
      slug: p.slug,
      pageNo: p.pageNo,
      snippet: p.snippet,
    }));

    if (this.client) {
      try {
        const answer = await this.synthesize(question, passages);
        return { mode: 'ai', answer, citations };
      } catch (err) {
        this.logger.warn(`Sintesis AI gagal, fallback ekstraktif: ${(err as Error).message}`);
      }
    }
    return { mode: 'extractive', answer: this.extractive(citations), citations };
  }

  private async synthesize(question: string, passages: Passage[]): Promise<string> {
    const context = passages
      .map((p, i) => `[${i + 1}] (${p.title}, hal. ${p.pageNo}) ${p.snippet}`)
      .join('\n\n');
    const res = await this.client!.messages.create({
      model: this.model,
      max_tokens: 700,
      system: SYSTEM,
      messages: [
        { role: 'user', content: `Kutipan:\n${context}\n\nPertanyaan: ${question}` },
      ],
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  }

  /** Tanpa AI: rangkai kutipan teratas sebagai jawaban ekstraktif ber-rujukan. */
  private extractive(citations: Citation[]): string {
    const lines = citations
      .slice(0, 3)
      .map((c) => `• ${c.snippet} [${c.n}]`)
      .join('\n');
    return `Bagian koleksi paling relevan dengan pertanyaan Anda:\n${lines}`;
  }
}
