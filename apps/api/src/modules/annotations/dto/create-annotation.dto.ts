import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAnnotationDto {
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @IsInt()
  @Min(1)
  pageNo: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Catatan tidak boleh kosong' })
  @MaxLength(2000)
  note: string;
}
