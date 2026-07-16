import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Audited } from '../../common/decorators/audited.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { HoldsService } from './holds.service';

class JoinHoldDto {
  @IsNotEmpty()
  @IsString()
  documentId: string;
}

class ClaimHoldDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;
}

@Controller()
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  /** Info ketersediaan + status antrian user untuk satu koleksi. */
  @Get('documents/:id/availability')
  availability(@CurrentUser() user: User, @Param('id') id: string) {
    return this.holdsService.availability(user.id, id);
  }

  @Audited('hold.join', 'hold')
  @Post('holds')
  join(@CurrentUser() user: User, @Body() dto: JoinHoldDto) {
    return this.holdsService.join(user.id, dto.documentId);
  }

  @Get('me/holds')
  myHolds(@CurrentUser() user: User) {
    return this.holdsService.myHolds(user.id);
  }

  @Audited('hold.claim', 'hold')
  @Post('holds/:id/claim')
  @HttpCode(200)
  async claim(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ClaimHoldDto,
  ) {
    return this.holdsService.claim(user.id, id, dto.durationDays);
  }

  @Audited('hold.cancel', 'hold')
  @Post('holds/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.holdsService.cancel(user.id, id);
  }
}
