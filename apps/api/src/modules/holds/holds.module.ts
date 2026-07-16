import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { LoansModule } from '../loans/loans.module';
import { Hold } from './entities/hold.entity';
import { HoldsController } from './holds.controller';
import { HoldsService } from './holds.service';

@Module({
  imports: [TypeOrmModule.forFeature([Hold]), CatalogModule, LoansModule],
  controllers: [HoldsController],
  providers: [HoldsService],
})
export class HoldsModule {}
