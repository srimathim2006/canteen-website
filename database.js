/**
 * database.js - SQLite Database Setup and Operations
 * ----------------------------------------------------
 * This file manages the SQLite database for the College Canteen Website.
 * It uses Node.js's built-in "node:sqlite" module (DatabaseSync),
 * creates tables if they don't exist, and seeds initial sample data.
 * 
 * Supports DB_PATH environment variable for online hosting (default: canteen.db).
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const bcrypt = require('bcryptjs');

// Database file path: from DB_PATH env variable or default canteen.db in root directory
const rawDbPath = process.env.DB_PATH || 'canteen.db';
const dbPath = path.isAbsolute(rawDbPath) ? rawDbPath : path.join(__dirname, rawDbPath);

console.log(`[Database] Connecting to SQLite at: ${dbPath}`);
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initialize Tables and Starter Data
 */
function initDatabase() {
  // 1. Create Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'faculty', 'student'))
    );
  `);

  // 2. Create Foods Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Breakfast', 'Lunch', 'Snacks')),
      available INTEGER NOT NULL DEFAULT 1 CHECK(available IN (0, 1))
    );
  `);

  // 3. Create Orders Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      food_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      total REAL NOT NULL,
      order_time TEXT NOT NULL,
      order_status TEXT NOT NULL DEFAULT 'Pending' CHECK(order_status IN ('Pending', 'Done')),
      payment_status TEXT NOT NULL DEFAULT 'Not Paid' CHECK(payment_status IN ('Paid', 'Not Paid')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
    );
  `);

  // Seed Initial Users (if table is empty)
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('[Database] Seeding initial users...');
    const insertUser = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    
    // Hash passwords using bcryptjs (salt rounds = 10)
    const adminHash = bcrypt.hashSync('admin123', 10);
    const facultyHash = bcrypt.hashSync('faculty123', 10);
    const studentHash = bcrypt.hashSync('student123', 10);

    insertUser.run('admin', adminHash, 'admin');
    insertUser.run('faculty', facultyHash, 'faculty');
    insertUser.run('student', studentHash, 'student');
    console.log('[Database] Starter users added: admin, faculty, student');
  }

  // Seed Initial Foods (if table is empty)
  const foodCount = db.prepare('SELECT COUNT(*) as count FROM foods').get().count;
  if (foodCount === 0) {
    console.log('[Database] Seeding initial food menu...');
    const insertFood = db.prepare('INSERT INTO foods (name, price, category, available) VALUES (?, ?, ?, ?)');

    const starterFoods = [
      // Breakfast
      { name: 'Idli', price: 30, category: 'Breakfast' },
      { name: 'Dosa', price: 50, category: 'Breakfast' },
      { name: 'Poori', price: 40, category: 'Breakfast' },
      { name: 'Upma', price: 30, category: 'Breakfast' },
      { name: 'Vada', price: 20, category: 'Breakfast' },

      // Lunch
      { name: 'Veg Biryani', price: 90, category: 'Lunch' },
      { name: 'Chicken Biryani', price: 130, category: 'Lunch' },
      { name: 'Chicken Rice', price: 100, category: 'Lunch' },
      { name: 'Curd Rice', price: 60, category: 'Lunch' },
      { name: 'Meals', price: 80, category: 'Lunch' },

      // Snacks
      { name: 'Samosa', price: 15, category: 'Snacks' },
      { name: 'Veg Puff', price: 20, category: 'Snacks' },
      { name: 'Veg Burger', price: 40, category: 'Snacks' },
      { name: 'Tea', price: 10, category: 'Snacks' },
      { name: 'Coffee', price: 15, category: 'Snacks' }
    ];

    for (const food of starterFoods) {
      insertFood.run(food.name, food.price, food.category, 1);
    }
    console.log('[Database] Starter food items added successfully.');
  }
}

// Run table initialization
initDatabase();

// Export the database instance for use in server.js
module.exports = db;
