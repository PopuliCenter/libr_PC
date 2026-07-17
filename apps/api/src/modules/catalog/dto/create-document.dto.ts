import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  AccessType,
  CollectionType,
  CopyrightStatus,
  DocumentStatus,
} from '../entities/document.entity';
import { RelatedLinkDto } from './related-link.dto';

export class CreateDocumentDto {
  @IsNotEmpty({ message: 'Judul wajib diisi' })
  title: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Minimal satu penulis' })
  authors: string[];

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  isbnIssn?: string;

  @IsOptional()
  @IsIn(['buku', 'laporan', 'jurnal', 'prosiding', 'dataset', 'video', 'audio', 'lainnya'])
  collectionType?: CollectionType;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  abstract?: string;

  @IsOptional()
  @IsString()
  callNumber?: string;

  @IsOptional()
  @IsArray()
  subjects?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelatedLinkDto)
  relatedLinks?: RelatedLinkDto[];

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsIn(['OPEN', 'MEMBER', 'LOAN'])
  accessType?: AccessType;

  @IsOptional()
  @IsInt()
  @Min(1)
  licenseCount?: number;

  @IsOptional()
  @IsArray()
  loanDurations?: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  previewPages?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  physicalCopies?: number;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: DocumentStatus;

  @IsOptional()
  @IsIn(['OWNED', 'LICENSED', 'UNCLEARED'])
  copyrightStatus?: CopyrightStatus;
}
