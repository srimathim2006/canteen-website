/**
 * server.js - Main Express Server & Backend API
 * -----------------------------------------------------------------
 * This file configures the Express web server, session authentication,
 * and RESTful API endpoints for the College Canteen Ordering Website.
 * It serves static frontend files from the "public" directory.
 * 
 * Production & Hosting Features:
 * - process.env.PORT (default: 3000)
 * - app.set('trust proxy', 1) for HTTPS reverse proxies
 * - process.env.SESSION_SECRET with secure cookie settings
 * - User registration endpoint for students and faculty
 * - Admin password update endpoint
 */

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('node:path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'canteen-secure-session-key-2026';

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================

// 1. Trust first reverse proxy (Nginx, Render, Railway, Heroku, Cloudflare)
// This allows secure HTTPS cookies to work properly behind reverse proxies
app.set('trust proxy', 1);

// 2. Parse incoming JSON request bodies
app.use(express.json());

// 3. Configure user session with express-session
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true, // Necessary when behind a reverse proxy
    cookie: {
      httpOnly: true, // Prevents client-side scripts from reading cookie
      secure: 'auto', // Automatically uses Secure flag when request is HTTPS
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 // Session lasts for 24 hours
    }
  })
);

// 4. Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// AUTHENTICATION HELPER MIDDLEWARES
// ==========================================

/**
 * Ensures user is logged in before accessing protected routes
 */
function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }
  next();
}

/**
 * Ensures user is logged in AND has the 'admin' role
 * Returns 403 Forbidden for students and faculty
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required.' });
  }
  next();
}

// ==========================================
// AUTHENTICATION & USER MANAGEMENT ROUTES
// ==========================================

/**
 * POST /api/register
 * Allows new Students and Faculty to register an account.
 * Note: Admin accounts CANNOT be created from this endpoint!
 */
app.post('/api/register', (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required.' });
  }

  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
  }

  // Security: Only allow student or faculty registration
  if (role !== 'student' && role !== 'faculty') {
    return res.status(400).json({ error: 'Admin accounts cannot be created from the registration page.' });
  }

  // Check if username already exists in database
  const checkUser = db.prepare('SELECT id FROM users WHERE username = ?');
  const existingUser = checkUser.get(trimmedUsername);

  if (existingUser) {
    return res.status(400).json({ error: 'Username is already taken. Please choose another username.' });
  }

  // Hash password using bcryptjs (salt rounds = 10)
  const hashedPassword = bcrypt.hashSync(password, 10);

  const insertUser = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
  const result = insertUser.run(trimmedUsername, hashedPassword, role);

  res.status(201).json({
    success: true,
    message: 'Account created successfully! You can now log in.',
    userId: result.lastInsertRowid
  });
});

/**
 * POST /api/login
 * Validates role, username, and password using bcrypt
 */
app.post('/api/login', (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required.' });
  }

  // Find user in database by username
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username.trim());

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Verify that selected role matches the user's role in database
  if (user.role !== role) {
    return res.status(401).json({ error: `User is not registered as ${role}.` });
  }

  // Compare hashed password with entered password
  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Save user details in server-side session
  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role
  };

  res.json({
    success: true,
    message: 'Login successful',
    user: req.session.user
  });
});

/**
 * POST /api/logout
 * Destroys the active session
 */
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out. Please try again.' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

/**
 * GET /api/current-user
 * Returns details of the currently logged-in user
 */
app.get('/api/current-user', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ loggedIn: true, user: req.session.user });
  }
  res.json({ loggedIn: false, user: null });
});

/**
 * PUT /api/admin/change-password
 * Admin only: Changes the admin's password after verifying the current password
 */
app.put('/api/admin/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  // Fetch current admin user
  const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = userStmt.get(req.session.user.id);

  if (!user) {
    return res.status(404).json({ error: 'Admin account not found.' });
  }

  // Verify current password
  const isMatch = bcrypt.compareSync(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  // Hash new password and update in database
  const newHashed = bcrypt.hashSync(newPassword, 10);
  const updateStmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
  updateStmt.run(newHashed, user.id);

  res.json({ success: true, message: 'Admin password changed successfully!' });
});

// ==========================================
// FOOD & MENU API ROUTES
// ==========================================

/**
 * GET /api/foods
 * Returns all food items or filtered by category (Breakfast, Lunch, Snacks)
 */
