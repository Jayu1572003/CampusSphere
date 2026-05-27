// Shared API utility and auth helpers
const API_BASE = '/api';

// Auth
const Auth = {
  getToken: () => localStorage.getItem('sms_token'),
  getUser: () => JSON.parse(localStorage.getItem('sms_user') || 'null'),
  setSession: (token, user) => {
    localStorage.setItem('sms_token', token);
    localStorage.setItem('sms_user', JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
  },
  isLoggedIn: () => !!localStorage.getItem('sms_token'),
  isAdmin: () => Auth.getUser()?.role === 'admin',
  requireAuth: (role) => {
    if (!Auth.isLoggedIn()) { window.location.href = '/'; return false; }
    if (role && Auth.getUser()?.role !== role) {
      window.location.href = Auth.isAdmin() ? '/admin/dashboard.html' : '/student/dashboard.html';
      return false;
    }
    return true;
  },
  logout: () => {
    Auth.clearSession();
    window.location.href = '/';
  }
};

// API helper
async function api(endpoint, options = {}) {
  const token = Auth.getToken();
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const API = {
  get: (endpoint) => api(endpoint, { method: 'GET' }),
  post: (endpoint, body) => api(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => api(endpoint, { method: 'PUT', body }),
  delete: (endpoint) => api(endpoint, { method: 'DELETE' }),
};

// Toast notifications
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// Format helpers
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatCurrency(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}
function formatPct(n) { return `${n || 0}%`; }
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function gradeBadge(grade) {
  const map = { 'A+': 'success', 'A': 'success', 'B+': 'info', 'B': 'info', 'C': 'warning', 'F': 'danger' };
  const cls = map[grade] || 'muted';
  return `<span class="badge badge-${cls}">${grade || '—'}</span>`;
}
function statusBadge(status) {
  const map = { active: 'success', inactive: 'muted', graduated: 'info', suspended: 'danger', paid: 'success', pending: 'warning', overdue: 'danger', waived: 'muted' };
  const cls = map[status] || 'muted';
  return `<span class="badge badge-${cls}">${status}</span>`;
}
function attendanceBadge(status) {
  const map = { present: 'success', absent: 'danger', late: 'warning' };
  return `<span class="badge badge-${map[status] || 'muted'}">${status}</span>`;
}

// Sidebar active link
function setActiveNav(href) {
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === href || l.dataset.page === href);
  });
}

// Populate user info in sidebar
function initSidebar(role) {
  const user = Auth.getUser();
  if (!user) return;
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role;
  if (avatarEl) avatarEl.textContent = initials(user.name);
}

function confirmDelete(message = 'Are you sure you want to delete this?') {
  return confirm(message);
}

// Modal helpers
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
window.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});

// Theme Toggle Logic
function initTheme() {
  const currentTheme = localStorage.getItem('sms_theme') || 'dark';
  if (currentTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  const btn = document.createElement('button');
  btn.className = 'theme-toggle-btn';
  btn.innerHTML = currentTheme === 'light' ? '🌙' : '☀️';
  btn.title = 'Toggle Theme';
  document.body.appendChild(btn);

  btn.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('sms_theme', 'dark');
      btn.innerHTML = '☀️';
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('sms_theme', 'light');
      btn.innerHTML = '🌙';
    }
  });

  // Apply chart defaults for light mode
  if (window.Chart) {
    const isLight = localStorage.getItem('sms_theme') === 'light';
    Chart.defaults.color = isLight ? '#64748B' : '#8888AA';
    Chart.defaults.scale.grid.color = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
  }
}

document.addEventListener('DOMContentLoaded', initTheme);
