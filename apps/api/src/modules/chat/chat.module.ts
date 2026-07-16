import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMessage } from './entities/chat-message.entity';
import { ClaudeProvider } from './providers/claude.provider';
import { FaqProvider } from './providers/faq.provider';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage]), CatalogModule],
  controllers: [ChatController],
  providers: [ChatService, ClaudeProvider, FaqProvider],
})
export class ChatModule {}
