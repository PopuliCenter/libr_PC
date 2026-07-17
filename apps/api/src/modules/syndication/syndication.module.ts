import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { SyndicationController } from './syndication.controller';
import { SyndicationService } from './syndication.service';

/** Sindikasi katalog untuk situs utama Populi: RSS + widget tersemat (PRD I3). */
@Module({
  imports: [CatalogModule],
  controllers: [SyndicationController],
  providers: [SyndicationService],
})
export class SyndicationModule {}
