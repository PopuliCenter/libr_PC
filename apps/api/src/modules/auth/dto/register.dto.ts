import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Nama wajib diisi' })
  @IsString()
  name: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @MinLength(8, { message: 'Password minimal 8 karakter' })
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  institution?: string;
}
