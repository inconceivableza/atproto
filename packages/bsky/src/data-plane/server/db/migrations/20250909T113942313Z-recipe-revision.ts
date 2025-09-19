import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.createTable('recipe_post')
    .addColumn('uri', 'varchar', (col) => col.primaryKey())
    .addColumn('cid', 'varchar', (col) => col.notNull())
    .addColumn('creator', 'varchar', (col) => col.notNull())
    .addColumn('createdAt', 'varchar', (col) => col.notNull())
    .addColumn('indexedAt', 'varchar', (col) => col.notNull())
    .addColumn('sortAt', 'varchar', (col) =>
      col
        .generatedAlwaysAs(sql`least("createdAt", "indexedAt")`)
        .stored()
        .notNull(),
    )
    .execute()

  await db.schema.createTable('recipe_revision')
    .addColumn('recipePostUri', 'varchar', (col) => col.notNull())
    .addColumn('uri', 'varchar', (col) => col.primaryKey())
    .addColumn('cid', 'varchar', (col) => col.notNull())
    .addColumn('creator', 'varchar', (col) => col.notNull())
    .addColumn('createdAt', 'varchar', (col) => col.notNull())
    .addColumn('indexedAt', 'varchar', (col) => col.notNull())
    .addForeignKeyConstraint("recipe_post_uri_fk", ["recipePostUri"], "recipe_post", ["uri"])
    .execute()

  await db.schema.createTable('recipe_head_revision')
    .addColumn('recipePostUri', 'varchar', (col) => col.primaryKey())
    .addColumn('recipeRevisionUri', 'varchar', (col) => col.notNull())
    .addForeignKeyConstraint("recipe_post_uri_fk", ["recipePostUri"], "recipe_post", ["uri"])
    .addForeignKeyConstraint("recipe_revision_uri_fk", ["recipeRevisionUri"], "recipe_revision", ["uri"])
    .execute()

}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('recipe_head_revision').execute()
  await db.schema.dropTable('recipe_revision').execute()
  await db.schema.dropTable('recipe_post').execute()
}
