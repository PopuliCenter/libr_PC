import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentDoi1784510000000 implements MigrationInterface {
  name = 'DocumentDoi1784510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" ADD "doi" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "doi"`);
  }
}
