# 🎓 College Canteen Ordering System - Viva & Exam Guide

This document is prepared to help you understand every component of this project and confidently explain it in your lab viva, project review, or practical examination.

---

## 📂 File-by-File Explanation

### 1. `package.json`
- **What it is**: The configuration file for the Node.js project.
- **Key Contents**:
  - `name`, `version`, `scripts` (`npm start` runs `node server.js`).
  - `"engines": { "node": ">=22" }`: Informs deployment platforms (Render, Railway, etc.) that modern Node.js is required for built-in `node:sqlite`.
  - `dependencies`: Strictly the three required libraries:
    - `express`: Lightweight web framework for routing and handling HTTP requests.
    - `express-session`: Manages server-side sessions and client cookies.
    - `bcryptjs`: Secure library for hashing passwords with random salts.
- **Viva point**: Explain that `node:sqlite` does not need to be in `dependencies` because it is built directly into Node.js runtime (Node v22+ and v26).

---

### 2. `database.js`
- **What it is**: The database setup and initialization module.
- **How it works**:
  - Uses `const { DatabaseSync } = require('node:sqlite');` to connect to SQLite.
  - Dynamically reads the database path from `process.env.DB_PATH` or defaults to `canteen.db`.
  - Enables foreign key support via `PRAGMA foreign_keys = ON;`.
  - Runs `CREATE TABLE IF NOT EXISTS` for:
    - `users`: `id`, `username`, `password` (hashed), `role` (`admin`, `faculty`, `student`).
    - `foods`: `id`, `name`, `price`, `category`, `available` (`1` or `0`).
    - `orders`: `id`, `user_id`, `food_id`, `quantity`, `total`, `order_time`, `order_status`, `payment_status`.
  - Automatically seeds default users (`admin/admin123`, `faculty/faculty123`, `student/student123`) and 15 starter food items (5 Breakfast, 5 Lunch, 5 Snacks) if tables are empty.

---

### 3. `server.js`
- **What it is**: The Express backend web server and REST API.
- **Core Responsibilities**:
  1. **Serves Static Files**: `app.use(express.static('public'))` automatically serves HTML, CSS, and JS files from the `public` directory.
  2. **Production Hosting Config**:
     - `app.set('trust proxy', 1)`: Tells Express it is behind a reverse proxy (Nginx, Render, Railway, Cloudflare), allowing secure cookies to function over HTTPS.
     - `process.env.PORT || 3000`: Allows cloud hosts to dynamically inject their own port.
     - `process.env.SESSION_SECRET`: Allows secret key injection from environment variables.
  3. **Registration Endpoint (`POST /api/register`)**:
     - Allows Students and Faculty to sign up.
     - Explicitly blocks any attempt to create an `admin` role account from the public form.
  4. **Session Authentication**: Configures `express-session` with `cookie.secure: 'auto'` and `sameSite: 'lax'`.
  5. **Security Middleware**:
     - `requireLogin`: Checks if `req.session.user` exists. Returns `401 Unauthorized` if not logged in.
     - `requireAdmin`: Checks if `req.session.user.role === 'admin'`. Returns `403 Forbidden` if a student or faculty attempts to access admin routes.
  6. **Admin Password Update (`PUT /api/admin/change-password`)**:
     - Verifies old password using `bcrypt.compareSync`, hashes the new password with `bcryptjs`, and updates the database.
  7. **Order Total Protection**: When an order is placed (`POST /api/orders`), the server looks up the item's true price in the database (`food.price * qty`) rather than trusting any price sent from the client browser.

---

### 4. `change-admin-password.js`
- **What it is**: A standalone command-line utility for server administrators.
- **Why it is useful**: If an administrator forgets their password or wants to set an initial production secret via the hosting terminal/SSH, they can simply run:
  ```bash
  node change-admin-password.js <newPassword>
  ```
  It queries the database, hashes the new password using bcrypt, and updates the admin record immediately.

---

### 5. `public/index.html` (Login Page)
- **What it is**: The clean authentication screen for all users.
- **Key Elements**:
  - Role selection buttons (Student, Faculty, Admin).
  - Username and password input fields.
  - Error banner for incorrect credentials or role mismatch.
  - Link to the account registration page for new students and teachers.

