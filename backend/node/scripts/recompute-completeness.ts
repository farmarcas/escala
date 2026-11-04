// Recalcula o preenchimento de todas as lojas (depois dos dados de exemplo, que entram por SQL).
// Usa exatamente a regra da API (refreshCompleteness), com a conexão do dono do banco. Idempotente.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { refreshCompleteness } from '../src/modules/store-page/store-page.repository.js';

const ownerUrl = process.env.MIGRATION_DATABASE_URL;
if (!ownerUrl) {
  process.stderr.write('recompute-completeness: defina MIGRATION_DATABASE_URL\n');
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg(ownerUrl) });
try {
  const stores = await db.store.findMany({ where: { deletedAt: null }, select: { id: true } });
  for (const store of stores) await refreshCompleteness(db, store.id);
  process.stdout.write(`recompute-completeness: ${stores.length} lojas\n`);
} finally {
  await db.$disconnect();
}
