/**
 * public/script.js - Frontend Logic and API Integration
 * -------------------------------------------------------------
 * This file handles all client-side logic for the College Canteen Website:
 * 1. User login, registration, session verification, and logout
 * 2. Food category navigation and dynamic food card rendering
 * 3. Interactive ordering modal with live price calculation
 * 4. User order history retrieval ("My Orders")
 * 5. Admin dashboard: summary stats, food item CRUD, order management,
 *    and secure admin password updates
 */

// ==========================================
// 1. GLOBAL STATE & HELPER FUNCTIONS
// ==========================================

// Selected food item for student/faculty ordering modal
let currentOrderFood = null;
let currentOrderQty = 1;

// Admin food items cache
let adminFoodsList = [];
let adminCurrentCategoryFilter = 'All';
let adminCurrentOrderFilter = 'All';

/**
 * Maps food names and categories to relevant food emojis
 */
function getFoodEmoji(name, category) {
  const lower = name.toLowerCase();
  if (lower.includes('idli')) return '🍚';
  if (lower.includes('dosa')) return '🥞';
  if (lower.includes('poori') || lower.includes('puri')) return '🫓';
  if (lower.includes('upma')) return '🥣';
  if (lower.includes('vada')) return '🍩';
  if (lower.includes('biryani')) return '🍗';
  if (lower.includes('chicken')) return '🍗';
  if (lower.includes('curd rice')) return '🥣';
  if (lower.includes('rice')) return '🍚';
  if (lower.includes('meals') || lower.includes('thali')) return '🍱';
  if (lower.includes('samosa')) return '🥟';
  if (lower.includes('puff')) return '🥐';
  if (lower.includes('burger')) return '🍔';
  if (lower.includes('tea') || lower.includes('chai')) return '🍵';
  if (lower.includes('coffee')) return '☕';

  // Fallbacks by category
  if (category === 'Breakfast') return '🥞';
  if (category === 'Lunch') return '🍛';
  if (category === 'Snacks') return '🥪';
  return '🍽️';
}

/**
 * Displays a toast notification on the bottom-right of the screen
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Automatically remove toast after 3.5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Handle user logout across all pages
 */
async function handleLogout() {
  try {
    const res = await fetch('/api/logout', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      window.location.href = 'index.html';
    }
  } catch (err) {
    console.error('Logout error:', err);
    window.location.href = 'index.html';
  }
}

// ==========================================
// 2. LOGIN PAGE LOGIC (index.html)
// ==========================================

function initLoginPage() {
  const roleButtons = document.querySelectorAll('.role-btn');
  const roleInput = document.getElementById('selected-role');
  const loginForm = document.getElementById('login-form');
  const errorAlert = document.getElementById('error-alert');
  const errorMessage = document.getElementById('error-message');
  const successAlert = document.getElementById('success-alert');

  if (!loginForm) return;

  // Check if redirected after successful registration
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('registered') === '1' && successAlert) {
    successAlert.style.display = 'flex';
  }

  // Handle role button selection
  roleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      roleButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      roleInput.value = btn.dataset.role;
      if (errorAlert) errorAlert.style.display = 'none';
    });
  });

  // Handle Login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorAlert) errorAlert.style.display = 'none';
    if (successAlert) successAlert.style.display = 'none';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const role = roleInput.value;

    const submitBtn = document.getElementById('login-submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Verifying...</span> ⏳';

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed. Please check your details.');
      }

      // Redirect user based on their authenticated role
      if (data.user.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'menu.html';
      }
    } catch (err) {
      errorMessage.textContent = err.message;
      errorAlert.style.display = 'flex';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Log In</span> <span>🚀</span>';
    }
  });
}

// ==========================================
// 3. REGISTRATION PAGE LOGIC (register.html)
// ==========================================

