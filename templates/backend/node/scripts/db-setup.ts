// Prepara o usuário que a API usa no dia a dia (APP_DB_USER): cria se não existir e
// concede só o necessário. Ele não é dono das tabelas, por isso o RLS vale para ele.
// Roda depois de `prisma migrate deploy`, com a conexão do dono (MIGRATION_DATABASE_URL).
// Idempotente: pode rodar a cada subida sem apagar nada.
import 'dotenv/config';
import pg from 'pg';

const ownerUrl = process.env.MIGRATION_DATABASE_URL;
const appUser = process.env.APP_DB_USER;
const appPassword = process.env.APP_DB_PASSWORD;

if (!ownerUrl || !appUser || !appPassword) {
  process.stderr.write('db-setup: defina MIGRATION_DATABASE_URL, APP_DB_USER e APP_DB_PASSWORD\n');
  process.exit(1);
}

const client = new pg.Client({ connectionString: ownerUrl });
await client.connect();

try {
  const exists = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [appUser]);
  const verb = exists.rowCount ? 'ALTER' : 'CREATE';
  const { rows } = await client.query<{ sql: string }>(
    `SELECT format('${verb} ROLE %I LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD %L', $1::text, $2::text) AS sql`,
    [appUser, appPassword],
  );
  await client.query(rows[0]!.sql);

  const { rows: idents } = await client.query<{ role: string; db: string }>(
    'SELECT quote_ident($1) AS role, quote_ident(current_database()) AS db',
    [appUser],
  );
  const { role, db } = idents[0]!;

  await client.query(`GRANT CONNECT ON DATABASE ${db} TO ${role}`);
  await client.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
  await client.query(`GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO ${role}`);
  await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
  // Auditoria e históricos são somente acréscimo; a tabela de controle do Prisma é só das migrations.
  for (const table of ['audit_events', 'store_history', 'store_change_request_events']) {
    await client.query(`REVOKE UPDATE ON ${table} FROM ${role}`);
  }
  await client.query(`REVOKE ALL ON _prisma_migrations FROM ${role}`);
  // Linhas de associação (marcar e desmarcar serviço, PBM, campo de seção livre) são apagadas
  // de verdade: são técnicas, sem histórico próprio (o histórico da loja registra a mudança).
  await client.query(`GRANT DELETE ON store_catalog_entries, store_free_fields TO ${role}`);

  process.stdout.write(`db-setup: usuário ${appUser} pronto\n`);
} finally {
  await client.end();
}
