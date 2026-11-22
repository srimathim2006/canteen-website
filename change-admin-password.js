/**
 * change-admin-password.js - CLI Tool to Reset/Change Admin Password
 * -----------------------------------------------------------------
 * This script allows canteen administrators or server operators to change
 * or reset the administrator password directly in the database from the terminal.
 * 
 * Usage:
 *   node change-admin-password.js <new_password>
 * 
 * Example:
 *   node change-admin-password.js superSecret2026!
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const newPassword = process.argv[2];

if (!newPassword || newPassword.trim().length < 6) {
  console.log('===============================================================');
  console.log(' Campus Canteen - Admin Password Reset Utility');
  console.log('===============================================================');
  console.log('Usage: node change-admin-password.js <new_password>');
  console.log('Requirement: Password must be at least 6 characters long.\n');
  console.log('Example:');
  console.log('  node change-admin-password.js myNewPass2026');
  console.log('===============================================================');
  process.exit(1);
}

// Support DB_PATH environment variable (default: canteen.db)
const rawDbPath = process.env.DB_PATH || 'canteen.db';
const dbPath = path.isAbsolute(rawDbPath) ? rawDbPath : path.join(__dirname, rawDbPath);

try {
  console.log(`Connecting to database at: ${dbPath}`);
  const db = new DatabaseSync(dbPath);

  // Look for admin user
  const adminUser = db.prepare('SELECT id, username FROM users WHERE role = ?').get('admin');

  if (!adminUser) {
    console.error('Error: No user with role "admin" found in the database.');
    process.exit(1);
  }

  // Hash new password using bcryptjs
  const hashedPassword = bcrypt.hashSync(newPassword.trim(), 10);

  // Update in database
  const updateStmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
  updateStmt.run(hashedPassword, adminUser.id);

  console.log('---------------------------------------------------------------');
  console.log(`✅ Success! Admin password for "${adminUser.username}" has been updated.`);
  console.log('You can now log in with the new password.');
  console.log('---------------------------------------------------------------');
} catch (err) {
  console.error('Failed to update admin password:', err.message);
  process.exit(1);
}