function initRegisterPage() {
  const roleButtons = document.querySelectorAll('.role-btn');
  const roleInput = document.getElementById('register-selected-role');
  const registerForm = document.getElementById('register-form');
  const errorAlert = document.getElementById('error-alert');
  const errorMessage = document.getElementById('error-message');
  const successAlert = document.getElementById('success-alert');

  if (!registerForm) return;

  // Handle role selection (Student or Faculty)
  roleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      roleButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      roleInput.value = btn.dataset.role;
      if (errorAlert) errorAlert.style.display = 'none';
    });
  });

  // Handle registration submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorAlert) errorAlert.style.display = 'none';
    if (successAlert) successAlert.style.display = 'none';

    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const role = roleInput.value;

    if (password !== confirmPassword) {
      errorMessage.textContent = 'Passwords do not match. Please re-enter.';
      errorAlert.style.display = 'flex';
      return;
    }

    const submitBtn = document.getElementById('register-submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creating Account...</span> ⏳';

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      successAlert.style.display = 'flex';
      showToast('🎉 Account registered successfully! Redirecting...', 'success');

      // Redirect to login page after 1.2 seconds
      setTimeout(() => {
        window.location.href = 'index.html?registered=1';
      }, 1200);
    } catch (err) {
      errorMessage.textContent = err.message;
      errorAlert.style.display = 'flex';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Create Account</span> <span>🚀</span>';
    }
  });
}

// ==========================================
// 4. STUDENT & FACULTY MENU PAGE (menu.html)
// ==========================================

async function initMenuPage() {
  // 1. Verify user session
  try {
    const res = await fetch('/api/current-user');
    const data = await res.json();

    if (!data.loggedIn) {
      window.location.href = 'index.html';
      return;
    }

    // Update greeting with username & role
    const user = data.user;
    const badge = document.getElementById('current-username');
    if (badge) {
      badge.textContent = `${user.username} (${user.role.toUpperCase()})`;
    }

    const heading = document.getElementById('welcome-heading');
    if (heading) {
      heading.textContent = `Welcome, ${user.username}! 👋`;
    }
  } catch (err) {
    console.error('Session check failed:', err);
    window.location.href = 'index.html';
  }
}

/**
 * Switch back to the 3 big Category cards view
 */
function showCategoryView() {
  const categoryView = document.getElementById('category-view');
  const foodListView = document.getElementById('food-list-view');

  if (categoryView) categoryView.style.display = 'block';
  if (foodListView) foodListView.style.display = 'none';
}

/**
 * Load food items for a chosen category (Breakfast, Lunch, or Snacks)
 */
async function loadCategoryFoods(category) {
  const categoryView = document.getElementById('category-view');
  const foodListView = document.getElementById('food-list-view');
  const title = document.getElementById('current-category-title');
  const container = document.getElementById('food-items-container');

  if (!container) return;

  // Show food list view, hide category cards
  categoryView.style.display = 'none';
  foodListView.style.display = 'block';

  // Set category title with emoji
  const catEmojis = { Breakfast: '🥞', Lunch: '🍛', Snacks: '🥪' };
  title.innerHTML = `${catEmojis[category] || '🍽️'} ${category} Menu`;

  // Display loading skeleton
  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
      Loading fresh ${category} items... ⏳
    </div>
  `;

  try {
    const res = await fetch(`/api/foods?category=${encodeURIComponent(category)}`);
    const foods = await res.json();

    if (!foods || foods.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <div class="empty-icon">🍽️</div>
          <p>No food items found in this category.</p>
        </div>
      `;
      return;
    }

    // Render food cards
    container.innerHTML = foods
      .map((food) => {
        const isAvail = food.available === 1;
        const emoji = getFoodEmoji(food.name, food.category);

        return `
        <div class="food-card ${isAvail ? 'available' : 'unavailable'}">
          <div class="food-card-top">
            <span class="food-emoji">${emoji}</span>
            <span class="badge ${isAvail ? 'badge-available' : 'badge-unavailable'}">
              ${isAvail ? '🟢 Available' : '🔴 Not Available'}
            </span>
          </div>

          <div class="food-info">
            <h4>${escapeHtml(food.name)}</h4>
            <div class="food-price">₹${food.price.toFixed(2)}</div>
          </div>

          <button 
            type="button"
            class="btn ${isAvail ? 'btn-primary' : 'btn-secondary'} btn-order"
            ${!isAvail ? 'disabled' : ''}
            onclick='openOrderModal(${JSON.stringify(food)})'
          >
            <span>${isAvail ? 'Order Now' : 'Out of Stock'}</span>
            <span>${isAvail ? '⚡' : '🚫'}</span>
          </button>
        </div>
      `;
      })
      .join('');
  } catch (err) {
    console.error('Failed to load foods:', err);
    container.innerHTML = `
      <div class="alert alert-danger" style="grid-column: 1/-1;">
        Failed to load food items. Please check server connection.
      </div>
    `;
  }
}

