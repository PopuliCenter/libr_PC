import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Res,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { Response } from 'express';
import { Audited } from '../../common/decorators/audited.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ReaderService } from './reader.service';

class OpenSessionDto {
  @IsNotEmpty()
  @IsString()
  documentId: string;
}

@Controller('reader')
export class ReaderController {
  constructor(private readonly readerService: ReaderService) {}

  @Audited('reader.open', 'document')
  @Post('sessions')
  open(@CurrentUser() user: User, @Body() dto: OpenSessionDto) {
    return this.readerService.openSession(user, dto.documentId);
  }

  @Get('sessions/:id/pages/:pageNo')
  @Header('Cache-Control', 'no-store, must-revalidate')
  @Header('Content-Type', 'image/webp')
  async page(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('pageNo', ParseIntPipe) pageNo: number,
    @Res() res: Response,
  ) {
    const image = await this.readerService.getPage(user, id, pageNo);
    res.end(image);
  }
}
