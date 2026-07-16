import { MigrationInterface, QueryRunner } from "typeorm";

export class BulkImport1784185591356 implements MigrationInterface {
    name = 'BulkImport1784185591356'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "import_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "batchId" character varying NOT NULL, "rowNo" integer NOT NULL, "payload" text NOT NULL, "pdfObjectKey" character varying, "checksum" character varying, "status" character varying NOT NULL, "messages" text NOT NULL DEFAULT '[]', "documentId" character varying, CONSTRAINT "PK_3629174ac7c5736658b7404098c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_95bdbf72404439305b72fdd18e" ON "import_items" ("batchId") `);
        await queryRunner.query(`CREATE TABLE "import_batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "adminId" character varying NOT NULL, "filename" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'VALIDATING', "totals" text, "errorMessage" character varying, "autoPublish" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6162597a2576c03e04bb2c1a2dd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "documents" ADD "sourceChecksum" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_dfa756b467febe2dec6f3235fc" ON "documents" ("sourceChecksum") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_dfa756b467febe2dec6f3235fc"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "sourceChecksum"`);
        await queryRunner.query(`DROP TABLE "import_batches"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_95bdbf72404439305b72fdd18e"`);
        await queryRunner.query(`DROP TABLE "import_items"`);
    }

}
