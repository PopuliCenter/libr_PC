import { MigrationInterface, QueryRunner } from "typeorm";

export class RelatedLinks1784274636685 implements MigrationInterface {
    name = 'RelatedLinks1784274636685'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" ADD "relatedLinks" text NOT NULL DEFAULT '[]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "relatedLinks"`);
    }

}
