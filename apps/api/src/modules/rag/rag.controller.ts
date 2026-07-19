import { Body, Controller, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators/roles.decorator';
import { IndexingService } from './indexing.service';
import { AskDto } from './dto/ask.dto';
import { RagService } from './rag.service';

/** Tanya-jawab koleksi (RAG — PRD P2). */
@Controller()
export class RagController {
  constructor(
    private readonly rag: RagService,
    private readonly indexing: IndexingService,
  ) {}

  /** Pertanyaan pengguna (butuh login) → jawaban ber-rujukan halaman. */
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  @Post('rag/ask')
  ask(@Body() dto: AskDto) {
    return this.rag.ask(dto.question);
  }

  /** Bangun ulang indeks teks sebuah koleksi (pustakawan). */
  @Roles('librarian', 'superadmin')
  @Post('admin/documents/:id/reindex')
  reindex(@Param('id') id: string) {
    return this.indexing.indexDocument(id);
  }
}
