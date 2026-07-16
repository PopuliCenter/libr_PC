import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * Chat bantuan — terbuka untuk pengunjung tanpa login (dibatasi rate limit).
 * Bila pengguna login, pesan tertaut ke akunnya.
 */
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('messages')
  send(@Body() dto: SendMessageDto, @Req() req: any) {
    return this.chatService.send(dto.message, dto.sessionId, req.user?.id);
  }

  @Public()
  @Get('sessions/:sessionId/messages')
  history(@Param('sessionId') sessionId: string) {
    return this.chatService.getHistory(sessionId);
  }
}
