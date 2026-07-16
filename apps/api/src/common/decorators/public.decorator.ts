import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Menandai endpoint yang bisa diakses tanpa login. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
