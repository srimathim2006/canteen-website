/**
 * test_canteen.js - Automated Test Suite for College Canteen Website
 * Tests:
 * 1. Student and Faculty registration
 * 2. Blocking Admin registration from public API (security test)
 * 3. Duplicate registration handling
 * 4. Login with newly registered user
 * 5. Admin password change via web API
 * 6. Admin login with new password
 * 7. CLI change-admin-password.js script
 * 8. Server-side price calculation & order placement
 * 9. RBAC permission checks (403 forbidden for students accessing admin endpoints)
 * 10. Summary statistics & payment updates
 * 11. Food item availability toggling and CRUD
 */

const http = require('node:http');
const { execSync } = require('node:child_process');
const app = require('./server');

let currentPort = 3000;

// Helper to make HTTP requests with cookie handling
function makeRequest(options, postData = null, cookie = '') {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: currentPort,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      const setCookie = res.headers['set-cookie'];
      let returnedCookie = cookie;
      if (setCookie && setCookie.length > 0) {
        returnedCookie = setCookie[0].split(';')[0];
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          cookie: returnedCookie,
          body: parsed
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log(' Starting Automated College Canteen Test Suite (24 Test Cases)');
  console.log('===============================================================');

  let studentCookie = '';
  let adminCookie = '';
  let testOrderId = null;
  let testFoodId = null;

  // -------------------------------------------------------------
  // SECTION 1: REGISTRATION TESTS
  // -------------------------------------------------------------
  console.log('\n--- Section 1: User Registration Tests ---');

  // Test 1: Register as student
  console.log('\nTest 1: Register new student account (alex_student)');
  const regStudent = await makeRequest(
    { path: '/api/register', method: 'POST' },
    { username: 'alex_student', password: 'alexPassword123', role: 'student' }
  );
  console.log('Status:', regStudent.statusCode, 'Body:', regStudent.body);
  if (regStudent.statusCode === 201 && regStudent.body.success) {
    console.log('PASS: Student account registered successfully');
  } else throw new Error('Test 1 failed');

  // Test 2: Register as faculty
  console.log('\nTest 2: Register new faculty account (prof_sharma)');
  const regFaculty = await makeRequest(
    { path: '/api/register', method: 'POST' },
    { username: 'prof_sharma', password: 'facultyPassword123', role: 'faculty' }
  );
  console.log('Status:', regFaculty.statusCode, 'Body:', regFaculty.body);
  if (regFaculty.statusCode === 201 && regFaculty.body.success) {
    console.log('PASS: Faculty account registered successfully');
  } else throw new Error('Test 2 failed');

  // Test 3: Block Admin Registration
  console.log('\nTest 3: Attempt to register an admin account (should be rejected with 400)');
  const regAdminBlocked = await makeRequest(
    { path: '/api/register', method: 'POST' },
    { username: 'hacker_admin', password: 'adminHackedPassword123', role: 'admin' }
  );
  console.log('Status:', regAdminBlocked.statusCode, 'Body:', regAdminBlocked.body);
  if (regAdminBlocked.statusCode === 400) {
    console.log('PASS: Admin registration from public API is strictly blocked!');
  } else throw new Error('Test 3 failed: Admin registration was not blocked!');

  // Test 4: Duplicate Username Rejected
  console.log('\nTest 4: Attempt to register with duplicate username (alex_student)');
  const regDuplicate = await makeRequest(
    { path: '/api/register', method: 'POST' },
    { username: 'alex_student', password: 'anotherPassword123', role: 'student' }
  );
  console.log('Status:', regDuplicate.statusCode, 'Body:', regDuplicate.body);
  if (regDuplicate.statusCode === 400) {
    console.log('PASS: Duplicate username correctly rejected');
  } else throw new Error('Test 4 failed');

  // -------------------------------------------------------------
  // SECTION 2: AUTHENTICATION & LOGIN TESTS
  // -------------------------------------------------------------
  console.log('\n--- Section 2: Authentication Tests ---');

  // Test 5: Login with newly registered student
  console.log('\nTest 5: Login with newly registered student (alex_student)');
  const alexLogin = await makeRequest(
    { path: '/api/login', method: 'POST' },
    { username: 'alex_student', password: 'alexPassword123', role: 'student' }
  );
  console.log('Status:', alexLogin.statusCode, 'Body:', alexLogin.body);
  if (alexLogin.statusCode === 200 && alexLogin.body.user.username === 'alex_student') {
    studentCookie = alexLogin.cookie;
    console.log('PASS: Registered student logged in successfully');
  } else throw new Error('Test 5 failed');

  // Test 6: Verify Session
  console.log('\nTest 6: Verify session of alex_student');
  const me = await makeRequest({ path: '/api/current-user' }, null, studentCookie);
  if (me.body.loggedIn && me.body.user.role === 'student') {
    console.log('PASS: Session verified for alex_student');
  } else throw new Error('Test 6 failed');

  // Test 7: Wrong password login
  console.log('\nTest 7: Wrong password rejection');
  const badLogin = await makeRequest(
    { path: '/api/login', method: 'POST' },
    { username: 'alex_student', password: 'wrongPassword', role: 'student' }
  );
  if (badLogin.statusCode === 401) {
    console.log('PASS: Wrong password rejected (401)');
  } else throw new Error('Test 7 failed');

  // -------------------------------------------------------------
  // SECTION 3: MENU & SERVER-SIDE PRICE CALCULATION
  // -------------------------------------------------------------
  console.log('\n--- Section 3: Ordering & Price Integrity Tests ---');

  // Test 8: Get Lunch foods
  console.log('\nTest 8: Fetch lunch items');
  const lunchRes = await makeRequest({ path: '/api/foods?category=Lunch' }, null, studentCookie);
  const biryani = lunchRes.body.find((f) => f.name === 'Veg Biryani');
  console.log('Found Veg Biryani at price:', biryani.price);
  if (biryani && biryani.price === 90) {
    console.log('PASS: Food items retrieved successfully');
  } else throw new Error('Test 8 failed');

  // Test 9: Place order (3 x Veg Biryani @ ₹90 = ₹270)
  console.log('\nTest 9: Place order with fake client price to verify server-side calculation');
  const orderRes = await makeRequest(
    { path: '/api/orders', method: 'POST' },
    { food_id: biryani.id, quantity: 3, fake_client_price: 5 },
    studentCookie
  );
  console.log('Order response:', orderRes.body);
  if (orderRes.statusCode === 201 && orderRes.body.total === 270) {
    testOrderId = orderRes.body.orderId;
    console.log('PASS: Server calculated total from database price (3 * ₹90 = ₹270)');
  } else throw new Error('Test 9 failed');

  // Test 10: Check My Orders
  console.log('\nTest 10: Fetch my-orders for alex_student');
  const myOrders = await makeRequest({ path: '/api/my-orders' }, null, studentCookie);
  const orderItem = myOrders.body.find((o) => o.id === testOrderId);
  if (orderItem && orderItem.food_name === 'Veg Biryani' && orderItem.total === 270) {
    console.log('PASS: My Orders shows the newly placed order');
  } else throw new Error('Test 10 failed');

  // Test 11: Security check - Student blocked from Admin API
  console.log('\nTest 11: Student attempting to access /api/summary (must be 403 Forbidden)');
  const adminBlockCheck = await makeRequest({ path: '/api/summary' }, null, studentCookie);
  if (adminBlockCheck.statusCode === 403) {
    console.log('PASS: Student blocked with 403 Forbidden');
  } else throw new Error('Test 11 failed');

  // -------------------------------------------------------------
  // SECTION 4: ADMIN OPERATIONS & PASSWORD CHANGE
  // -------------------------------------------------------------
  console.log('\n--- Section 4: Admin Dashboard & Password Change Tests ---');

  // Test 12: Admin login with initial password (admin123)
  console.log('\nTest 12: Admin login with initial password (admin123)');
  const adminLogin = await makeRequest(
    { path: '/api/login', method: 'POST' },
    { username: 'admin', password: 'admin123', role: 'admin' }
  );
  if (adminLogin.statusCode === 200 && adminLogin.body.user.role === 'admin') {
    adminCookie = adminLogin.cookie;
    console.log('PASS: Admin logged in');
  } else throw new Error('Test 12 failed');

  // Test 13: Admin Change Password via API with wrong current password
  console.log('\nTest 13: Admin change password with wrong current password (should fail 400)');
  const badPassChange = await makeRequest(
    { path: '/api/admin/change-password', method: 'PUT' },
    { currentPassword: 'wrongAdminPassword', newPassword: 'newAdminPassword2026' },
    adminCookie
  );
  if (badPassChange.statusCode === 400) {
    console.log('PASS: Wrong current password rejected');
  } else throw new Error('Test 13 failed');

  // Test 14: Admin Change Password via API with correct password
  console.log('\nTest 14: Admin change password with correct current password');
  const goodPassChange = await makeRequest(
    { path: '/api/admin/change-password', method: 'PUT' },
    { currentPassword: 'admin123', newPassword: 'newAdminPassword2026' },
    adminCookie
  );
  console.log('Response:', goodPassChange.body);
  if (goodPassChange.body.success) {
    console.log('PASS: Admin password updated via Web API');
  } else throw new Error('Test 14 failed');

  // Test 15: Verify old admin password no longer works
  console.log('\nTest 15: Old admin password (admin123) must be rejected');
  const oldLoginCheck = await makeRequest(
    { path: '/api/login', method: 'POST' },
    { username: 'admin', password: 'admin123', role: 'admin' }
  );
  if (oldLoginCheck.statusCode === 401) {
    console.log('PASS: Old admin password rejected');
  } else throw new Error('Test 15 failed');

  // Test 16: Login with new admin password (newAdminPassword2026)
  console.log('\nTest 16: Login with new admin password (newAdminPassword2026)');
  const newAdminLogin = await makeRequest(
    { path: '/api/login', method: 'POST' },
    { username: 'admin', password: 'newAdminPassword2026', role: 'admin' }
  );
  if (newAdminLogin.statusCode === 200 && newAdminLogin.body.user.role === 'admin') {
    adminCookie = newAdminLogin.cookie;
    console.log('PASS: Logged in with updated admin password!');
  } else throw new Error('Test 16 failed');

  // Test 17: Update order status to Done
  console.log('\nTest 17: Admin marks order as Done');
  const orderStatusUpdate = await makeRequest(
    { path: `/api/orders/${testOrderId}/status`, method: 'PUT' },
    { status: 'Done' },
    adminCookie
  );
  if (orderStatusUpdate.body.success) {
    console.log('PASS: Order status updated to Done');
  } else throw new Error('Test 17 failed');

  // Test 18: Update order payment to Paid
  console.log('\nTest 18: Admin marks order payment as Paid');
  const paymentUpdate = await makeRequest(
    { path: `/api/orders/${testOrderId}/payment`, method: 'PUT' },
    { payment_status: 'Paid' },
    adminCookie
  );
  if (paymentUpdate.body.success) {
    console.log('PASS: Payment status updated to Paid');
  } else throw new Error('Test 18 failed');

  // Test 19: Check Summary Earnings
  console.log('\nTest 19: Verify summary shows earnings from Paid order');
  const summaryRes = await makeRequest({ path: '/api/summary' }, null, adminCookie);
  console.log('Summary:', summaryRes.body);
  if (summaryRes.body.totalEarnings >= 270) {
    console.log('PASS: Total earnings includes ₹270 from Paid order');
  } else throw new Error('Test 19 failed');

  // Test 20: Admin adds new food item
  console.log('\nTest 20: Admin adds new food item (Cold Coffee)');
  const addFood = await makeRequest(
    { path: '/api/foods', method: 'POST' },
    { name: 'Cold Coffee', category: 'Snacks', price: 35, available: 1 },
    adminCookie
  );
  if (addFood.statusCode === 201 && addFood.body.id) {
    testFoodId = addFood.body.id;
    console.log('PASS: Cold Coffee added with ID:', testFoodId);
  } else throw new Error('Test 20 failed');

  // Test 21: Toggle food availability to 0
  console.log('\nTest 21: Toggle food availability to Not Available (0)');
  const toggleRes = await makeRequest(
    { path: `/api/foods/${testFoodId}/availability`, method: 'PUT' },
    { available: 0 },
    adminCookie
  );
  if (toggleRes.body.available === 0) {
    console.log('PASS: Food marked as Not Available');
  } else throw new Error('Test 21 failed');

  // Test 22: Student attempt to order Not Available item (should be blocked)
  console.log('\nTest 22: Student attempts to order unavailable food');
  const badOrder = await makeRequest(
    { path: '/api/orders', method: 'POST' },
    { food_id: testFoodId, quantity: 1 },
    studentCookie
  );
  if (badOrder.statusCode === 400) {
    console.log('PASS: Order of unavailable item blocked');
  } else throw new Error('Test 22 failed');

  // Test 23: Test CLI script change-admin-password.js
  console.log('\nTest 23: Test CLI script change-admin-password.js');
  try {
    const cliOutput = execSync('node change-admin-password.js finalAdminPass2026', { encoding: 'utf8' });
    console.log(cliOutput.trim());
    console.log('PASS: CLI change-admin-password.js executed successfully');
  } catch (err) {
    throw new Error('Test 23 failed: CLI password change failed: ' + err.message);
  }

  // Test 24: Verify login with CLI-updated admin password
  console.log('\nTest 24: Login with CLI-updated admin password (finalAdminPass2026)');
  const cliAdminLogin = await makeRequest(
    { path: '/api/login', method: 'POST' },
    { username: 'admin', password: 'finalAdminPass2026', role: 'admin' }
  );
  if (cliAdminLogin.statusCode === 200 && cliAdminLogin.body.user.role === 'admin') {
    console.log('PASS: Successfully logged in with CLI-updated password!');
  } else throw new Error('Test 24 failed');

  console.log('\n===============================================================');
  console.log(' ALL 24 AUTOMATED TESTS PASSED SUCCESSFULLY! 🚀');
  console.log('===============================================================');
}

// Start server on an ephemeral port (port 0) on localhost
const server = app.listen(0, '127.0.0.1', async () => {
  currentPort = server.address().port;
  console.log(`[Test Server] Listening on dynamic port ${currentPort}`);
  try {
    await runTests();
  } catch (err) {
    console.error('TEST SUITE FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      process.exit(process.exitCode || 0);
    });
  }
});
