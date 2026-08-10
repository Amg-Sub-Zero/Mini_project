// ===== USER STORE — persisted in localStorage =====
// Seeded with one default account. New registrations are added alongside it.
function getUsers() {
  const stored = localStorage.getItem('scamshield_users');
  if (stored) return JSON.parse(stored);
  // First run — seed default account
  const defaults = [{ name: "Shamsudeen Yakubu", email: "shamsudeenyakubu901@gmail.com", password: "Amg" }];
  localStorage.setItem('scamshield_users', JSON.stringify(defaults));
  return defaults;
}

function saveUsers(users) {
  localStorage.setItem('scamshield_users', JSON.stringify(users));
}

// ===== LOGIN =====
document.getElementById('loginForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl  = document.getElementById('loginError');

  const users = getUsers();
  const user  = users.find(u => u.email === email && u.password === password);

  if (user) {
    sessionStorage.setItem('scamshield_user', JSON.stringify({ name: user.name, email: user.email }));
    window.location.href = 'dashboard.html';
  } else {
    errorEl.style.display = 'block';
  }
});

// ===== REGISTER =====
document.getElementById('registerForm')?.addEventListener('submit', function (e) {
  e.preventDefault();
  const name      = document.getElementById('regName').value.trim();
  const email     = document.getElementById('regEmail').value.trim();
  const password  = document.getElementById('regPassword').value;
  const confirm   = document.getElementById('regConfirm').value;
  const errorEl   = document.getElementById('registerError');
  const successEl = document.getElementById('registerSuccess');

  errorEl.style.display = 'none';

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

  const users = getUsers();

  if (users.find(u => u.email === email)) {
    errorEl.textContent = '❌ An account with this email already exists.';
    errorEl.style.display = 'block';
    return;
  }

  users.push({ name, email, password });
  saveUsers(users);

  this.style.display = 'none';
  successEl.style.display = 'block';
});

// ===== LOGOUT =====
function logout() {
  sessionStorage.removeItem('scamshield_user');
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

loadUserSession();
