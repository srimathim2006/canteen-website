# 🍽️ Campus Canteen Ordering System (Production & Hosting Ready)

A full-stack, responsive web application for college canteens with role-based access for **Students**, **Faculty**, and **Administrators**. Built with vanilla frontend technologies, Node.js, Express, and Node's built-in `node:sqlite` database.

---

## 🚀 Quick Start (Local Development)

Open your terminal (PowerShell or Command Prompt) in the project root folder and execute:

```bash
# 1. Install dependencies (express, express-session, bcryptjs)
npm install

# 2. Start the canteen server
npm start
```

### 🌐 Open in Browser
Navigate to:
```
http://localhost:3000
```

---

## ☁️ Online Hosting & Environment Variables

The project is fully configured for hosting platforms like **Render**, **Railway**, **Heroku**, **DigitalOcean**, or VPS/Nginx:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | The network port the server listens on (auto-provided by hosting platforms). |
| `DB_PATH` | `canteen.db` | Path to the SQLite database file (can point to persistent mount disk). |
| `SESSION_SECRET` | *(built-in fallback)* | Random cryptographic string used to sign session cookies. |
| `NODE_ENV` | `development` | Set to `production` in live environments. |

### 🔒 HTTPS & Reverse Proxy Support
- `app.set('trust proxy', 1)` is enabled in `server.js` so session cookies work seamlessly behind HTTPS reverse proxies.
- Session cookie uses `secure: 'auto'` and `sameSite: 'lax'`, enabling secure HTTPS cookies in production while working smoothly on local `http://localhost:3000`.

---

## 👥 Default Accounts & Self-Registration

### Default Admin Account
Upon first run, the database seeds an administrator account:
- **Username**: `admin`
- **Initial Password**: `admin123`
- **Access**: Full Admin Dashboard (`admin.html`)

### 📝 Self-Registration for Students & Faculty
- Real students and faculty can register their own accounts directly on `/register.html`.
- **Security Guardrail**: Admin accounts **cannot** be created from the registration page (attempts are rejected with HTTP 400).
- Passwords are encrypted with `bcryptjs` (10 salt rounds).

---

## 🔑 How to Change the Admin Password

You have two easy ways to change the administrator password:

### Method 1: Directly in the Admin Web Portal (Recommended)
1. Log into `http://localhost:3000` as **admin**.
2. Click the **"🔑 Change Password"** button in the top navigation bar.
3. Enter your current password, your new password (minimum 6 characters), confirm the new password, and click **Update Password**.

### Method 2: From the Terminal / CLI (Server Host)
If you are managing the server or need to reset the admin password from the command line, run:
```bash
node change-admin-password.js <your_new_password>
```
*Example:*
```bash
node change-admin-password.js mySecretPass2026!
```

---

## 🛠️ Tech Stack & Constraints

- **Frontend**: Plain HTML5, CSS3, Vanilla JavaScript (Zero external frontend frameworks).
- **Backend**: Node.js (v22+ or v26) + Express.js.
- **Database**: SQLite using Node's native built-in `node:sqlite` module (`DatabaseSync`) &mdash; **no external compilation, node-gyp, or native C++ modules needed**.
- **Security & Sessions**:
  - `bcryptjs` for one-way password hashing.
  - `express-session` for secure server-side session management.
- **Engines**: Configured for `"node": ">=22"`.

---

## ✨ Features Breakdown

### 1. Student & Faculty Experience (`menu.html`)
- **Self-Registration**: Dedicated `register.html` page with role selection.
- **Category Navigation**: 3 large interactive cards for **Breakfast**, **Lunch**, and **Snacks & Drinks**.
- **Food List**: Shows item name, price, food emoji, and live `🟢 Available` / `🔴 Not Available` badges.
- **Interactive Order Modal**: Live quantity selector (`+` and `−`), real-time price calculation, and one-click order placement.
- **Server-Side Price Calculation**: Order totals are computed on the server from database prices &mdash; client-side price tampering is completely prevented!
- **Personal Order History**: "My Orders" modal displays order ID, items, quantity, total, date/time, order status (`Pending` / `Done`), and payment status (`Paid` / `Not Paid`).

### 2. Administrator Portal (`admin.html`)
- **Live Summary Cards**:
  - 📦 Total Orders count.
  - ⏳ Pending Orders count.
  - 💰 Total Earnings calculated exclusively from **Paid** orders.
- **Food Menu Management**: Add item, edit name and price, delete item (with order safeguards), and one-click availability toggle.
- **Live Order Management**: View all customer orders with customer role badges, live status update dropdowns (`Pending` ↔ `Done`, `Not Paid` ↔ `Paid`), and filter pills (`All`, `Pending`, `Done`, `Paid`, `Not Paid`).
- **Admin Password Management**: In-app modal to change password securely with old password verification.

---

## 📁 Project Structure

```
canteen_website/
├── .gitignore                   # Ignores node_modules, canteen.db, and .env
├── package.json                 # Project dependencies & engines (node >=22)
├── server.js                    # Express server, session auth, HTTPS proxy & REST APIs
├── database.js                  # node:sqlite connection, table initialization & DB_PATH support
├── change-admin-password.js     # Terminal script to reset/change admin password
├── test_canteen.js              # Automated 24-point test suite
├── README.md                    # Project overview & hosting instructions
├── VIVA_NOTES.md                # File walkthrough and viva Q&As
└── public/                      # Static frontend files served via Express
    ├── index.html               # Clean login page with link to register
    ├── register.html            # Registration page for Students & Faculty
    ├── menu.html                # Student & Faculty ordering dashboard
    ├── admin.html               # Admin management portal
    ├── style.css                # Responsive orange & white theme styles
    └── script.js                # Client-side routing, modals & API requests
```

---

## 🧪 Automated Testing

Run the full 24-point test suite:
```bash
node test_canteen.js
```
Validates registration, admin registration blocking, session cookies, server-side price protection, password changing, availability toggling, and RBAC permission barriers.
