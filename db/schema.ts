import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const accounts = sqliteTable('accounts', {
 owner: text('owner').primaryKey(), balance: integer('balance').notNull(), reserved: integer('reserved').notNull().default(0),
 reserve: integer('reserve').notNull(), generation: text('generation').notNull(), createdAt: text('created_at').notNull(),
});
export const plans = sqliteTable('plans', {
 id:text('id').primaryKey(), owner:text('owner').notNull(), generation:text('generation').notNull(),
 invoiceKey:text('invoice_key').notNull(), data:text('data').notNull(), hash:text('hash').notNull(),
 expiresAt:integer('expires_at').notNull(), createdAt:text('created_at').notNull(),
},t=>[index('plans_owner_idx').on(t.owner)]);
export const transactions=sqliteTable('transactions',{
 id:text('id').primaryKey(), owner:text('owner').notNull(), generation:text('generation').notNull(),
 invoiceKey:text('invoice_key').notNull(), planId:text('plan_id').notNull(), data:text('data').notNull(),
 debit:integer('debit').notNull(), status:text('status').notNull(), createdAt:text('created_at').notNull(), settledAt:text('settled_at'),
},t=>[uniqueIndex('txn_invoice_once').on(t.owner,t.generation,t.invoiceKey), uniqueIndex('txn_plan_once').on(t.planId),index('txn_owner_idx').on(t.owner)]);
export const providerLedger=sqliteTable('provider_ledger',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),generation:text('generation').notNull(),scenario:text('scenario').notNull(),status:text('status').notNull(),polls:integer('polls').notNull().default(0),data:text('data').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('provider_owner_idx').on(t.owner)]);
