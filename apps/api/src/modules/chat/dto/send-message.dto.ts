import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty({ message: 'Pesan tidak boleh kosong' })
  @IsString()
  @MaxLength(2000, { message: 'Pesan maksimal 2000 karakter' })
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
