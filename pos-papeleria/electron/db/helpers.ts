import { Database } from 'sql.js'

// Helpers para trabajar con sql.js de forma más cómoda

export function queryAll(db: Database, sql: string, params: any[] = []): any[] {
  try {
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const rows: any[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    stmt.free()
    return rows
  } catch (e) {
    console.error('[DB queryAll error]', sql, e)
    return []
  }
}

export function queryFirst(db: Database, sql: string, params: any[] = []): any | undefined {
  const results = queryAll(db, sql, params)
  return results[0]
}

export function run(db: Database, sql: string, params: any[] = []): number {
  db.run(sql, params)
  // Obtener el último ID insertado
  const result = db.exec("SELECT last_insert_rowid() as id")
  return result[0]?.values[0][0] as number || 0
}

/**
 * Ejecuta varias operaciones como una unidad atomica. Si alguna falla, SQLite
 * revierte todos los cambios hechos por la funcion de trabajo.
 */
export function transaction<T>(db: Database, work: () => T): T {
  db.run('BEGIN IMMEDIATE TRANSACTION')

  try {
    const result = work()
    db.run('COMMIT')
    return result
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch (rollbackError) {
      console.error('[DB transaction rollback error]', rollbackError)
    }
    throw error
  }
}
export function count(db: Database, sql: string, params: any[] = []): number {
  const result = db.exec(sql, params)
  return (result[0]?.values[0][0] as number) || 0
}
