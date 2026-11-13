import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getFirebaseAdminContext, verifyFirebaseAdminConnectivity } from '../src/lib/firebaseAdmin.ts';
import { migrateDbJsonToFirestore } from '../src/lib/migrateDbToFirestore.ts';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DB_FILE = path.join(ROOT_DIR, 'data', 'db.json');

async function main() {
  const ctx = getFirebaseAdminContext();
  if (!ctx.configured || !ctx.db) {
    console.error(`[Migration Aborted] ${ctx.reason || 'Firebase Admin credentials missing.'}`);
    process.exit(1);
  }

  const probe = await verifyFirebaseAdminConnectivity();
  if (!probe.ok) {
    console.error(`[Migration Aborted] Firestore connectivity failed: ${probe.error}`);
    process.exit(1);
  }

  console.log(
    `[RGD LUXE] Verified authenticated Firestore connection (project=${probe.projectId}, db=${probe.databaseId}).`
  );

  const report = await migrateDbJsonToFirestore({
    db: ctx.db,
    dbFilePath: DB_FILE,
    envAdmin: {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      recoveryEmail: process.env.ADMIN_RECOVERY_EMAIL,
    },
    forceCheckAllCollections: true,
  });

  console.log('[RGD LUXE] Idempotent migration complete (original data/db.json preserved):');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error('[Migration Failed]', err?.message || err);
  process.exit(1);
});
