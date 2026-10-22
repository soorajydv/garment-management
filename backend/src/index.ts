import { env } from './config/env';
import { connectDb } from './db';
import { createApp } from './app';
import { seedIfEmpty } from './seed';

async function main() {
  await connectDb(env.mongoUri);
  if (process.env.SEED_ON_START === 'true') await seedIfEmpty();
  createApp().listen(env.port, () => {
    console.log(`S & S Textiles API listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
