import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { IsbnCache } from './entities/isbn-cache.entity';
import { PhysicalItem } from './entities/physical-item.entity';
import { Stocktake } from './entities/stocktake.entity';
import { StocktakeScan } from './entities/stocktake-scan.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { IsbnLookupService } from './isbn-lookup.service';
import { LabelsService } from './labels.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PhysicalItem,
      IsbnCache,
      Stocktake,
      StocktakeScan,
    ]),
    CatalogModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService, IsbnLookupService, LabelsService],
})
export class InventoryModule {}