app.get('/api/foods', (req, res) => {
  const { category } = req.query;

  if (category) {
    const stmt = db.prepare('SELECT * FROM foods WHERE category = ? ORDER BY id ASC');
    const foods = stmt.all(category);
    return res.json(foods);
  }

  const stmt = db.prepare('SELECT * FROM foods ORDER BY category, id ASC');
  const foods = stmt.all();
  res.json(foods);
});

// ==========================================
// STUDENT & FACULTY ORDERS API ROUTES
// ==========================================

/**
 * POST /api/orders
 * Creates a new order for the logged-in student or faculty member.
 * IMPORTANT: Calculates the order total on the server using database price.
 */
app.post('/api/orders', requireLogin, (req, res) => {
  const { food_id, quantity } = req.body;
  const qty = parseInt(quantity, 10);

  if (!food_id || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Valid food item and quantity (at least 1) are required.' });
  }

  // Fetch food item from database to verify availability and actual price
  const foodStmt = db.prepare('SELECT * FROM foods WHERE id = ?');
  const food = foodStmt.get(food_id);

  if (!food) {
    return res.status(404).json({ error: 'Food item not found.' });
  }

  if (food.available !== 1) {
    return res.status(400).json({ error: 'Sorry, this item is currently Not Available.' });
  }

  // Server-side calculation of total price (never trust client total)
  const total = food.price * qty;

  // Format order time nicely
  const orderTime = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, food_id, quantity, total, order_time, order_status, payment_status)
    VALUES (?, ?, ?, ?, ?, 'Pending', 'Not Paid')
  `);

  const result = insertOrder.run(
    req.session.user.id,
    food.id,
    qty,
    total,
    orderTime
  );

  res.status(201).json({
    success: true,
    message: 'Order placed successfully!',
    orderId: result.lastInsertRowid,
    total: total
  });
});

/**
 * GET /api/my-orders
 * Returns only the logged-in user's own orders
 */
app.get('/api/my-orders', requireLogin, (req, res) => {
  const stmt = db.prepare(`
    SELECT 
      o.id,
      o.food_id,
      f.name AS food_name,
      f.category AS food_category,
      o.quantity,
      o.total,
      o.order_time,
      o.order_status,
      o.payment_status
    FROM orders o
    JOIN foods f ON o.food_id = f.id
    WHERE o.user_id = ?
    ORDER BY o.id DESC
  `);

  const orders = stmt.all(req.session.user.id);
  res.json(orders);
});

// ==========================================
// ADMIN ONLY API ROUTES (Protected with 403)
// ==========================================

/**
 * GET /api/summary
 * Admin dashboard statistics: total orders, pending orders, total earnings from Paid orders
 */
app.get('/api/summary', requireAdmin, (req, res) => {
  const summaryStmt = db.prepare(`
    SELECT 
      COUNT(*) AS totalOrders,
      COALESCE(SUM(CASE WHEN order_status = 'Pending' THEN 1 ELSE 0 END), 0) AS pendingOrders,
      COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN total ELSE 0 END), 0) AS totalEarnings
    FROM orders
  `);

  const summary = summaryStmt.get();
  res.json(summary);
});

/**
 * GET /api/orders
 * Returns all orders with user and food details, with optional filtering
 */
app.get('/api/orders', requireAdmin, (req, res) => {
  const { filter } = req.query;

  let query = `
    SELECT 
      o.id,
      o.user_id,
      u.username,
      u.role,
      o.food_id,
      f.name AS food_name,
      f.category AS food_category,
      o.quantity,
      o.total,
      o.order_time,
      o.order_status,
      o.payment_status
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN foods f ON o.food_id = f.id
  `;

  const params = [];

  if (filter === 'Pending' || filter === 'Done') {
    query += ` WHERE o.order_status = ?`;
    params.push(filter);
  } else if (filter === 'Paid' || filter === 'Not Paid') {
    query += ` WHERE o.payment_status = ?`;
    params.push(filter);
  }

  query += ` ORDER BY o.id DESC`;

  const stmt = db.prepare(query);
  const orders = stmt.all(...params);
  res.json(orders);
});

/**
 * PUT /api/orders/:id/status
 * Updates order status (Pending / Done)
 */
app.put('/api/orders/:id/status', requireAdmin, (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  if (status !== 'Pending' && status !== 'Done') {
    return res.status(400).json({ error: 'Status must be Pending or Done.' });
  }

  const stmt = db.prepare('UPDATE orders SET order_status = ? WHERE id = ?');
  const result = stmt.run(status, orderId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  res.json({ success: true, message: 'Order status updated successfully.' });
});

/**
 * PUT /api/orders/:id/payment
 * Updates payment status (Paid / Not Paid)
 */
app.put('/api/orders/:id/payment', requireAdmin, (req, res) => {
  const orderId = req.params.id;
  const { payment_status } = req.body;

  if (payment_status !== 'Paid' && payment_status !== 'Not Paid') {
    return res.status(400).json({ error: 'Payment status must be Paid or Not Paid.' });
  }

  const stmt = db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?');
  const result = stmt.run(payment_status, orderId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  res.json({ success: true, message: 'Payment status updated successfully.' });
});

/**
 * POST /api/foods
 * Admin: Add a new food item
 */
app.post('/api/foods', requireAdmin, (req, res) => {
  const { name, price, category, available } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required.' });
  }

  const validCategories = ['Breakfast', 'Lunch', 'Snacks'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Category must be Breakfast, Lunch, or Snacks.' });
  }

  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number.' });
  }

  const isAvailable = available === 0 || available === false ? 0 : 1;

  const stmt = db.prepare('INSERT INTO foods (name, price, category, available) VALUES (?, ?, ?, ?)');
  const result = stmt.run(name.trim(), numPrice, category, isAvailable);

  res.status(201).json({
    success: true,
    message: 'Food item added successfully.',
    id: result.lastInsertRowid
  });
});

/**
 * PUT /api/foods/:id
 * Admin: Edit name and price of a food item
 */
app.put('/api/foods/:id', requireAdmin, (req, res) => {
  const foodId = req.params.id;
  const { name, price, category } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required.' });
  }

  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number.' });
  }

  let stmt;
  let result;

  if (category) {
    const validCategories = ['Breakfast', 'Lunch', 'Snacks'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category.' });
    }
    stmt = db.prepare('UPDATE foods SET name = ?, price = ?, category = ? WHERE id = ?');
    result = stmt.run(name.trim(), numPrice, category, foodId);
  } else {
    stmt = db.prepare('UPDATE foods SET name = ?, price = ? WHERE id = ?');
    result = stmt.run(name.trim(), numPrice, foodId);
  }

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Food item not found.' });
  }

  res.json({ success: true, message: 'Food item updated successfully.' });
});

/**
 * PUT /api/foods/:id/availability
 * Admin: Toggle Available (1) / Not Available (0)
 */
app.put('/api/foods/:id/availability', requireAdmin, (req, res) => {
  const foodId = req.params.id;
  const { available } = req.body;

  const isAvailable = available === 1 || available === true ? 1 : 0;

  const stmt = db.prepare('UPDATE foods SET available = ? WHERE id = ?');
  const result = stmt.run(isAvailable, foodId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Food item not found.' });
  }

  res.json({
    success: true,
    message: `Food item availability set to ${isAvailable === 1 ? 'Available' : 'Not Available'}.`,
    available: isAvailable
  });
});

/**
 * DELETE /api/foods/:id
 * Admin: Delete a food item
 */
app.delete('/api/foods/:id', requireAdmin, (req, res) => {
  const foodId = req.params.id;

  // Check if item has order records
  const checkOrders = db.prepare('SELECT COUNT(*) AS count FROM orders WHERE food_id = ?');
  const orderCount = checkOrders.get(foodId).count;

  if (orderCount > 0) {
    return res.status(400).json({
      error: 'Cannot delete this food item because it has existing order records. Toggle its availability to "Not Available" instead.'
    });
  }

  const stmt = db.prepare('DELETE FROM foods WHERE id = ?');
  const result = stmt.run(foodId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Food item not found.' });
  }

  res.json({ success: true, message: 'Food item deleted successfully.' });
});

// ==========================================
// FALLBACK TO LOGIN PAGE
// ==========================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(` Campus Canteen Server is running!`);
    console.log(` Port: ${PORT}`);
    console.log(` Open in browser: http://localhost:${PORT}`);
    console.log(`===============================================`);
  });
}

module.exports = app;
