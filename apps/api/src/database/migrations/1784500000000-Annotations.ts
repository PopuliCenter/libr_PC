import { MigrationInterface, QueryRunner } from 'typeorm';

export class Annotations1784500000000 implements MigrationInterface {
  name = 'Annotations1784500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "annotations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "documentId" character varying NOT NULL, "pageNo" integer NOT NULL, "note" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_annotations_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annotations_user" ON "annotations" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annotations_document" ON "annotations" ("documentId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_annotations_document"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_annotations_user"`);
    await queryRunner.query(`DROP TABLE "annotations"`);
  }
}
