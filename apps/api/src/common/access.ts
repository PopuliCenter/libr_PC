import { User } from '../modules/users/entities/user.entity';

/**
 * Apakah pengguna berhak mengakses koleksi INTERNAL (PRD P1) — peneliti/staf
 * internal Populi. Pustakawan & superadmin selalu punya akses internal.
 */
export function hasInternalAccess(user?: User | null): boolean {
  return (
    !!user &&
    (user.isInternal === true ||
      user.role === 'librarian' ||
      user.role === 'superadmin')
  );
}
