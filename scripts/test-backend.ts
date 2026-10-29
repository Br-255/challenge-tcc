import { loadEnvConfig } from '@next/env'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { Pool } from 'pg'
import { databaseConfig } from '../src/lib/db-config'

loadEnvConfig(process.cwd())

async function main() {
  const url = process.env.TEST_DATABASE_URL
  if (!url || url === process.env.DATABASE_URL) throw new Error('Configure TEST_DATABASE_URL para um banco PostgreSQL de testes separado. DATABASE_URL nunca é usada pelos testes.')
  const schema = `quiz_test_${randomBytes(12).toString('hex')}`
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'test', DATABASE_URL: url,
    DATABASE_SSL: process.env.TEST_DATABASE_SSL || 'true', DATABASE_POOL_MAX: '8',
    EVENT_TIMEZONE: 'America/Sao_Paulo', ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'test-password-isolated',
    QUIZ_TEST_SCHEMA: schema, PGOPTIONS: `-c search_path=${schema}` }
  const pool = new Pool(databaseConfig(env))
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`)
    console.log('Executando testes em schema PostgreSQL temporário e isolado.')
    process.exitCode = await new Promise<number>((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', 'tsx', '--test', 'src/lib/backend.test.ts'], { stdio: 'inherit', env })
      child.once('error', reject)
      child.once('exit', (code) => resolve(code ?? 1))
    })
  } finally {
    // Only the randomly generated schema created above can be removed here.
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    await pool.end()
  }
}

main().catch((error) => {
  console.error(`Falha nos testes: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
  process.exitCode = 1
})
