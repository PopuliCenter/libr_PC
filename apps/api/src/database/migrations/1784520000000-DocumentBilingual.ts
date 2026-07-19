import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentBilingual1784520000000 implements MigrationInterface {
  name = 'DocumentBilingual1784520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" ADD "titleEn" character varying`);
    await queryRunner.query(`ALTER TABLE "documents" ADD "abstractEn" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "abstractEn"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "titleEn"`);
  }
}
