import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Audited } from '../../common/decorators/audited.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

/** Manajemen pengguna oleh superadmin — mis. menandai peneliti internal (PRD P1). */
@Roles('superadmin')
@Controller('admin/users')
export class UsersAdminController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async list(@Query('query') query?: string) {
    const found = await this.users.search(query);
    return found.map((u) => this.safe(u));
  }

  @Audited('user.admin_update', 'user')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.safe(await this.users.update(id, dto));
  }

  private safe(user: User) {
    const { passwordHash, verificationTokenHash, verificationTokenExpiresAt, ...rest } =
      user;
    return rest;
  }
}
