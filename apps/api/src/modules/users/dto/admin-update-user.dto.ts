import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { UserRole, UserStatus } from '../entities/user.entity';

/** Superadmin memutakhirkan akses/peran/status pengguna (PRD P1). */
export class AdminUpdateUserDto {
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @IsOptional()
  @IsIn(['member', 'librarian', 'superadmin'])
  role?: UserRole;

  @IsOptional()
  @IsIn(['pending', 'active', 'blocked'])
  status?: UserStatus;
}
