import { IsIn, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { RelatedLinkKind } from '../entities/document.entity';

export const RELATED_LINK_KINDS: RelatedLinkKind[] = [
  'video',
  'podcast',
  'news',
  'slides',
  'dataset',
  'event',
  'other',
];

export class RelatedLinkDto {
  @IsIn(RELATED_LINK_KINDS)
  kind: RelatedLinkKind;

  @IsString()
  @IsNotEmpty({ message: 'Judul tautan wajib diisi' })
  title: string;

  @IsUrl({ require_protocol: true }, { message: 'URL tautan tidak valid' })
  url: string;
}
