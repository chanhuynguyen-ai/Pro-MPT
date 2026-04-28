import { rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dbPath = path.join(root, 'prisma', 'dev.db');
const storagePath = path.join(root, 'storage');

await rm(dbPath, { force: true }).catch(() => {});
await rm(storagePath, { recursive: true, force: true }).catch(() => {});

console.log('Local database and storage were removed.');
console.log('Run: npm run prisma:dbpush && npm run prisma:seed');
