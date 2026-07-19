import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateAnnotationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  pageNo?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Catatan tidak boleh kosong' })
  @MaxLength(2000)
  note?: string;
}
