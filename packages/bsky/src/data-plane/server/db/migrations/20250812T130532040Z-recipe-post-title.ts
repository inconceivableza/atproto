import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("recipe_post")
    .addColumn("title", "varchar", col => col.notNull())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("recipe_post")
    .dropColumn("title")
    .execute()
}
