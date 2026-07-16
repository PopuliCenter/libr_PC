import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { ReaderModule } from '../reader/reader.module';
import { StorageModule } from '../storage/storage.module';
import { ImportBatch } from './entities/import-batch.entity';
import { ImportItem } from './entities/import-item.entity';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ImportTemplateService } from './import-template.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ImportBatch, ImportItem]),
    CatalogModule,
    ReaderModule,
    StorageModule,
  ],
  controllers: [ImportController],
  providers: [ImportService, ImportTemplateService],
})
export class ImportModule {}
