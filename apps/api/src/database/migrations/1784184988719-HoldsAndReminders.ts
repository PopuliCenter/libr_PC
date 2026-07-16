import { MigrationInterface, QueryRunner } from "typeorm";

export class HoldsAndReminders1784184988719 implements MigrationInterface {
    name = 'HoldsAndReminders1784184988719'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "holds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'WAITING', "queuedAt" TIMESTAMP NOT NULL DEFAULT now(), "offeredAt" TIMESTAMP, "offerExpiresAt" TIMESTAMP, "documentId" uuid, CONSTRAINT "PK_a8a21700a256e0267fb43f4f7ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_32d2a27575351fad3c1c5f9b57" ON "holds" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2f36fb7cd61369cdca9c36c22b" ON "holds" ("status") `);
        await queryRunner.query(`ALTER TABLE "loans" ADD "expiringNotifiedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "holds" ADD CONSTRAINT "FK_3c7fe6e4e8df64648e829b600cf" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "holds" DROP CONSTRAINT "FK_3c7fe6e4e8df64648e829b600cf"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "expiringNotifiedAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2f36fb7cd61369cdca9c36c22b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_32d2a27575351fad3c1c5f9b57"`);
        await queryRunner.query(`DROP TABLE "holds"`);
    }

}
