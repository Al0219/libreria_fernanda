import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import initSqlJs, { Database } from 'sql.js'

let db: Database
let dbPath: string

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

// Guardar la BD en disco
function saveToDisk() {
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

export async function initializeDatabase() {
  const userDataPath = app.getPath('userData')
  dbPath = path.join(userDataPath, 'database.sqlite')

  // Crear carpetas si no existen
  fs.mkdirSync(userDataPath, { recursive: true })
  fs.mkdirSync(path.join(userDataPath, 'backups'), { recursive: true })
  fs.mkdirSync(path.join(userDataPath, 'photos'), { recursive: true })

  console.log(`[DB] Base de datos en: ${dbPath}`)

  // Ruta al wasm de sql.js
  const wasmPath = app.isPackaged
    ? path.join(process.resourcesPath, 'sql-wasm.wasm')
    : path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm')

  const SQL = await initSqlJs({
    locateFile: () => wasmPath,
  })

  // Cargar BD existente o crear nueva
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
    console.log('[DB] Base de datos existente cargada')
  } else {
    db = new SQL.Database()
    console.log('[DB] Nueva base de datos creada')
  }

  // Habilitar foreign keys
  db.run('PRAGMA foreign_keys = ON')

  // Crear tablas
  createTables()

  // Migraciones (columnas nuevas en tablas existentes)
  runMigrations()

  // Seed de datos iniciales
  seedInitialData()

  // Guardar al disco inmediatamente
  saveToDisk()

  // Auto-guardar cada 30 segundos
  setInterval(saveToDisk, 30000)

  console.log('[DB] Inicialización completa')
}

export function saveDb() {
  saveToDisk()
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT,
      nit TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_normalized TEXT NOT NULL,
      nit TEXT,
      nit_normalized TEXT NOT NULL DEFAULT '',
      phone TEXT,
      phone_normalized TEXT NOT NULL DEFAULT '',
      email TEXT,
      address TEXT,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_identity
      ON customers (name_normalized, nit_normalized, phone_normalized);
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT,
      barcode TEXT,
      category_id INTEGER REFERENCES categories(id),
      supplier_id INTEGER REFERENCES suppliers(id),
      sale_price REAL NOT NULL DEFAULT 0,
      purchase_price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 5,
      photo_path TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER REFERENCES suppliers(id),
      date TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      cancelled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_entry_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL REFERENCES stock_entries(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      purchase_price REAL NOT NULL,
      sale_price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT NOT NULL,
      date TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      amount_paid REAL NOT NULL,
      change_given REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id),
      item_type TEXT NOT NULL,
      product_id INTEGER REFERENCES products(id),
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      unit_cost REAL,
      subtotal REAL NOT NULL,
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS print_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_type TEXT NOT NULL,
      print_type TEXT NOT NULL,
      price_per_page REAL NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS business_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

function runMigrations() {
  // Agregar columna 'cancelled' a ventas si no existe (eliminación lógica)
  try {
    db.run(`ALTER TABLE sales ADD COLUMN cancelled INTEGER NOT NULL DEFAULT 0`)
    console.log('[DB] Migración: columna cancelled agregada a sales')
  } catch {
    // La columna ya existe — ignorar
  }

  // Agregar NIT a proveedores existentes
  try {
    db.run(`ALTER TABLE suppliers ADD COLUMN nit TEXT`)
    console.log('[DB] Migración: columna nit agregada a suppliers')
  } catch {
    // La columna ya existe — ignorar
  }

  // Agregar cancelación lógica a compras existentes
  try {
    db.run(`ALTER TABLE stock_entries ADD COLUMN cancelled INTEGER NOT NULL DEFAULT 0`)
    console.log('[DB] Migración: columna cancelled agregada a stock_entries')
  } catch {
    // La columna ya existe — ignorar
  }
  // Agregar precio de venta a los detalles de compras existentes
  try {
    db.run(`ALTER TABLE stock_entry_items ADD COLUMN sale_price REAL NOT NULL DEFAULT 0`)
    console.log('[DB] Migración: columna sale_price agregada a stock_entry_items')
  } catch {
    // La columna ya existe — ignorar
  }

  // Agregar costo histórico a los detalles de ventas existentes
  try {
    db.run(`ALTER TABLE sale_items ADD COLUMN unit_cost REAL`)
    console.log('[DB] Migración: columna unit_cost agregada a sale_items')
  } catch {
    // La columna ya existe — ignorar
  }

  // Agregar datos de cliente a ventas existentes
  for (const [column, definition] of [
    ['customer_id', 'INTEGER'],
    ['customer_name', 'TEXT'],
    ['customer_nit', 'TEXT'],
  ]) {
    try {
      db.run(`ALTER TABLE sales ADD COLUMN ${column} ${definition}`)
      console.log(`[DB] Migración: columna ${column} agregada a sales`)
    } catch {
      // La columna ya existe — ignorar
    }
  }
}

function seedInitialData() {
  // Precios de impresión
  const priceCount = (db.exec("SELECT COUNT(*) as c FROM print_prices")[0]?.values[0][0] as number) || 0
  if (priceCount === 0) {
    const seedPrices = [
      ['carta', 'bw', 1.5], ['carta', 'color', 4.0],
      ['oficio', 'bw', 2.0], ['oficio', 'color', 5.0],
      ['tabloide', 'bw', 3.0], ['tabloide', 'color', 7.0],
      ['foto', 'color', 12.0],
    ]
    seedPrices.forEach(([paper, type, price]) => {
      db.run('INSERT INTO print_prices (paper_type, print_type, price_per_page) VALUES (?, ?, ?)', [paper, type, price])
    })
    console.log('[DB] Precios de impresión inicializados')
  }

  // Configuración del negocio
  const configCount = (db.exec("SELECT COUNT(*) FROM business_config")[0]?.values[0][0] as number) || 0
  if (configCount === 0) {
    const defaultConfig = [
      ['business_name', 'Mi Papelería'],
      ['business_address', 'Dirección del negocio'],
      ['business_phone', '000-000-0000'],
      ['business_email', ''],
      ['ticket_footer', 'Gracias por su compra'],
    ]
    defaultConfig.forEach(([key, value]) => {
      db.run('INSERT OR IGNORE INTO business_config (key, value) VALUES (?, ?)', [key, value])
    })
    console.log('[DB] Configuración inicial del negocio')
  }

  // Categorías por defecto
  const catCount = (db.exec("SELECT COUNT(*) FROM categories")[0]?.values[0][0] as number) || 0
  if (catCount === 0) {
    const defaultCats = ['Papelería', 'Material de Oficina', 'Cuadernos', 'Útiles Escolares', 'Otros']
    defaultCats.forEach(cat => db.run('INSERT INTO categories (name) VALUES (?)', [cat]))
    console.log('[DB] Categorías por defecto creadas')
  }
}
