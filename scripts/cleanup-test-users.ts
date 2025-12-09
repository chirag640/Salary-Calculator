/**
 * Script to clean up test users and pending OTPs
 * Run with: npx tsx scripts/cleanup-test-users.ts
 */

import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment variables");
  process.exit(1);
}

async function cleanup() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    // Delete unverified users (users created but never verified)
    const usersResult = await db.collection("users").deleteMany({
      isVerified: false,
    });
    console.log(`🗑️  Deleted ${usersResult.deletedCount} unverified users`);

    // Delete all pending OTPs
    const otpsResult = await db.collection("auth_otps").deleteMany({
      used: false,
    });
    console.log(`🗑️  Deleted ${otpsResult.deletedCount} pending OTPs`);

    // Optional: Delete specific test email
    const testEmail = "collegework1910@gmail.com";
    const testUserResult = await db.collection("users").deleteMany({
      email: testEmail,
    });
    if (testUserResult.deletedCount > 0) {
      console.log(`🗑️  Deleted test user: ${testEmail}`);
    }

    const testOtpResult = await db.collection("auth_otps").deleteMany({
      email: testEmail,
    });
    if (testOtpResult.deletedCount > 0) {
      console.log(`🗑️  Deleted OTPs for: ${testEmail}`);
    }

    console.log("✅ Cleanup completed successfully");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("👋 Disconnected from MongoDB");
  }
}

cleanup();
