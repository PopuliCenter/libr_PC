import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1784169503699 implements MigrationInterface {
    name = 'InitialSchema1784169503699'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying, "phone" character varying, "institution" character varying, "role" character varying NOT NULL DEFAULT 'member', "status" character varying NOT NULL DEFAULT 'pending', "googleId" character varying, "emailVerifiedAt" TIMESTAMP, "verificationTokenHash" character varying, "verificationTokenExpiresAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "chat_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessionId" character varying NOT NULL, "userId" character varying, "role" character varying NOT NULL, "content" text NOT NULL, "provider" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_40c55ee0e571e268b0d3cd37d10" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a82476a8acdd6cd6936378cb72" ON "chat_messages" ("sessionId") `);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actorId" character varying, "action" character varying NOT NULL, "entity" character varying NOT NULL, "entityId" character varying, "ip" character varying, "meta" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2dc33f7f3c22e2e7badafca1d1" ON "audit_logs" ("actorId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action") `);
        await queryRunner.query(`CREATE INDEX "IDX_445557993007fefee3aa9f1117" ON "audit_logs" ("entity") `);
        await queryRunner.query(`CREATE INDEX "IDX_c69efb19bf127c97e6740ad530" ON "audit_logs" ("createdAt") `);
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "parentId" uuid, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_420d9f679d41281f282f5bc7d0" ON "categories" ("slug") `);
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "slug" character varying NOT NULL, "authors" text NOT NULL, "publisher" character varying, "year" integer, "isbnIssn" character varying, "collectionType" character varying NOT NULL DEFAULT 'buku', "language" character varying NOT NULL DEFAULT 'id', "abstract" text, "callNumber" character varying, "subjects" text NOT NULL DEFAULT '[]', "accessType" character varying NOT NULL DEFAULT 'MEMBER', "licenseCount" integer NOT NULL DEFAULT '1', "loanDurations" text NOT NULL DEFAULT '[3,7]', "previewPages" integer NOT NULL DEFAULT '0', "physicalCopies" integer NOT NULL DEFAULT '0', "pageCount" integer, "status" character varying NOT NULL DEFAULT 'DRAFT', "copyrightStatus" character varying NOT NULL DEFAULT 'OWNED', "masterObjectKey" character varying, "coverObjectKey" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "categoryId" uuid, CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_553906d54e4e79077bc641a648" ON "documents" ("title") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_06f1e6b2d31b55696c2899a64d" ON "documents" ("slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_709389d904fa03bdf5ec84998d" ON "documents" ("status") `);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_2d7e06f29424dbb29a827a7c1b5" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_2d7e06f29424dbb29a827a7c1b5"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_709389d904fa03bdf5ec84998d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_06f1e6b2d31b55696c2899a64d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_553906d54e4e79077bc641a648"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_420d9f679d41281f282f5bc7d0"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c69efb19bf127c97e6740ad530"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_445557993007fefee3aa9f1117"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cee5459245f652b75eb2759b4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2dc33f7f3c22e2e7badafca1d1"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a82476a8acdd6cd6936378cb72"`);
        await queryRunner.query(`DROP TABLE "chat_messages"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
