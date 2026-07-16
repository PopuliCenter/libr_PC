import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Payload persetujuan dari halaman consent perpustakaan (dikirim oleh frontend
 * dengan token akses anggota). Nama field mengikuti parameter OAuth2 standar.
 */
export class AuthorizeDto {
  @IsString()
  client_id: string;

  @IsString()
  redirect_uri: string;

  @IsOptional()
  @IsIn(['code'])
  response_type?: string;

  @IsString()
  scope: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsString()
  @MinLength(43)
  code_challenge: string;

  @IsIn(['S256'])
  code_challenge_method: string;

  @IsOptional()
  @IsString()
  nonce?: string;

  /** true = izinkan; false = tolak (mengembalikan error=access_denied). */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value !== false && value !== 'false')
  approve?: boolean = true;
}
