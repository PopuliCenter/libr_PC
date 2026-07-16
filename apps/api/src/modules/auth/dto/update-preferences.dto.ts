import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

/** Anggota memperbarui minat, consent newsletter, dan nomor telepon (WA). */
export class UpdatePreferencesDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsBoolean()
  newsletterConsent?: boolean;

  @IsOptional()
  @IsString()
  phone?: string;
}
