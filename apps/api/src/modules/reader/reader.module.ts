import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { LoansModule } from '../loans/loans.module';
import { StorageModule } from '../storage/storage.module';
import { AdminUploadController } from './admin-upload.controller';
import { ReadingSession } from './entities/reading-session.entity';
import { PdfRenderService } from './pdf-render.service';
import { ReaderController } from './reader.controller';
import { ReaderService } from './reader.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReadingSession]),
    CatalogModule,
    LoansModule,
    StorageModule,
  ],
  controllers: [ReaderController, AdminUploadController],
  providers: [ReaderService, PdfRenderService],
})
export class ReaderModule {}
