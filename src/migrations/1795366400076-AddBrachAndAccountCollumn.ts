import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBrachAndAccountCollumn1795366400076 implements MigrationInterface {
    name = 'AddBrachAndAccountCollumn1795366400076'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "account" character varying(7) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD "branch" character varying(5) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_c648175abbad38222fb72972d75" UNIQUE ("account", "branch")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_c648175abbad38222fb72972d75"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "branch"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "account"`);
    }

}
