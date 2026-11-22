import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTransfer1795030333653 implements MigrationInterface {
    name = 'CreateTransfer1795030333653'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."transfers_status_enum" AS ENUM('COMPLETED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "transfers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fromUserId" uuid NOT NULL, "toUserId" uuid NOT NULL, "amount" numeric(10,2) NOT NULL, "status" "public"."transfers_status_enum" NOT NULL DEFAULT 'COMPLETED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f712e908b465e0085b4408cabc3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "transfers" ADD CONSTRAINT "FK_a4c7dcbca450a55944635c20bc7" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transfers" ADD CONSTRAINT "FK_c50919bdc36e5027e667050f781" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfers" DROP CONSTRAINT "FK_c50919bdc36e5027e667050f781"`);
        await queryRunner.query(`ALTER TABLE "transfers" DROP CONSTRAINT "FK_a4c7dcbca450a55944635c20bc7"`);
        await queryRunner.query(`DROP TABLE "transfers"`);
        await queryRunner.query(`DROP TYPE "public"."transfers_status_enum"`);
    }

}
