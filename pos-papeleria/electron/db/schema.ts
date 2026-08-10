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
  creditAuthorized: integer('credit_authorized', { mode: 'boolean' }).notNull().default(false),
  creditLimit: real('credit_limit').notNull().default(0),
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
  paymentMethod: text('payment_method').notNull().default('cash'),
  notes: text('notes'),
  cancelled: integer('cancelled', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const stockEntryItems = sqliteTable('stock_entry_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').references(() => stockEntries.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  purchasePrice: real('purchase_price').notNull(),
  salePrice: real('sale_price').notNull().default(0),
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
  unitPrice: real('unit_price').notNull(), // precio de venta histórico
  unitCost: real('unit_cost'), // costo histórico; nulo en ventas anteriores a la migración
  subtotal: real('subtotal').notNull(),
  metadataJson: text('metadata_json'), // datos extra según item_type
})

// ─── Cuentas por cobrar ──────────────────────────────────────────────────────
export const accountsReceivable = sqliteTable('accounts_receivable', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').references(() => sales.id).notNull(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  originalAmount: real('original_amount').notNull(),
  balance: real('balance').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status').notNull().default('open'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  paidAt: text('paid_at'),
  cancelledAt: text('cancelled_at'),
})

export const creditPayments = sqliteTable('credit_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').references(() => accountsReceivable.id).notNull(),
  saleId: integer('sale_id').references(() => sales.id).notNull(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method').notNull(),
  businessDate: text('business_date').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})
// ─── Caja y gastos ───────────────────────────────────────────────────────────
// Accounts payable
export const accountsPayable = sqliteTable('accounts_payable', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  stockEntryId: integer('stock_entry_id').references(() => stockEntries.id).notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id).notNull(),
  originalAmount: real('original_amount').notNull(),
  balance: real('balance').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status').notNull().default('open'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  paidAt: text('paid_at'),
  cancelledAt: text('cancelled_at'),
})

export const payablePayments = sqliteTable('payable_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').references(() => accountsPayable.id).notNull(),
  stockEntryId: integer('stock_entry_id').references(() => stockEntries.id).notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id).notNull(),
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method').notNull(),
  businessDate: text('business_date').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const cashRegisters = sqliteTable('cash_registers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  businessDate: text('business_date').notNull(),
  openingAmount: real('opening_amount').notNull(),
  status: text('status').notNull().default('open'),
  expectedCash: real('expected_cash'),
  countedCash: real('counted_cash'),
  difference: real('difference'),
  openingNotes: text('opening_notes'),
  closingNotes: text('closing_notes'),
  openedAt: text('opened_at').default(sql`CURRENT_TIMESTAMP`),
  closedAt: text('closed_at'),
})

export const cashExpenses = sqliteTable('cash_expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cashRegisterId: integer('cash_register_id').references(() => cashRegisters.id).notNull(),
  businessDate: text('business_date').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
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
