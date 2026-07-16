import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';

export const ROLES_KEY = 'roles';

/** Membatasi endpoint pada role tertentu, mis. @Roles('librarian', 'superadmin'). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
