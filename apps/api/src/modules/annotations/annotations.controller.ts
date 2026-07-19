import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AnnotationsService } from './annotations.service';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { UpdateAnnotationDto } from './dto/update-annotation.dto';

/** Catatan pribadi anggota (PRD P5) — semua terikat pengguna yang masuk. */
@Controller('me/annotations')
export class AnnotationsController {
  constructor(private readonly annotations: AnnotationsService) {}

  @Get()
  list(@CurrentUser() user: User, @Query('documentId') documentId: string) {
    return this.annotations.listForDocument(user.id, documentId);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateAnnotationDto) {
    return this.annotations.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateAnnotationDto,
  ) {
    return this.annotations.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.annotations.remove(user, id);
  }
}
