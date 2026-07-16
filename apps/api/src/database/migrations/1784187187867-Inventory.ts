import { MigrationInterface, QueryRunner } from "typeorm";

export class Inventory1784187187867 implements MigrationInterface {
    name = 'Inventory1784187187867'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "stocktakes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "startedById" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'OPEN', "startedAt" TIMESTAMP NOT NULL DEFAULT now(), "closedAt" TIMESTAMP, "summary" text, CONSTRAINT "PK_06743abbde0490196ad25408080" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "physical_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "accessionNo" character varying NOT NULL, "barcode" character varying, "shelfLocation" character varying, "condition" character varying NOT NULL DEFAULT 'BAIK', "acquisitionSource" character varying, "acquiredAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "documentId" uuid, CONSTRAINT "PK_76e0125d053df27e9a75f5b8d29" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_637c0fef3a52d962bf5f79de4f" ON "physical_items" ("accessionNo") `);
        await queryRunner.query(`CREATE INDEX "IDX_b42fb787594a5ef11d0bc2d88b" ON "physical_items" ("barcode") `);
        await queryRunner.query(`CREATE TABLE "stocktake_scans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "stocktakeId" character varying NOT NULL, "physicalItemId" character varying, "barcode" character varying NOT NULL, "scannedById" character varying NOT NULL, "scannedLocation" character varying, "clientScanId" character varying NOT NULL, "at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5e39c6f661a424a0bf4dcdf3eb6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_17cfffb77d4e55c21d498ceb9f" ON "stocktake_scans" ("stocktakeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_75eb498c79e37ce1c6cd5dfac4" ON "stocktake_scans" ("physicalItemId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1895972f75e7029ca5371de602" ON "stocktake_scans" ("clientScanId") `);
        await queryRunner.query(`CREATE TABLE "isbn_cache" ("isbn" character varying NOT NULL, "payload" text NOT NULL, "source" character varying NOT NULL, "fetchedAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_5413a850ccef2d1047a84257041" PRIMARY KEY ("isbn"))`);
        await queryRunner.query(`ALTER TABLE "physical_items" ADD CONSTRAINT "FK_638f4f96463ddcf3567e2fd7893" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "physical_items" DROP CONSTRAINT "FK_638f4f96463ddcf3567e2fd7893"`);
        await queryRunner.query(`DROP TABLE "isbn_cache"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1895972f75e7029ca5371de602"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_75eb498c79e37ce1c6cd5dfac4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_17cfffb77d4e55c21d498ceb9f"`);
        await queryRunner.query(`DROP TABLE "stocktake_scans"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b42fb787594a5ef11d0bc2d88b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_637c0fef3a52d962bf5f79de4f"`);
        await queryRunner.query(`DROP TABLE "physical_items"`);
        await queryRunner.query(`DROP TABLE "stocktakes"`);
    }

}
