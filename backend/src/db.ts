import mongoose from 'mongoose';

export async function connectDb(uri: string) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  // Build indexes declared on the schemas (unique order numbers, emails, SKUs).
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