/**
 * Open the Order Confirmation Modal for a chosen food item
 */
function openOrderModal(food) {
  if (food.available !== 1) {
    showToast('This item is currently Not Available.', 'error');
    return;
  }

  currentOrderFood = food;
  currentOrderQty = 1;

  document.getElementById('order-food-name').textContent = food.name;
  document.getElementById('order-food-emoji').textContent = getFoodEmoji(food.name, food.category);
  document.getElementById('order-food-category').textContent = food.category;
  document.getElementById('order-unit-price').textContent = food.price.toFixed(2);
  document.getElementById('order-quantity-display').textContent = '1';
  document.getElementById('order-live-total').textContent = food.price.toFixed(2);

  const modal = document.getElementById('order-modal');
  if (modal) modal.classList.add('active');
}

/**
 * Close Order Modal
 */
function closeOrderModal() {
  const modal = document.getElementById('order-modal');
  if (modal) modal.classList.remove('active');
  currentOrderFood = null;
  currentOrderQty = 1;
}

/**
 * Quantity Controller (+ and -) with live price update
 */
function incrementQty() {
  if (currentOrderQty < 20) {
    currentOrderQty++;
    updateOrderSummary();
  }
}

function decrementQty() {
  if (currentOrderQty > 1) {
    currentOrderQty--;
    updateOrderSummary();
  }
}

function updateOrderSummary() {
  if (!currentOrderFood) return;
  document.getElementById('order-quantity-display').textContent = currentOrderQty;
  const liveTotal = (currentOrderFood.price * currentOrderQty).toFixed(2);
  document.getElementById('order-live-total').textContent = liveTotal;
}

/**
 * Submit Order to POST /api/orders
 */
async function submitOrder() {
  if (!currentOrderFood) return;

  const confirmBtn = document.getElementById('confirm-order-btn');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<span>Placing Order...</span> ⏳';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_id: currentOrderFood.id,
        quantity: currentOrderQty
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to place order.');
    }

    closeOrderModal();
    showToast(`🎉 Order #${data.orderId} placed successfully! Total: ₹${data.total.toFixed(2)}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<span>Order Now</span> <span>⚡</span>';
  }
}

/**
 * Open "My Orders" Modal & load user's orders
 */
async function openMyOrdersModal() {
  const modal = document.getElementById('my-orders-modal');
  const container = document.getElementById('my-orders-list-container');
  if (!modal || !container) return;

  modal.classList.add('active');
  container.innerHTML = '<div style="text-align:center; padding: 20px;">Loading your orders... ⏳</div>';

  try {
    const res = await fetch('/api/my-orders');
    const orders = await res.json();

    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🧾</div>
          <h3>No Orders Yet</h3>
          <p>You haven't placed any orders today. Pick a category and order something delicious!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Food Item</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Time</th>
              <th>Order Status</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            ${orders
              .map(
                (o) => `
              <tr>
                <td><b>#${o.id}</b></td>
                <td>
                  <span>${getFoodEmoji(o.food_name, o.food_category)}</span>
                  <b>${escapeHtml(o.food_name)}</b>
                </td>
                <td>${o.quantity}</td>
                <td><b>₹${o.total.toFixed(2)}</b></td>
                <td><small style="color:var(--text-muted);">${escapeHtml(o.order_time)}</small></td>
                <td>
                  <span class="badge ${o.order_status === 'Done' ? 'badge-done' : 'badge-pending'}">
                    ${o.order_status === 'Done' ? '✅ Done' : '⏳ Pending'}
                  </span>
                </td>
                <td>
                  <span class="badge ${o.payment_status === 'Paid' ? 'badge-paid' : 'badge-notpaid'}">
                    ${o.payment_status === 'Paid' ? '💳 Paid' : '❌ Not Paid'}
                  </span>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = '<div class="alert alert-danger">Failed to load order history.</div>';
  }
}

