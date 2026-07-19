import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { Document } from '../catalog/entities/document.entity';
import { StorageModule } from '../storage/storage.module';
import { DocumentChunk } from './entities/document-chunk.entity';
import { IndexingService } from './indexing.service';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { RetrievalService } from './retrieval.service';

/** Pencarian semantik & tanya-jawab koleksi (RAG — PRD P2). */
@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentChunk, Document]),
    CatalogModule,
    StorageModule,
  ],
  controllers: [RagController],
  providers: [IndexingService, RetrievalService, RagService],
})
export class RagModule {}
