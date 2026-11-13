/**
 * scripts/delete-customer-orders.js
 *
 * Utility script to safely delete customer orders from the MongoDB database.
 * Supports taking a backup (both MongoDB collection & local JSON file)
 * and optionally cleaning up associated return records.
 *
 * Usage:
 *   node scripts/delete-customer-orders.js --dry-run
 *   node scripts/delete-customer-orders.js --backup --confirm
 *   node scripts/delete-customer-orders.js --backup --include-returns --confirm
 *   node scripts/delete-customer-orders.js --confirm (no backup)
 */

const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Auto-load .env if present
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const doBackup = args.includes('--backup');
const includeReturns = args.includes('--include-returns');
const isConfirmed = args.includes('--confirm');

async function main() {
  const mongoUrl = process.env.MONGO_DIRECT_URL || process.env.MONGO_URL || process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'userPortal';

  if (!mongoUrl) {
    console.error('Error: MONGO_URL or MONGODB_URI not found in environment.');
    process.exit(1);
  }

  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(dbName);

  try {
    const ordersCol = db.collection('orders');
    const returnsCol = db.collection('returns');

    const totalOrders = await ordersCol.countDocuments();
    const totalReturns = await returnsCol.countDocuments();

    console.log(`[DB] Connected to database: "${dbName}"`);
    console.log(`[DB] Current orders in collection: ${totalOrders}`);
    console.log(`[DB] Current returns in collection: ${totalReturns}`);

    if (totalOrders === 0 && (!includeReturns || totalReturns === 0)) {
      console.log('No orders to delete. Exiting.');
      return;
    }

    if (isDryRun) {
      console.log('\n--- DRY RUN SUMMARY ---');
      console.log(`Orders to be deleted: ${totalOrders}`);
      if (includeReturns) {
        console.log(`Returns to be deleted: ${totalReturns}`);
      } else {
        console.log(`Returns to be preserved: ${totalReturns}`);
      }
      console.log('Backup enabled:', doBackup ? 'YES' : 'NO');
      console.log('No database modifications were made.');
      return;
    }

    if (!isConfirmed) {
      console.error('\n[SAFETY ERROR] Deletion halted! Pass "--confirm" to execute this destructive operation.');
      process.exit(1);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // 1. Perform Backup if requested
    if (doBackup) {
      console.log('\n[1/3] Creating backups...');
      const allOrders = await ordersCol.find({}).toArray();
      const backupOrdersColName = `orders_backup_${timestamp}`;
      
      if (allOrders.length > 0) {
        await db.collection(backupOrdersColName).insertMany(allOrders);
        console.log(` -> Created MongoDB backup collection: "${backupOrdersColName}" (${allOrders.length} records)`);
      }

      // Local JSON file backup
      const backupDir = path.join(__dirname, '..', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupFilePath = path.join(backupDir, `orders_backup_${timestamp}.json`);
      fs.writeFileSync(backupFilePath, JSON.stringify(allOrders, null, 2));
      console.log(` -> Saved local JSON backup: ${backupFilePath}`);

      if (includeReturns && totalReturns > 0) {
        const allReturns = await returnsCol.find({}).toArray();
        const backupReturnsColName = `returns_backup_${timestamp}`;
        await db.collection(backupReturnsColName).insertMany(allReturns);
        const returnsBackupFile = path.join(backupDir, `returns_backup_${timestamp}.json`);
        fs.writeFileSync(returnsBackupFile, JSON.stringify(allReturns, null, 2));
        console.log(` -> Created returns backup collection: "${backupReturnsColName}" & file: ${returnsBackupFile}`);
      }
    }

    // 2. Delete Orders
    console.log('\n[2/3] Deleting orders from "orders" collection...');
    const deleteOrdersResult = await ordersCol.deleteMany({});
    console.log(` -> Successfully deleted ${deleteOrdersResult.deletedCount} orders.`);

    // 3. Delete Returns (if requested)
    if (includeReturns) {
      console.log('\n[3/3] Deleting returns from "returns" collection...');
      const deleteReturnsResult = await returnsCol.deleteMany({});
      console.log(` -> Successfully deleted ${deleteReturnsResult.deletedCount} returns.`);
    } else {
      console.log('\n[3/3] Skipped returns collection (preserved).');
    }

    // Verification
    const remainingOrders = await ordersCol.countDocuments();
    console.log(`\n--- VERIFICATION ---`);
    console.log(`Remaining orders in DB: ${remainingOrders}`);
    if (includeReturns) {
      const remainingReturns = await returnsCol.countDocuments();
      console.log(`Remaining returns in DB: ${remainingReturns}`);
    }
    console.log('Operation completed successfully.');

  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
