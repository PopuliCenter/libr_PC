import { NestFactory } from '@nestjs/core';
import { readFileSync } from 'fs';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { CategoriesService } from '../modules/catalog/categories.service';
import { DocumentsService } from '../modules/catalog/documents.service';
import { Category } from '../modules/catalog/entities/category.entity';
import { Document } from '../modules/catalog/entities/document.entity';

interface InventoryItem {
  title: string;
  authors: string[];
  publisher: string | null;
  isbn: string | null;
  year: number | null;
  category: string;
  callNumber: string | null;
  copies: number;
}

/**
 * Impor inventaris buku fisik dari JSON hasil konversi Excel.
 * Aman diulang: baris yang sudah ada (ISBN sama, atau judul+tahun sama)
 * akan dilewati. Jalankan: node dist/scripts/import-inventory.js <file.json>
 */
async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Pemakaian: node dist/scripts/import-inventory.js <file.json>');
    process.exit(1);
  }
  const items: InventoryItem[] = JSON.parse(readFileSync(file, 'utf8'));
  console.log(`Membaca ${items.length} judul dari ${file}`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const documentsService = app.get(DocumentsService);
  const categoriesService = app.get(CategoriesService);
  const docRepo = app.get(DataSource).getRepository(Document);

  // Siapkan cache kategori (nama → id), buat yang belum ada.
  const categoryByName = new Map<string, Category>();
  for (const cat of await categoriesService.findAll()) {
    categoryByName.set(cat.name.toLowerCase(), cat);
  }
  async function categoryId(name: string): Promise<string> {
    const key = name.toLowerCase();
    let cat = categoryByName.get(key);
    if (!cat) {
      cat = await categoriesService.create(name);
      categoryByName.set(key, cat);
    }
    return cat.id;
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      const dupe = await docRepo
        .createQueryBuilder('doc')
        .where(
          item.isbn
            ? 'doc.isbnIssn = :isbn OR (LOWER(doc.title) = :title AND doc.year IS :year)'
            : 'LOWER(doc.title) = :title AND doc.year IS :year',
          {
            isbn: item.isbn,
            title: item.title.toLowerCase(),
            year: item.year,
          },
        )
        .getOne();
      if (dupe) {
        skipped++;
        continue;
      }

      await documentsService.create({
        title: item.title,
        authors: item.authors,
        publisher: item.publisher ?? undefined,
        year: item.year ?? undefined,
        isbnIssn: item.isbn ?? undefined,
        collectionType: 'buku',
        language: 'id',
        callNumber: item.callNumber ?? undefined,
        categoryId: await categoryId(item.category),
        accessType: 'MEMBER',
        status: 'PUBLISHED',
        physicalCopies: item.copies,
        subjects: [],
      });
      created++;
      if (created % 100 === 0) console.log(`  … ${created} judul dibuat`);
    } catch (err) {
      errors.push(`${item.title}: ${(err as Error).message}`);
    }
  }

  console.log('\n===== HASIL IMPOR =====');
  console.log(`Dibuat   : ${created}`);
  console.log(`Dilewati : ${skipped} (sudah ada)`);
  console.log(`Gagal    : ${errors.length}`);
  errors.slice(0, 10).forEach((e) => console.log('  !', e));

  await app.close();
}

main();
