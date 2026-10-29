import { loadEnvConfig } from '@next/env'
import { closeDb, getDb } from '../src/lib/db'
import { migrateDatabase, seedDatabase } from '../src/lib/db-setup'

loadEnvConfig(process.cwd())

async function main() {
  const command = process.argv[2]
  if (!['check', 'migrate', 'seed', 'setup'].includes(command)) throw new Error('Comando de banco inválido.')
  const db = getDb()
  if (command === 'check') {
    await db.query('SELECT 1')
    const migrated = (await db.query("SELECT to_regclass('schema_migrations') AS name")).rows[0].name
    if (!migrated) console.log('Conexão PostgreSQL OK. Execute npm run db:setup para criar as tabelas e os dados iniciais.')
    else {
      const { rows } = await db.query('SELECT name FROM schema_migrations ORDER BY name')
      console.log(`Conexão PostgreSQL OK. Migrações aplicadas: ${rows.length}.`)
    }
  }
  if (command === 'migrate' || command === 'setup') {
    const applied = await migrateDatabase(db)
    console.log(applied.length ? `Migrações aplicadas: ${applied.join(', ')}.` : 'Banco atualizado; nenhuma migração pendente.')
  }
  if (command === 'seed' || command === 'setup') {
    await seedDatabase(db)
    console.log('Administrador e prêmios iniciais configurados. Senhas e estoques existentes foram preservados.')
  }
}

main().catch((error) => {
  console.error(`Falha na configuração do banco: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
  process.exitCode = 1
}).finally(closeDb)
