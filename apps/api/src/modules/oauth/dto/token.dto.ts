import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * Permintaan ke token endpoint. Diterima sebagai JSON maupun
 * application/x-www-form-urlencoded (standar OAuth). Nama field snake_case
 * sesuai RFC 6749.
 */
export class TokenDto {
  @IsIn(['authorization_code', 'refresh_token'])
  grant_type: string;

  @IsString()
  client_id: string;

  @IsOptional()
  @IsString()
  client_secret?: string;

  // ===== authorization_code =====
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  redirect_uri?: string;

  @IsOptional()
  @IsString()
  code_verifier?: string;

  // ===== refresh_token =====
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
