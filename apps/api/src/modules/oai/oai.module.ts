import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { OaiController } from './oai.controller';
import { OaiService } from './oai.service';

@Module({
  imports: [CatalogModule],
  controllers: [OaiController],
  providers: [OaiService],
})
export class OaiModule {}