---

### 6. `public/register.html` (Self-Registration Page)
- **What it is**: The sign-up portal for students and faculty.
- **Security Design**:
  - Only offers **Student** and **Faculty** roles.
  - No Admin option is shown or allowed.
  - Validates username length and confirms matching passwords before sending to the server.

---

### 7. `public/menu.html` (Student & Faculty Page)
- **What it is**: The ordering dashboard for students and teachers.
- **Key Elements**:
  - Top navigation bar showing current username and role badge.
  - **Category Cards**: 3 large clickable cards for Breakfast, Lunch, and Snacks.
  - **Food Item Grid**: Displays item name, emoji, price in ₹, and `🟢 Available` or `🔴 Not Available` badge.
  - **Order Modal**: Popup showing item details, a quantity controller (`+` and `−`), and a live total price.
  - **My Orders Modal**: Shows the logged-in user's order history with status badges (`Pending`/`Done` and `Paid`/`Not Paid`).

---

### 8. `public/admin.html` (Admin Dashboard)
- **What it is**: The management portal for canteen staff.
- **Key Elements**:
  - **3 Summary Cards**: Real-time counters for Total Orders, Pending Orders, and Total Earnings (summed only from Paid orders).
  - **Manage Food**: Add new food modal, category filter tabs, edit name/price, delete items, and one-click toggle for availability.
  - **Manage Orders**: Table showing student/faculty orders with status dropdowns to switch `Pending` ↔ `Done` and `Not Paid` ↔ `Paid`. Filter pills (`All`, `Pending`, `Done`, `Paid`, `Not Paid`).
  - **Change Password**: Dedicated modal allowing the admin to update their password.

---

### 9. `public/style.css`
- **What it is**: Responsive stylesheet implementing the orange and white canteen theme.
- **Design Choices**:
  - CSS Variables (`--primary: #f97316`) for cohesive branding.
  - Flexbox and CSS Grid for layout adaptability across mobile phones, tablets, and laptops.
  - Big tactile buttons and badges with clear color psychology (green for Done/Paid, orange for Pending, red for Not Paid/Out of stock).

---

### 10. `public/script.js`
- **What it is**: Vanilla JavaScript controlling UI interactions and API requests.
- **Key Functions**:
  - `initRegisterPage()`: Validates inputs, handles password confirmation, calls `POST /api/register`.
  - `submitChangePassword()`: Admin password update submission to `PUT /api/admin/change-password`.
  - `fetch()` calls with `async/await` for clean asynchronous code.
  - `escapeHtml()`: Helper function to sanitize user strings and prevent Cross-Site Scripting (XSS).
  - `showToast()`: Animated pop-up notifications for user actions.

---

## ❓ Top 15 Viva Questions & Model Answers

### Q1: Why did you block admin registration from the registration page?
> **Answer:** In real-world enterprise applications, administrative privileges should never be self-assigned through public sign-up forms. If any user could register as an admin, they could access financial records, alter food prices, and delete database records. Admin accounts must either be pre-seeded by database migration or created through an internal administration script.

### Q2: Why did you use `app.set('trust proxy', 1)`?
> **Answer:** In production environments (such as Render, Railway, AWS, or Nginx), web apps sit behind a reverse proxy that terminates SSL/TLS (HTTPS). When a request reaches Express, the immediate connection appears as HTTP. Setting `trust proxy` tells Express to trust the `X-Forwarded-Proto` header sent by the proxy, ensuring that HTTPS session cookies (`cookie.secure`) and client IP tracking work correctly.

### Q3: What is the benefit of `process.env.PORT` and `process.env.DB_PATH`?
> **Answer:** Online cloud platforms assign random dynamic ports to web services upon container startup via the `PORT` environment variable. Hardcoding port 3000 would cause deployment failure. Similarly, `DB_PATH` allows the SQLite file to be placed on a persistent volume mount disk so database data is not lost when cloud containers restart.

### Q4: How does the admin password change mechanism prevent unauthorized resets?
> **Answer:** The admin password update API requires authentication (`requireAdmin`) and demands the `currentPassword`. The server verifies the current password with `bcrypt.compareSync` before hashing the new password with bcrypt and committing it to SQLite.