function closeMyOrdersModal() {
  const modal = document.getElementById('my-orders-modal');
  if (modal) modal.classList.remove('active');
}

// ==========================================
// 5. ADMIN DASHBOARD LOGIC (admin.html)
// ==========================================

async function initAdminPage() {
  // 1. Verify user is authenticated AND role is admin
  try {
    const res = await fetch('/api/current-user');
    const data = await res.json();

    if (!data.loggedIn || data.user.role !== 'admin') {
      alert('Access Denied: Admin privileges required.');
      window.location.href = 'index.html';
      return;
    }
  } catch (err) {
    window.location.href = 'index.html';
    return;
  }

  // 2. Load dashboard data
  await loadAdminSummary();
  await loadAdminFoods();
  await loadAdminOrders();
}

/**
 * Load admin summary statistics (Total Orders, Pending Orders, Total Earnings)
 */
async function loadAdminSummary() {
  try {
    const res = await fetch('/api/summary');
    if (!res.ok) return;

    const summary = await res.json();
    document.getElementById('stat-total-orders').textContent = summary.totalOrders || 0;
    document.getElementById('stat-pending-orders').textContent = summary.pendingOrders || 0;
    document.getElementById('stat-total-earnings').textContent = `₹${(summary.totalEarnings || 0).toFixed(2)}`;
  } catch (err) {
    console.error('Failed to load summary stats:', err);
  }
}

/**
 * Load all food items for food management
 */
async function loadAdminFoods() {
  try {
    const res = await fetch('/api/foods');
    adminFoodsList = await res.json();
    renderAdminFoodTable();
  } catch (err) {
    console.error('Failed to load foods for admin:', err);
  }
}

/**
 * Filter admin food list by category
 */
function filterAdminFoods(category, btnElement) {
  adminCurrentCategoryFilter = category;
  if (btnElement) {
    const buttons = btnElement.parentElement.querySelectorAll('.filter-btn');
    buttons.forEach((b) => b.classList.remove('active'));
    btnElement.classList.add('active');
  }
  renderAdminFoodTable();
}

/**
 * Render admin food items table
 */
