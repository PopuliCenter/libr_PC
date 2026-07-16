import { MigrationInterface, QueryRunner } from "typeorm";

export class SsoOidcProvider1784189090517 implements MigrationInterface {
    name = 'SsoOidcProvider1784189090517'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "oauth_authorization_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "codeHash" character varying NOT NULL, "clientId" character varying NOT NULL, "userId" character varying NOT NULL, "redirectUri" character varying NOT NULL, "scope" character varying NOT NULL, "nonce" character varying, "codeChallenge" character varying NOT NULL, "codeChallengeMethod" character varying NOT NULL DEFAULT 'S256', "expiresAt" TIMESTAMP NOT NULL, "consumedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_441350d3fce3606534fbb2c1197" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_58bb94603eb30f80714a60921b" ON "oauth_authorization_codes" ("codeHash") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_58bb94603eb30f80714a60921b"`);
        await queryRunner.query(`DROP TABLE "oauth_authorization_codes"`);
    }

}
