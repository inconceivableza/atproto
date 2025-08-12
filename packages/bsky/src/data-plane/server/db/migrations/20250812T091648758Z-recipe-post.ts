import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.createTable('recipe_post')
    .addColumn('uri', 'varchar', (col) => col.primaryKey())
    .addColumn('cid', 'varchar', (col) => col.notNull())
    .addColumn('creator', 'varchar', (col) => col.notNull())
    .addColumn('text', 'varchar', (col) => col.notNull())
    .addColumn('createdAt', 'varchar', (col) => col.notNull())
    .addColumn('indexedAt', 'varchar', (col) => col.notNull())
    .addColumn('sortAt', 'varchar', (col) =>
      col
        .generatedAlwaysAs(sql`least("createdAt", "indexedAt")`)
        .stored()
        .notNull(),
    )
    .execute()

  await db.schema.createTable('recipe_step')
    .addColumn('recipePostURI', 'varchar', (col) => col.notNull())
    .addColumn('text', 'varchar', (col) => col.notNull())
    .addColumn('order', 'int8', (col) => col.notNull())
    .addPrimaryKeyConstraint("recipe_step_pk", ["recipePostURI", "order"])
    .addForeignKeyConstraint("recipe_step_uri_fk", ["recipePostURI"], "recipe_post", ["uri"])
    .execute()

  await db.schema.createTable('recipe_ingredient')
    .addColumn('recipePostURI', 'varchar', (col) => col.notNull())
    .addColumn('ingredient', 'varchar', (col) => col.notNull())
    .addColumn('quantity', 'float4', (col) => col.notNull()) // consider integer (converted to smallest unit)
    .addColumn('unit', 'varchar', (col) => col.notNull())
    .addColumn('order', 'int8', (col) => col.notNull())
    .addPrimaryKeyConstraint("recipe_ingredient_pk", ["recipePostURI", "order"])
    .addForeignKeyConstraint("recipe_ingredient_uri_fk", ["recipePostURI"], "recipe_post", ["uri"])

    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('recipeIngredient').execute()
  await db.schema.dropTable('recipeStep').execute()
  await db.schema.dropTable('recipePost').execute()
}
