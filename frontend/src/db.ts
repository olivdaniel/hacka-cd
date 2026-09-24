import Dexie, { type Table } from 'dexie'
import { initialRecords, type RecordItem } from './data'

class PortalDatabase extends Dexie {
  records!: Table<RecordItem, string>

  constructor() {
    super('portal-registros')
    this.version(1).stores({ records: 'id' })
  }
}

export const db = new PortalDatabase()

export async function seedRecords() {
  if ((await db.records.count()) === 0) await db.records.bulkAdd(initialRecords)
  return db.records.toArray()
}
