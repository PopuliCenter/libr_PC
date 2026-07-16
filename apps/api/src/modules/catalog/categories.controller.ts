import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { Audited } from '../../common/decorators/audited.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Roles('librarian', 'superadmin')
  @Audited('category.create', 'category')
  @Post()
  create(@Body('name') name: string, @Body('parentId') parentId?: string) {
    return this.categoriesService.create(name, parentId);
  }

  @Roles('librarian', 'superadmin')
  @Audited('category.delete', 'category')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.categoriesService.remove(id);
  }
}
