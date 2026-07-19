import { MigrationInterface, QueryRunner } from "typeorm";

export class DocumentChunks1784461537496 implements MigrationInterface {
    name = 'DocumentChunks1784461537496'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "document_chunks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "documentId" character varying NOT NULL, "pageNo" integer NOT NULL, "chunkIndex" integer NOT NULL DEFAULT '0', "text" text NOT NULL, CONSTRAINT "PK_7f9060084e9b872dbb567193978" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_eaf9afaf30fb7e2ac25989db51" ON "document_chunks" ("documentId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_eaf9afaf30fb7e2ac25989db51"`);
        await queryRunner.query(`DROP TABLE "document_chunks"`);
    }

}
