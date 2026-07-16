import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDocumentsController } from './admin-documents.controller';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Category } from './entities/category.entity';
import { Document } from './entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Category])],
  controllers: [
    DocumentsController,
    AdminDocumentsController,
    CategoriesController,
  ],
  providers: [DocumentsService, CategoriesService],
  exports: [DocumentsService],
})
export class CatalogModule {}
