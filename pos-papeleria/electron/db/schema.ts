import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── Categorías ───────────────────────────────────────────────────────────────
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  parentId: integer('parent_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// ─── Proveedores ──────────────────────────────────────────────────────────────
export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  company: text('company'),
  nit: text('nit'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// ─── Clientes ───────────────────────────────────────────────────────────────
export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  nameNormalized: text('name_normalized').notNull(),
  nit: text('nit'),
  nitNormalized: text('nit_normalized').notNull().default(''),
  phone: text('phone'),
  phoneNormalized: text('phone_normalized').notNull().default(''),
  email: text('email'),
  address: text('address'),
  notes: text('notes'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})
// ─── Productos ────────────────────────────────────────────────────────────────
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sku: text('sku'),
  barcode: text('barcode'),
  categoryId: integer('category_id').references(() => categories.id),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  salePrice: real('sale_price').notNull().default(0),
  purchasePrice: real('purchase_price').notNull().default(0),
  stock: integer('stock').notNull().default(0),
  minStock: integer('min_stock').notNull().default(5),
  photoPath: text('photo_path'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

// ─── Entradas de Mercancía ────────────────────────────────────────────────────
export const stockEntries = sqliteTable('stock_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  date: text('date').notNull(),
  totalAmount: real('total_amount').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const stockEntryItems = sqliteTable('stock_entry_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').references(() => stockEntries.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  purchasePrice: real('purchase_price').notNull(),
  subtotal: real('subtotal').notNull(),
})

// ─── Ventas ───────────────────────────────────────────────────────────────────
export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  folio: text('folio').notNull(),
  date: text('date').notNull(),
  subtotal: real('subtotal').notNull(),
  discount: real('discount').notNull().default(0),
  total: real('total').notNull(),
  paymentMethod: text('payment_method').notNull(), // 'cash' | 'card' | 'transfer'
  amountPaid: real('amount_paid').notNull(),
  changeGiven: real('change_given').notNull().default(0),
  notes: text('notes'),
  customerId: integer('customer_id').references(() => customers.id),
  customerName: text('customer_name'),
  customerNit: text('customer_nit'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').references(() => sales.id).notNull(),
  itemType: text('item_type').notNull(), // 'product' | 'print' | 'research'
  productId: integer('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: real('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull(),
  subtotal: real('subtotal').notNull(),
  metadataJson: text('metadata_json'), // datos extra según item_type
})

// ─── Precios de Impresión ─────────────────────────────────────────────────────
export const printPrices = sqliteTable('print_prices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  paperType: text('paper_type').notNull(), // 'carta' | 'oficio' | 'tabloide' | 'foto'
  printType: text('print_type').notNull(), // 'bw' | 'color'
  pricePerPage: real('price_per_page').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

// ─── Configuración ────────────────────────────────────────────────────────────
export const businessConfig = sqliteTable('business_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
