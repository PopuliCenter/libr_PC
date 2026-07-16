import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { Audited } from '../../common/decorators/audited.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { LoansService } from './loans.service';

class CreateLoanDto {
  @IsNotEmpty()
  @IsString()
  documentId: string;

  @IsInt()
  @Min(1)
  durationDays: number;
}

@Controller()
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Audited('loan.create', 'loan')
  @Post('loans')
  borrow(@CurrentUser() user: User, @Body() dto: CreateLoanDto) {
    return this.loansService.borrow(user.id, dto.documentId, dto.durationDays);
  }

  @Audited('loan.return', 'loan')
  @Post('loans/:id/return')
  @HttpCode(200)
  returnLoan(@CurrentUser() user: User, @Param('id') id: string) {
    return this.loansService.returnLoan(user.id, id);
  }

  @Get('me/loans')
  myLoans(@CurrentUser() user: User) {
    return this.loansService.myLoans(user.id);
  }
}
