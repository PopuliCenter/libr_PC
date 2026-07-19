import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hasInternalAccess } from '../../common/access';
import { DocumentsService } from '../catalog/documents.service';
import { User } from '../users/entities/user.entity';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { UpdateAnnotationDto } from './dto/update-annotation.dto';
import { Annotation } from './entities/annotation.entity';

/**
 * Catatan pribadi anggota (PRD P5). Setiap operasi terikat pemilik — anggota
 * hanya melihat/mengubah catatannya sendiri.
 */
@Injectable()
export class AnnotationsService {
  constructor(
    @InjectRepository(Annotation)
    private readonly repo: Repository<Annotation>,
    private readonly documents: DocumentsService,
  ) {}

  /** Catatan milik anggota untuk satu koleksi, terurut halaman lalu waktu. */
  listForDocument(userId: string, documentId: string): Promise<Annotation[]> {
    return this.repo.find({
      where: { userId, documentId },
      order: { pageNo: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(user: User, dto: CreateAnnotationDto): Promise<Annotation> {
    await this.assertReadable(user, dto.documentId);
    return this.repo.save(
      this.repo.create({
        userId: user.id,
        documentId: dto.documentId,
        pageNo: dto.pageNo,
        note: dto.note.trim(),
      }),
    );
  }

  async update(
    user: User,
    id: string,
    dto: UpdateAnnotationDto,
  ): Promise<Annotation> {
    const ann = await this.ownedOrThrow(user, id);
    if (dto.pageNo !== undefined) ann.pageNo = dto.pageNo;
    if (dto.note !== undefined) ann.note = dto.note.trim();
    return this.repo.save(ann);
  }

  async remove(user: User, id: string): Promise<void> {
    const ann = await this.ownedOrThrow(user, id);
    await this.repo.remove(ann);
  }

  private async ownedOrThrow(user: User, id: string): Promise<Annotation> {
    const ann = await this.repo.findOne({ where: { id } });
    if (!ann) throw new NotFoundException('Catatan tidak ditemukan');
    if (ann.userId !== user.id) {
      throw new ForbiddenException('Bukan catatan Anda');
    }
    return ann;
  }

  /** Hanya boleh menganotasi koleksi yang berhak dibaca anggota. */
  private async assertReadable(user: User, documentId: string): Promise<void> {
    const doc = await this.documents.findById(documentId);
    if (doc.status !== 'PUBLISHED') {
      throw new NotFoundException('Koleksi tidak ditemukan');
    }
    if (doc.accessType === 'INTERNAL' && !hasInternalAccess(user)) {
      throw new ForbiddenException('Koleksi internal — akses terbatas');
    }
  }
}
