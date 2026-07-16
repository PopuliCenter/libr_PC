import { MigrationInterface, QueryRunner } from "typeorm";

export class ReaderAndLoans1784170844209 implements MigrationInterface {
    name = 'ReaderAndLoans1784170844209'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "reading_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "documentId" character varying NOT NULL, "loanId" character varying, "lastPage" integer NOT NULL DEFAULT '1', "expiresAt" TIMESTAMP NOT NULL, "revokedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_73ccd8f0addae337862c4d48699" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_039e76d51ce153011cb3865219" ON "reading_sessions" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_434eb39ddd5f430f334b5ae099" ON "reading_sessions" ("documentId") `);
        await queryRunner.query(`CREATE TABLE "loans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'ACTIVE', "durationDays" integer NOT NULL, "borrowedAt" TIMESTAMP NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP NOT NULL, "returnedAt" TIMESTAMP, "documentId" uuid, CONSTRAINT "PK_5c6942c1e13e4de135c5203ee61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4c2ab4e556520045a2285916d4" ON "loans" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_a630540e1bb9644436a2258c3d" ON "loans" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_edb792ab6f4388e3b339e6a637" ON "loans" ("expiresAt") `);
        await queryRunner.query(`ALTER TABLE "loans" ADD CONSTRAINT "FK_0f4d50eeb5da063178cee2bca9f" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loans" DROP CONSTRAINT "FK_0f4d50eeb5da063178cee2bca9f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_edb792ab6f4388e3b339e6a637"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a630540e1bb9644436a2258c3d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c2ab4e556520045a2285916d4"`);
        await queryRunner.query(`DROP TABLE "loans"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_434eb39ddd5f430f334b5ae099"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_039e76d51ce153011cb3865219"`);
        await queryRunner.query(`DROP TABLE "reading_sessions"`);
    }

}