### Q5: What does `.gitignore` do and why should `canteen.db` and `node_modules` be ignored?
> **Answer:** `.gitignore` prevents unnecessary or sensitive files from being pushed to version control (e.g., GitHub). `node_modules` contains thousands of downloaded dependencies that should be installed via `npm install`. `canteen.db` contains runtime application state and user data that should remain on the server, not in a public Git repository.

### Q6: Why did you use `node:sqlite` instead of `sqlite3` or `better-sqlite3`?
> **Answer:** `node:sqlite` is a native, built-in module in modern Node.js versions (v22+ and v26). External packages like `sqlite3` require compiling C++ native binaries during `npm install` (via `node-gyp` or Python), which frequently fails during cloud deployments. `node:sqlite` runs out-of-the-box with zero native compile issues.

### Q7: Why is password hashing necessary, and why use `bcryptjs`?
> **Answer:** Storing plain text passwords in a database is a major security flaw. If the database is compromised, attackers gain instant access. `bcryptjs` uses a one-way hashing algorithm combined with a "salt" (random string) and multiple computation rounds. Even if two users have the same password, their hashes are completely different.

### Q8: How does session-based authentication work in this application?
> **Answer:** When a user logs in via `POST /api/login`, the server verifies their credentials and creates a session object on the server. `express-session` assigns a unique Session ID and sends it back to the browser inside a secure HTTP cookie (`connect.sid`). On subsequent requests, the browser automatically sends this cookie, allowing the server to identify the logged-in user.

### Q9: Why must the order total be calculated on the server and not on the client?
> **Answer:** A malicious user can open Chrome DevTools and alter client-side JavaScript or HTTP request payloads to send a fake total (e.g., ordering 10 items for ₹1). To prevent price tampering, our server only accepts the `food_id` and `quantity`, fetches the official price from the database, and calculates:  
`total = food.price * quantity`.

### Q10: How is Role-Based Access Control (RBAC) enforced?
> **Answer:** RBAC is enforced on the server using middleware functions. For example, before executing admin actions, the `requireAdmin` middleware checks:  
`if (req.session.user.role !== 'admin') return res.status(403);`.  
Even if a student attempts to trigger an admin API directly via Postman or `curl`, the server blocks them with HTTP 403 Forbidden.

### Q11: What are SQL Prepared Statements and why did you use them?
> **Answer:** Prepared statements (e.g., `db.prepare('SELECT * FROM users WHERE username = ?')`) pre-compile the SQL query structure and treat user inputs strictly as data rather than executable code. This completely protects the application against SQL Injection attacks.

### Q12: How does the Admin Earnings calculation work?
> **Answer:** The admin earnings summary only counts revenue from orders where `payment_status = 'Paid'`. The SQL query is:  
`SELECT COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN total ELSE 0 END), 0) AS totalEarnings FROM orders;`.  
This ensures unpaid orders do not falsely inflate the revenue numbers.

### Q13: What prevents an admin from deleting a food item that has past order records?
> **Answer:** If an item with past orders is deleted, database foreign key constraints would either throw an error or cause order history records to become invalid. In `server.js`, we check `SELECT COUNT(*) FROM orders WHERE food_id = ?`. If orders exist, we notify the admin to toggle the item's availability to "Not Available" instead of deleting it.

### Q14: Explain the common HTTP status codes returned by your API:
> **Answer:**
> - `200 OK`: Request succeeded (e.g., fetched foods, login successful).
> - `201 Created`: Resource successfully created (e.g., user registered, order placed).
> - `400 Bad Request`: Invalid or missing input (e.g., password mismatch, username taken, admin registration blocked).
> - `401 Unauthorized`: User is not logged in.
> - `403 Forbidden`: User lacks required role permissions (e.g., student calling admin route).
> - `404 Not Found`: Requested resource or ID not found.
> - `500 Internal Server Error`: Server-side exception.

### Q15: What does the "engines" field in package.json do?
> **Answer:** The `"engines": { "node": ">=22" }` field specifies the runtime version required by the application. Cloud hosting providers (such as Render, Vercel, Railway, and Heroku) read this field during automated build pipelines to automatically provision Node.js version 22 or higher so that built-in `node:sqlite` is available.
