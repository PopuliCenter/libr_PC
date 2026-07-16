import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Response } from 'express';
import { Audited } from '../../common/decorators/audited.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';
import { InventoryService, RegisterItemInput } from './inventory.service';
import { IsbnLookupService } from './isbn-lookup.service';
import { LabelsService } from './labels.service';

class RegisterDto implements RegisterItemInput {
  @IsOptional() @IsString() documentId?: string;
  @IsOptional() @IsString() isbn?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsArray() authors?: string[];
  @IsOptional() @IsString() publisher?: string;
  @IsOptional() @IsInt() year?: number;
  @IsOptional() @IsString() categoryName?: string;
  @IsOptional() @IsString() collectionType?: string;
  @IsOptional() @IsString() shelfLocation?: string;
  @IsOptional() @IsString() condition?: any;
  @IsOptional() @IsString() acquisitionSource?: string;
  @IsOptional() @IsString() acquiredAt?: string;
}

class ScanDto {
  @IsNotEmpty() @IsString() barcode: string;
  @IsNotEmpty() @IsString() clientScanId: string;
  @IsOptional() @IsString() scannedLocation?: string;
}

class LabelsDto {
  @IsArray() accessionNos: string[];
}

@Roles('librarian', 'superadmin')
@Controller('admin')
export class InventoryController {
  constructor(
    private readonly inventory: InventoryService,
    private readonly isbnLookup: IsbnLookupService,
    private readonly labels: LabelsService,
  ) {}

  // ---- Lookup & pendataan ----

  @Get('isbn/:isbn')
  lookupIsbn(@Param('isbn') isbn: string) {
    return this.isbnLookup.lookup(isbn);
  }

  @Get('physical-items/lookup/:code')
  async lookupCode(@Param('code') code: string) {
    const item = await this.inventory.findByCode(code);
    return {
      found: !!item,
      item: item
        ? {
            id: item.id,
            accessionNo: item.accessionNo,
            title: item.document?.title,
            shelfLocation: item.shelfLocation,
            condition: item.condition,
          }
        : null,
    };
  }

  @Audited('inventory.register', 'physical_item')
  @Post('physical-items')
  register(@Body() dto: RegisterDto) {
    return this.inventory.register(dto);
  }

  @Get('physical-items')
  list(@Query('documentId') documentId?: string) {
    return this.inventory.listItems(documentId);
  }

  @Get('inventory/report')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename="rekap-inventaris.xlsx"')
  async report(@Res() res: Response) {
    res.end(await this.inventory.inventoryReport());
  }

  @Audited('inventory.labels', 'physical_item')
  @Post('labels')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="label-qr.pdf"')
  async labelSheet(@Body() dto: LabelsDto, @Res() res: Response) {
    if (!dto.accessionNos?.length) {
      throw new BadRequestException('Sertakan minimal satu nomor induk');
    }
    res.end(await this.labels.build(dto.accessionNos));
  }

  // ---- Stock opname ----

  @Audited('stocktake.create', 'stocktake')
  @Post('stocktakes')
  createStocktake(@CurrentUser() user: User, @Body('name') name: string) {
    return this.inventory.createStocktake(name, user.id);
  }

  @Get('stocktakes')
  listStocktakes() {
    return this.inventory.listStocktakes();
  }

  @Get('stocktakes/:id')
  stocktakeDetail(@Param('id') id: string) {
    return this.inventory.getStocktakeDetail(id);
  }

  @Post('stocktakes/:id/scan')
  @HttpCode(200)
  scan(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ScanDto,
  ) {
    return this.inventory.scan(
      id,
      user.id,
      dto.barcode,
      dto.clientScanId,
      dto.scannedLocation,
    );
  }

  @Audited('stocktake.close', 'stocktake')
  @Post('stocktakes/:id/close')
  @HttpCode(200)
  closeStocktake(@Param('id') id: string) {
    return this.inventory.closeStocktake(id);
  }

  @Get('stocktakes/:id/report')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename="laporan-opname.xlsx"')
  async stocktakeReport(@Param('id') id: string, @Res() res: Response) {
    res.end(await this.inventory.stocktakeReport(id));
  }
}
