// N.b.: importing this module is an entrypoint that imports the Cordova
// environment dependencies. Specifically `./filesystems/cordova`. You can
// use the alternative entrypoint in `./test` to avoid importing this.
import { DbName } from '../../util/types'

import {
  ElectricNamespace,
  ElectrifyOptions,
  electrify as baseElectrify
} from '../../electric/index'

import { BundleMigrator } from '../../migrators/bundle'
import { EventNotifier } from '../../notifiers/event'
import { globalRegistry } from '../../satellite/registry'
import { ElectricConfig } from '../../satellite/config'

import { DatabaseAdapter } from './adapter'
import { Database, ElectricDatabase, ElectrifiedDatabase } from './database'
import { MockSocketFactory } from '../../sockets/mock'

export { DatabaseAdapter, ElectricDatabase }
export type { Database, ElectrifiedDatabase }

export const electrify = async (db: Database, config: ElectricConfig, opts?: ElectrifyOptions): Promise<ElectrifiedDatabase> => {
  const dbName: DbName = db.dbname

  const adapter = opts?.adapter || new DatabaseAdapter(db)
  const migrator = opts?.migrator || new BundleMigrator(adapter, config.migrations)
  const notifier = opts?.notifier || new EventNotifier(dbName)
  const socketFactory = opts?.socketFactory || new MockSocketFactory() // TODO
  const registry = opts?.registry || globalRegistry

  const namespace = new ElectricNamespace(adapter, notifier)
  const electric = new ElectricDatabase(db, namespace)

  const electrified = await baseElectrify(dbName, db, electric, adapter, migrator, notifier, socketFactory, registry, config)
  return electrified as unknown as ElectrifiedDatabase
}