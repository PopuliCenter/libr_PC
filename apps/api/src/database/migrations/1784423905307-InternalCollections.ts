import { MigrationInterface, QueryRunner } from "typeorm";

export class InternalCollections1784423905307 implements MigrationInterface {
    name = 'InternalCollections1784423905307'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "isInternal" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isInternal"`);
    }

}
