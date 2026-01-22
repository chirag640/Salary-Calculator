/**
 * MongoDB Index Creation Script
 *
 * Creates critical indexes for performance:
 * - timeEntries: userId, date, deletedAt (compound)
 * - users: email + isVerified
 * - auth_otps: email, purpose, expiresAt
 *
 * Run with: npx ts-node scripts/create-indexes.ts
 * Or add to package.json scripts: "db:indexes": "npx ts-node scripts/create-indexes.ts"
 */

import { config } from "dotenv";
import { resolve } from "path";
import { MongoClient } from "mongodb";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

interface IndexDefinition {
  collection: string;
  indexes: Array<{
    keys: Record<string, 1 | -1 | "text">;
    options?: {
      unique?: boolean;
      sparse?: boolean;
      expireAfterSeconds?: number;
      name?: string;
      background?: boolean;
      partialFilterExpression?: Record<string, unknown>;
    };
  }>;
}

const indexDefinitions: IndexDefinition[] = [
  {
    collection: "timeEntries",
    indexes: [
      // Primary query pattern: get user's entries by date (most common)
      {
        keys: { userId: 1, date: -1, deletedAt: 1 },
        options: { name: "idx_user_date_deleted", background: true },
      },
      // Get user's active entries only
      {
        keys: { userId: 1, deletedAt: 1 },
        options: {
          name: "idx_user_active",
          background: true,
          partialFilterExpression: { deletedAt: null },
        },
      },
      // Timer state queries
      {
        keys: { userId: 1, "timer.isRunning": 1 },
        options: {
          name: "idx_user_timer_running",
          background: true,
          sparse: true,
        },
      },
      // Client/project filtering
      {
        keys: { userId: 1, client: 1, project: 1, date: -1 },
        options: { name: "idx_user_client_project", background: true },
      },
      // Pagination cursor index (descending _id for cursor-based pagination)
      {
        keys: { userId: 1, _id: -1 },
        options: { name: "idx_user_id_cursor", background: true },
      },
    ],
  },
  {
    collection: "users",
    indexes: [
      // Login queries (most critical)
      {
        keys: { email: 1, isVerified: 1 },
        options: { name: "idx_email_verified", unique: true, background: true },
      },
      // Google OAuth lookup
      {
        keys: { googleId: 1 },
        options: {
          name: "idx_google_id",
          unique: true,
          sparse: true, // Only index documents that have googleId
          background: true,
        },
      },
      // Password reset token lookup
      {
        keys: { passwordResetToken: 1 },
        options: {
          name: "idx_password_reset",
          sparse: true,
          background: true,
        },
      },
    ],
  },
  {
    collection: "auth_otps",
    indexes: [
      // OTP lookup (primary query pattern)
      {
        keys: { email: 1, purpose: 1, used: 1 },
        options: { name: "idx_email_purpose_used", background: true },
      },
      // Auto-expire old OTPs (TTL index)
      {
        keys: { expiresAt: 1 },
        options: {
          name: "idx_expires_ttl",
          expireAfterSeconds: 0, // Delete when expiresAt passes
          background: true,
        },
      },
      // Cleanup queries
      {
        keys: { email: 1, createdAt: -1 },
        options: { name: "idx_email_created", background: true },
      },
    ],
  },
  {
    collection: "oauth_integrations",
    indexes: [
      // User's integrations
      {
        keys: { userId: 1, provider: 1 },
        options: {
          name: "idx_user_provider",
          unique: true,
          background: true,
        },
      },
      // Provider ID lookup
      {
        keys: { provider: 1, providerId: 1 },
        options: {
          name: "idx_provider_id",
          unique: true,
          background: true,
        },
      },
    ],
  },
  {
    collection: "refresh_tokens",
    indexes: [
      // Token lookup
      {
        keys: { tokenHash: 1 },
        options: { name: "idx_token_hash", unique: true, background: true },
      },
      // User's tokens
      {
        keys: { userId: 1, createdAt: -1 },
        options: { name: "idx_user_tokens", background: true },
      },
      // Auto-expire old tokens
      {
        keys: { expiresAt: 1 },
        options: {
          name: "idx_expires_ttl",
          expireAfterSeconds: 0,
          background: true,
        },
      },
    ],
  },
];

async function createIndexes() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("❌ MONGODB_URI environment variable not set");
    console.error("   Set it in .env.local or pass via command line:");
    console.error(
      "   MONGODB_URI=mongodb+srv://... npx ts-node scripts/create-indexes.ts",
    );
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB...");

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
  });

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("timetracker");

    for (const definition of indexDefinitions) {
      console.log(`\n📁 Collection: ${definition.collection}`);

      const collection = db.collection(definition.collection);

      // Check if collection exists
      const collections = await db
        .listCollections({ name: definition.collection })
        .toArray();
      if (collections.length === 0) {
        console.log(`   ⚠️  Collection doesn't exist yet, creating it...`);
        // Creating collection implicitly by inserting a dummy doc and deleting it
        await collection.insertOne({ _temp: true });
        await collection.deleteOne({ _temp: true });
      }

      // Get existing indexes
      const existingIndexes = await collection.indexes();
      const existingNames = new Set(existingIndexes.map((idx) => idx.name));

      for (const indexDef of definition.indexes) {
        const indexName =
          indexDef.options?.name || Object.keys(indexDef.keys).join("_");

        if (existingNames.has(indexName)) {
          console.log(`   ⏭️  Index "${indexName}" already exists, skipping`);
          continue;
        }

        try {
          await collection.createIndex(indexDef.keys, indexDef.options);
          console.log(`   ✅ Created index "${indexName}"`);
        } catch (error) {
          if (error instanceof Error) {
            console.error(
              `   ❌ Failed to create index "${indexName}": ${error.message}`,
            );
          } else {
            console.error(
              `   ❌ Failed to create index "${indexName}":`,
              error,
            );
          }
        }
      }
    }

    console.log("\n✅ Index creation complete!");

    // Print index statistics
    console.log("\n📊 Index Statistics:");
    for (const definition of indexDefinitions) {
      try {
        const collection = db.collection(definition.collection);
        const documentCount = await collection.countDocuments();
        const indexes = await collection.indexes();

        console.log(`\n   ${definition.collection}:`);
        console.log(`   - Document count: ${documentCount}`);
        console.log(`   - Total indexes: ${indexes.length}`);
        console.log(
          `   - Index names: ${indexes.map((i) => i.name).join(", ")}`,
        );
      } catch (error) {
        console.log(`\n   ${definition.collection}: Collection not accessible`);
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
createIndexes();
