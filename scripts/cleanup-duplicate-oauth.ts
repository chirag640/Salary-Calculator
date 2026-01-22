/**
 * Cleanup Duplicate OAuth Integrations Script
 *
 * Finds and removes duplicate oauth_integrations records.
 * Keeps the most recent record for each provider + providerId combination.
 *
 * Run with: npx ts-node scripts/cleanup-duplicate-oauth.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { MongoClient, ObjectId } from "mongodb";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

interface OAuthIntegration {
  _id: ObjectId;
  userId: ObjectId;
  provider: string;
  providerId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

async function cleanupDuplicates() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("❌ MONGODB_URI environment variable not set");
    console.error("   Set it in .env.local");
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB...");

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
  });

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("timetracker");
    const collection = db.collection<OAuthIntegration>("oauth_integrations");

    // Find all documents
    const allDocs = await collection.find({}).toArray();
    console.log(`📊 Found ${allDocs.length} total OAuth integrations\n`);

    // Group by provider + providerId
    const grouped = new Map<string, OAuthIntegration[]>();

    for (const doc of allDocs) {
      const key = `${doc.provider}:${doc.providerId}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(doc);
    }

    // Find duplicates
    const duplicates = Array.from(grouped.entries()).filter(
      ([, docs]) => docs.length > 1,
    );

    if (duplicates.length === 0) {
      console.log("✅ No duplicates found! Database is clean.");
      return;
    }

    console.log(`🔍 Found ${duplicates.length} duplicate provider IDs:\n`);

    let totalRemoved = 0;

    for (const [key, docs] of duplicates) {
      const [provider, providerId] = key.split(":");
      console.log(`📦 ${provider} - ${providerId}`);
      console.log(`   Total records: ${docs.length}`);

      // Sort by updatedAt (most recent first)
      docs.sort((a, b) => {
        const dateA = a.updatedAt?.getTime() ?? a.createdAt.getTime();
        const dateB = b.updatedAt?.getTime() ?? b.createdAt.getTime();
        return dateB - dateA;
      });

      // Keep the first (most recent), remove the rest
      const toKeep = docs[0];
      const toRemove = docs.slice(1);

      console.log(
        `   ✅ Keeping: ${toKeep._id} (updated: ${toKeep.updatedAt ?? toKeep.createdAt})`,
      );

      for (const doc of toRemove) {
        console.log(
          `   ❌ Removing: ${doc._id} (updated: ${doc.updatedAt ?? doc.createdAt})`,
        );
        await collection.deleteOne({ _id: doc._id });
        totalRemoved++;
      }

      console.log();
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Removed ${totalRemoved} duplicate records`);
    console.log(`   Kept ${duplicates.length} most recent records\n`);

    // Verify final count
    const finalCount = await collection.countDocuments();
    console.log(`📊 Final count: ${finalCount} OAuth integrations\n`);

    // Now try to create the unique index
    console.log("🔧 Attempting to create unique index...");
    try {
      await collection.createIndex(
        { provider: 1, providerId: 1 },
        {
          name: "idx_provider_id",
          unique: true,
          background: true,
        },
      );
      console.log("✅ Successfully created idx_provider_id unique index!");
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Failed to create index: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

// Run if called directly
cleanupDuplicates();
