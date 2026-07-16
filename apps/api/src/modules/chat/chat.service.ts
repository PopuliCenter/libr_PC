import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatTurn } from './providers/chat-provider.interface';
import { ClaudeProvider } from './providers/claude.provider';
import { FaqProvider } from './providers/faq.provider';

const HISTORY_LIMIT = 10;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly aiEnabled: boolean;

  constructor(
    @InjectRepository(ChatMessage)
    private readonly repo: Repository<ChatMessage>,
    private readonly claudeProvider: ClaudeProvider,
    private readonly faqProvider: FaqProvider,
    config: ConfigService,
  ) {
    this.aiEnabled = !!config.get('ANTHROPIC_API_KEY');
    this.logger.log(
      this.aiEnabled
        ? 'Chat AI aktif (Claude)'
        : 'ANTHROPIC_API_KEY kosong — chat memakai mode FAQ',
    );
  }

  async send(message: string, sessionId?: string, userId?: string) {
    const session = sessionId ?? randomUUID();
    const history = await this.loadHistory(session);

    let reply;
    if (this.aiEnabled) {
      try {
        reply = await this.claudeProvider.answer(history, message);
      } catch (err) {
        // AI bermasalah (kuota, jaringan) → jangan matikan chat; turun ke FAQ.
        this.logger.error(`Claude gagal: ${(err as Error).message}`);
        reply = await this.faqProvider.answer(history, message);
      }
    } else {
      reply = await this.faqProvider.answer(history, message);
    }

    await this.repo.save([
      this.repo.create({
        sessionId: session,
        userId: userId ?? null,
        role: 'user',
        content: message,
        provider: reply.provider,
      }),
      this.repo.create({
        sessionId: session,
        userId: userId ?? null,
        role: 'assistant',
        content: reply.reply,
        provider: reply.provider,
      }),
    ]);

    return { sessionId: session, reply: reply.reply, provider: reply.provider };
  }

  async getHistory(sessionId: string) {
    return this.repo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      select: ['id', 'role', 'content', 'provider', 'createdAt'],
    });
  }

  private async loadHistory(sessionId: string): Promise<ChatTurn[]> {
    const rows = await this.repo.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: HISTORY_LIMIT,
    });
    return rows
      .reverse()
      .map((r) => ({ role: r.role, content: r.content }) as ChatTurn);
  }
}
