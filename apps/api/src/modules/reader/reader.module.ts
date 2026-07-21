import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { LoansModule } from '../loans/loans.module';
import { StorageModule } from '../storage/storage.module';
import { AdminUploadController } from './admin-upload.controller';
import { DocumentFilesListener } from './document-files.listener';
import { ReadingSession } from './entities/reading-session.entity';
import { PageCacheService } from './page-cache.service';
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
  providers: [
    ReaderService,
    PdfRenderService,
    PageCacheService,
    DocumentFilesListener,
  ],
  exports: [PdfRenderService, PageCacheService],
})
export class ReaderModule {}
