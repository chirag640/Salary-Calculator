/**
 * Create MongoDB indexes for authentication system
 * Run with: node scripts/create-auth-indexes.js
 */

require('dotenv').config({ path: '.env.local' })
const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/time-tracker'

async function createIndexes() {
  console.log('🔧 Creating authentication system indexes...\n')
  
  let client
  try {
    // Connect to MongoDB
    client = await MongoClient.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')
    
    const db = client.db()
    
    // Users collection indexes
    console.log('\n📚 Creating users indexes...')
    await db.collection('users').createIndex(
      { email: 1 }, 
      { unique: true, name: 'email_unique' }
    )
    console.log('  ✓ email (unique)')
    
    await db.collection('users').createIndex(
      { googleId: 1 }, 
      { sparse: true, name: 'googleId_sparse' }
    )
    console.log('  ✓ googleId (sparse)')
    
    // Auth OTPs collection indexes
    console.log('\n📚 Creating auth_otps indexes...')
    await db.collection('auth_otps').createIndex(
      { email: 1, purpose: 1 },
      { name: 'email_purpose' }
    )
    console.log('  ✓ email + purpose')
    
    await db.collection('auth_otps').createIndex(
      { expiresAt: 1 }, 
      { expireAfterSeconds: 0, name: 'ttl_expiry' }
    )
    console.log('  ✓ expiresAt (TTL auto-cleanup)')
    
    await db.collection('auth_otps').createIndex(
      { used: 1, expiresAt: 1 },
      { name: 'used_expiry' }
    )
    console.log('  ✓ used + expiresAt')
    
    // OAuth integrations collection indexes
    console.log('\n📚 Creating oauth_integrations indexes...')
    await db.collection('oauth_integrations').createIndex(
      { userId: 1, provider: 1 },
      { unique: true, name: 'userId_provider_unique' }
    )
    console.log('  ✓ userId + provider (unique)')
    
    await db.collection('oauth_integrations').createIndex(
      { providerId: 1, provider: 1 },
      { name: 'providerId_provider' }
    )
    console.log('  ✓ providerId + provider')
    
    await db.collection('oauth_integrations').createIndex(
      { email: 1 },
      { name: 'email' }
    )
    console.log('  ✓ email')
    
    // Display created indexes
    console.log('\n📊 Verifying indexes...')
    const collections = ['users', 'auth_otps', 'oauth_integrations']
    
    for (const collectionName of collections) {
      const indexes = await db.collection(collectionName).indexes()
      console.log(`\n${collectionName}:`)
      indexes.forEach(idx => {
        const keys = Object.keys(idx.key).map(k => `${k}: ${idx.key[k]}`).join(', ')
        const options = []
        if (idx.unique) options.push('unique')
        if (idx.sparse) options.push('sparse')
        if (idx.expireAfterSeconds !== undefined) options.push('TTL')
        const optStr = options.length ? ` [${options.join(', ')}]` : ''
        console.log(`  • ${idx.name}: { ${keys} }${optStr}`)
      })
    }
    
    console.log('\n✅ All indexes created successfully!')
    console.log('\n📋 Summary:')
    console.log('  • users: 3 indexes (including _id)')
    console.log('  • auth_otps: 4 indexes (including _id, with TTL)')
    console.log('  • oauth_integrations: 4 indexes (including _id)')
    console.log('\n💡 Note: TTL index will automatically delete expired OTPs')
    
  } catch (error) {
    console.error('\n❌ Error creating indexes:', error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('\n🔌 Disconnected from MongoDB')
    }
  }
}

// Run if called directly
if (require.main === module) {
  createIndexes()
    .then(() => {
      console.log('\n✨ Done!\n')
      process.exit(0)
    })
    .catch(err => {
      console.error('\n❌ Fatal error:', err)
      process.exit(1)
    })
}

module.exports = { createIndexes }
