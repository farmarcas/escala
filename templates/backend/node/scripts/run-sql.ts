// Executa arquivos SQL (dados de exemplo em seeds/) com a conexão do dono do banco.
// Uso: tsx scripts/run-sql.ts seeds/*.sql
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const ownerUrl = process.env.MIGRATION_DATABASE_URL;
const files = process.argv.slice(2).sort();

if (!ownerUrl || files.length === 0) {
  process.stderr.write('run-sql: defina MIGRATION_DATABASE_URL e informe os arquivos .sql\n');
  process.exit(1);
}

const client = new pg.Client({ connectionString: ownerUrl });
await client.connect();

try {
  for (const file of files) {
    await client.query(await readFile(file, 'utf8'));
    process.stdout.write(`run-sql: ${file} aplicado\n`);
  }
} finally {
  await client.end();
}
