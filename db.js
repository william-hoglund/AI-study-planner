import mongoose from 'mongoose';

let isConnecting = false;
let isConnected = false;

export async function connectMongo() {
  if (isConnected) return;
  if (isConnecting) {
    // wait until current connect attempt finishes
    await new Promise(resolve => setTimeout(resolve, 50));
    if (isConnected) return;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  try {
    isConnecting = true;
    await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
    isConnected = true;
  } finally {
    isConnecting = false;
  }
}

export function mongoReady() {
  return isConnected || mongoose.connection.readyState === 1;
}
