import { MigrationInterface, QueryRunner } from "typeorm";

export class InterestSegmentation1784191598453 implements MigrationInterface {
    name = 'InterestSegmentation1784191598453'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "interests" text NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "newsletterConsent" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "newsletterConsentAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "documents" ADD "announcedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "announcedAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "newsletterConsentAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "newsletterConsent"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "interests"`);
    }

}