function renderAdminFoodTable() {
  const tbody = document.getElementById('admin-food-table-body');
  if (!tbody) return;

  const filtered =
    adminCurrentCategoryFilter === 'All'
      ? adminFoodsList
      : adminFoodsList.filter((f) => f.category === adminCurrentCategoryFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
          No food items found in category "${adminCurrentCategoryFilter}".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map((food) => {
      const isAvail = food.available === 1;
      const emoji = getFoodEmoji(food.name, food.category);

      return `
      <tr>
        <td><b>#${food.id}</b></td>
        <td>
          <span style="font-size: 1.2rem;">${emoji}</span>
          <span style="font-weight: 600; margin-left: 6px;">${escapeHtml(food.name)}</span>
        </td>
        <td><span class="badge badge-role">${escapeHtml(food.category)}</span></td>
        <td><b style="color:var(--primary-hover);">₹${food.price.toFixed(2)}</b></td>
        <td>
          <span class="badge ${isAvail ? 'badge-available' : 'badge-unavailable'}">
            ${isAvail ? '🟢 Available' : '🔴 Not Available'}
          </span>
        </td>
        <td>
          <button 
            type="button"
            class="btn btn-sm ${isAvail ? 'btn-secondary' : 'btn-success'}"
            onclick="toggleFoodAvailability(${food.id}, ${isAvail ? 0 : 1})"
          >
            ${isAvail ? 'Mark Not Available' : 'Mark Available'}
          </button>
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button 
              type="button" 
              class="btn btn-sm btn-secondary" 
              onclick='openEditFoodModal(${JSON.stringify(food)})'
            >
              ✏️ Edit
            </button>
            <button 
              type="button" 
              class="btn btn-sm btn-danger" 
              onclick="deleteFoodItem(${food.id}, '${escapeHtml(food.name)}')"
            >
              🗑️ Delete
            </button>
          </div>
        </td>
      </tr>
    `;
    })
    .join('');
}

/**
 * Toggle Food Availability (Available / Not Available)
 */
async function toggleFoodAvailability(id, newStatus) {
  try {
    const res = await fetch(`/api/foods/${id}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: newStatus })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update availability.');

    showToast(data.message, 'success');
    await loadAdminFoods();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Open Modal to Add New Food Item
 */
function openAddFoodModal() {
  document.getElementById('add-food-form').reset();
  const modal = document.getElementById('add-food-modal');
  if (modal) modal.classList.add('active');
}

function closeAddFoodModal() {
  const modal = document.getElementById('add-food-modal');
  if (modal) modal.classList.remove('active');
}

/**
 * Submit Add Food Form
 */
async function submitAddFood(e) {
  e.preventDefault();

  const name = document.getElementById('add-food-name').value.trim();
  const category = document.getElementById('add-food-category').value;
  const price = parseFloat(document.getElementById('add-food-price').value);
  const available = parseInt(document.getElementById('add-food-available').value, 10);

  try {
    const res = await fetch('/api/foods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, price, available })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add item.');

    closeAddFoodModal();
    showToast('Food item added successfully!', 'success');
    await loadAdminFoods();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Open Modal to Edit Food Item
 */
function openEditFoodModal(food) {
  document.getElementById('edit-food-id').value = food.id;
  document.getElementById('edit-food-name').value = food.name;
  document.getElementById('edit-food-category').value = food.category;
  document.getElementById('edit-food-price').value = food.price;

  const modal = document.getElementById('edit-food-modal');
  if (modal) modal.classList.add('active');
}

function closeEditFoodModal() {
  const modal = document.getElementById('edit-food-modal');
  if (modal) modal.classList.remove('active');
}

/**
 * Submit Edit Food Form
 */
async function submitEditFood(e) {
  e.preventDefault();

  const id = document.getElementById('edit-food-id').value;
  const name = document.getElementById('edit-food-name').value.trim();
  const category = document.getElementById('edit-food-category').value;
  const price = parseFloat(document.getElementById('edit-food-price').value);

  try {
    const res = await fetch(`/api/foods/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, price })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update item.');

    closeEditFoodModal();
    showToast('Food item updated successfully!', 'success');
    await loadAdminFoods();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Delete Food Item
 */
async function deleteFoodItem(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/foods/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete food item.');
    }

    showToast('Food item deleted successfully.', 'success');
    await loadAdminFoods();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Load and filter student & faculty orders in admin dashboard
 */
async function loadAdminOrders() {
  const tbody = document.getElementById('admin-orders-table-body');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">
        Loading live orders... ⏳
      </td>
    </tr>
  `;

  try {
    const url =
      adminCurrentOrderFilter === 'All'
        ? '/api/orders'
        : `/api/orders?filter=${encodeURIComponent(adminCurrentOrderFilter)}`;

    const res = await fetch(url);
    const orders = await res.json();

    if (!orders || orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">
            No orders found matching filter "${adminCurrentOrderFilter}".
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = orders
      .map(
        (o) => `
      <tr>
        <td><b>#${o.id}</b></td>
        <td>
          <div style="font-weight: 700;">${escapeHtml(o.username)}</div>
          <span class="badge badge-role">${escapeHtml(o.role.toUpperCase())}</span>
        </td>
        <td>
          <span>${getFoodEmoji(o.food_name, o.food_category)}</span>
          <b>${escapeHtml(o.food_name)}</b>
        </td>
        <td>${o.quantity}</td>
        <td><b style="color:var(--primary-hover);">₹${o.total.toFixed(2)}</b></td>
        <td><small style="color:var(--text-muted);">${escapeHtml(o.order_time)}</small></td>
        <td>
          <select 
            class="status-select ${o.order_status === 'Done' ? 'done' : 'pending'}"
            onchange="updateOrderStatus(${o.id}, this.value)"
          >
            <option value="Pending" ${o.order_status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
            <option value="Done" ${o.order_status === 'Done' ? 'selected' : ''}>✅ Done</option>
          </select>
        </td>
        <td>
          <select 
            class="status-select ${o.payment_status === 'Paid' ? 'paid' : 'not-paid'}"
            onchange="updateOrderPayment(${o.id}, this.value)"
          >
            <option value="Not Paid" ${o.payment_status === 'Not Paid' ? 'selected' : ''}>❌ Not Paid</option>
            <option value="Paid" ${o.payment_status === 'Paid' ? 'selected' : ''}>💳 Paid</option>
          </select>
        </td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--danger); padding: 20px;">
          Failed to load orders.
        </td>
      </tr>
    `;
  }
}

/**
 * Filter orders by status pill (All, Pending, Done, Paid, Not Paid)
 */
function filterOrders(filter, btnElement) {
  adminCurrentOrderFilter = filter;
  if (btnElement) {
    const buttons = btnElement.parentElement.querySelectorAll('.filter-btn');
    buttons.forEach((b) => b.classList.remove('active'));
    btnElement.classList.add('active');
  }
  loadAdminOrders();
}

/**
 * Update Order Status (Pending / Done)
 */
async function updateOrderStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status.');

    showToast(`Order #${id} marked as ${newStatus}`, 'success');
    await loadAdminSummary();
    await loadAdminOrders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Update Payment Status (Paid / Not Paid)
 */
async function updateOrderPayment(id, newPaymentStatus) {
  try {
    const res = await fetch(`/api/orders/${id}/payment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: newPaymentStatus })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update payment status.');

    showToast(`Order #${id} payment marked as ${newPaymentStatus}`, 'success');
    await loadAdminSummary();
    await loadAdminOrders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Open Modal to Change Admin Password
 */
function openChangePasswordModal() {
  document.getElementById('change-password-form').reset();
  const modal = document.getElementById('change-password-modal');
  if (modal) modal.classList.add('active');
}

function closeChangePasswordModal() {
  const modal = document.getElementById('change-password-modal');
  if (modal) modal.classList.remove('active');
}

/**
 * Submit Admin Password Change
 */
async function submitChangePassword(e) {
  e.preventDefault();

  const currentPassword = document.getElementById('admin-current-password').value;
  const newPassword = document.getElementById('admin-new-password').value;
  const confirmPassword = document.getElementById('admin-confirm-password').value;

  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match.', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showToast('New password must be at least 6 characters long.', 'error');
    return;
  }

  const submitBtn = document.getElementById('change-password-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Updating...';

  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update password.');

    closeChangePasswordModal();
    showToast('🎉 Admin password updated successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Update Password';
  }
}

// ==========================================
// 6. HELPER: XSS PREVENTION
// ==========================================
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// 7. PAGE INITIALIZATION ROUTER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  if (page === 'menu') {
    initMenuPage();
  } else if (page === 'admin') {
    initAdminPage();
  } else if (page === 'register') {
    initRegisterPage();
  } else {
    initLoginPage();
  }
});
