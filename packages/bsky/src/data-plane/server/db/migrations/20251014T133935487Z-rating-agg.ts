import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('rating_agg')
    .addColumn('uri', 'varchar', (col) => col.notNull())
    .addColumn('aspect', 'text', (col) => col.defaultTo(''))
    .addColumn('ratingCount', 'bigint', (col) => col.notNull().defaultTo(0))
    .addColumn('ratingAverage', 'numeric', (col) => col.defaultTo(null))
    .addPrimaryKeyConstraint('rating_agg_pk', ['uri', 'aspect'])
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('rating_agg').execute()
}
