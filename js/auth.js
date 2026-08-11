// ===== API BASE URL =====
// Uses the same host as the current page so it works on any device on the network
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:5000'
  : `http://${window.location.hostname}:5000`;

// ===== LOGIN =====
document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const email     = document.getElementById('loginEmail').value.trim();
  const password  = document.getElementById('loginPassword').value;
  const errorEl   = document.getElementById('loginError');
  const submitBtn = this.querySelector('button[type="submit"]');

  errorEl.style.display = 'none';

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    const response = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Store JWT for future authenticated API calls
      localStorage.setItem('access_token', data.token);

      // Store user info for topbar display and session guard
      sessionStorage.setItem('scamshield_user', JSON.stringify({
        name:  data.user.full_name,
        email: data.user.email,
        id:    data.user.id
      }));

      window.location.href = 'dashboard.html';
    } else if (response.status === 403) {
      // Account not verified
      errorEl.textContent = '❌ ' + data.error;
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    } else {
      errorEl.textContent = '❌ ' + (data.error || 'Invalid email or password.');
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  } catch (err) {
    errorEl.textContent = '❌ Could not reach the server. Make sure the backend is running.';
    errorEl.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
});

// ===== REGISTER =====
document.getElementById('registerForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const name      = document.getElementById('regName').value.trim();
  const email     = document.getElementById('regEmail').value.trim();
  const password  = document.getElementById('regPassword').value;
  const confirm   = document.getElementById('regConfirm').value;
  const errorEl   = document.getElementById('registerError');
  const successEl = document.getElementById('registerSuccess');
  const submitBtn = this.querySelector('button[type="submit"]');

  errorEl.style.display = 'none';

  // Client-side checks before hitting the server
  if (password !== confirm) {
    errorEl.textContent = '❌ Passwords do not match.';
    errorEl.style.display = 'block';
    return;
  }

  if (password.length < 5) {
    errorEl.textContent = '❌ Password must be at least 5 characters.';
    errorEl.style.display = 'block';
    return;
  }

  // Disable button while request is in flight
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    const response = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name, email: email, password: password })
    });

    const data = await response.json();

    if (response.ok) {
      // Redirect to login with a check-email flag
      window.location.href = 'login.html?registered=1';
    } else {
      // Server returned a validation or conflict error
      errorEl.textContent = '❌ ' + (data.error || 'Registration failed. Please try again.');
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  } catch (err) {
    // Network error or backend not running
    errorEl.textContent = '❌ Could not reach the server. Make sure the backend is running.';
    errorEl.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
});

// ===== LOGOUT =====
function logout() {
  sessionStorage.removeItem('scamshield_user');
  localStorage.removeItem('access_token');
  window.location.href = 'index.html';
}

// ===== TOPBAR USER DISPLAY =====
function loadUserSession() {
  const raw = sessionStorage.getItem('scamshield_user');
  if (!raw) return;
  const user = JSON.parse(raw);
  const topbarEl = document.getElementById('topbarUser');
  if (!topbarEl) return;

  const savedPhoto = localStorage.getItem('scamshield_avatar_' + user.email);
  const avatarHtml = savedPhoto
    ? `<img src="${savedPhoto}" alt="Profile photo" />`
    : `<span class="topbar-avatar-initials">${user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>`;

  topbarEl.innerHTML = `${avatarHtml}<span class="topbar-name">${user.name}</span>`;
}

// ===== SIDEBAR TOGGLE WITH BACKDROP =====
// Called from each page's sidebarToggle button
function initSidebar() {
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar   = document.getElementById('sidebar');
  const backdrop  = document.getElementById('sidebarBackdrop');
  if (!toggleBtn || !sidebar) return;

  function openSidebar() {
    sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  // Close sidebar when a nav link is clicked on mobile
  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', closeSidebar);
  });
}

// ===== TOGGLE PASSWORD VISIBILITY =====
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

// ===== CLEANUP — remove legacy localStorage user store if present =====
localStorage.removeItem('scamshield_users');

// ===== SHOW SUCCESS BANNER ON LOGIN PAGE after registration redirect =====
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('registered') === '1') {
  const banner = document.getElementById('registerSuccess');
  if (banner) banner.style.display = 'block';
}
if (urlParams.get('verify') === 'success') {
  const banner = document.getElementById('registerSuccess');
  if (banner) {
    banner.textContent = '✅ Email verified! You can now log in.';
    banner.style.display = 'block';
  }
}
if (urlParams.get('verify') === 'already') {
  const banner = document.getElementById('registerSuccess');
  if (banner) {
    banner.textContent = '✅ Email already verified. Please log in.';
    banner.style.display = 'block';
  }
}
if (urlParams.get('verify') === 'invalid') {
  const errorEl = document.getElementById('loginError');
  if (errorEl) {
    errorEl.textContent = '❌ Invalid or expired verification link. Please register again.';
    errorEl.style.display = 'block';
  }
}

loadUserSession();
initSidebar();
