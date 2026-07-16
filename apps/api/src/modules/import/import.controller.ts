import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Audited } from '../../common/decorators/audited.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';
import { ImportService } from './import.service';
import { ImportTemplateService } from './import-template.service';

const MAX_ZIP_BYTES = 500 * 1024 * 1024;

@Roles('librarian', 'superadmin')
@Controller('admin/import')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly templateService: ImportTemplateService,
  ) {}

  @Get('template')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="template-impor-populi.xlsx"',
  )
  async template(@Res() res: Response) {
    res.end(await this.templateService.build());
  }

  @Audited('import.upload', 'import_batch')
  @Post('batches')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ZIP_BYTES } }),
  )
  async upload(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Sertakan berkas ZIP di field "file"');
    return this.importService.createBatch(
      user.id,
      file.buffer,
      file.originalname,
    );
  }

  @Get('batches')
  list() {
    return this.importService.listBatches();
  }

  @Get('batches/:id')
  getBatch(@Param('id') id: string) {
    return this.importService.getBatch(id);
  }

  @Audited('import.commit', 'import_batch')
  @Post('batches/:id/commit')
  commit(
    @Param('id') id: string,
    @Body('autoPublish') autoPublish?: boolean,
  ) {
    return this.importService.commit(id, autoPublish === true);
  }

  @Get('batches/:id/report')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename="laporan-impor.xlsx"')
  async report(@Param('id') id: string, @Res() res: Response) {
    res.end(await this.importService.buildReport(id));
  }
}
