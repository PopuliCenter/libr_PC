import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { AnnotationsController } from './annotations.controller';
import { AnnotationsService } from './annotations.service';
import { Annotation } from './entities/annotation.entity';

/** Anotasi/catatan pribadi anggota (PRD P5). */
@Module({
  imports: [TypeOrmModule.forFeature([Annotation]), CatalogModule],
  controllers: [AnnotationsController],
  providers: [AnnotationsService],
})
export class AnnotationsModule {}
