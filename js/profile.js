// auth.js handles session guard via inline script in <head> of each protected page

const avatarEl = document.getElementById('profileAvatar');

// ===== AVATAR HELPERS =====
function setAvatar(email, src) {
  if (src) {
    avatarEl.innerHTML = `<img src="${src}" alt="Profile photo" />`;
  } else {
    const raw      = sessionStorage.getItem('scamshield_user');
    const name     = raw ? JSON.parse(raw).name : '?';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    avatarEl.textContent = initials;
  }
}

// File picker — saves avatar to localStorage keyed by email
document.getElementById('avatarInput').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const raw   = sessionStorage.getItem('scamshield_user');
    const email = raw ? JSON.parse(raw).email : 'unknown';
    const dataUrl = e.target.result;
    localStorage.setItem('scamshield_avatar_' + email, dataUrl);
    setAvatar(email, dataUrl);
    loadUserSession(); // refresh topbar
  };
  reader.readAsDataURL(file);
});

// ===== LOADING / ERROR STATES =====
function showFieldLoading() {
  ['profileName', 'profileEmail', 'profileScans', 'profileSince'].forEach(id => {
    document.getElementById(id).textContent = '…';
  });
}

function showFieldError(message) {
  document.getElementById('profileName').textContent  = '—';
  document.getElementById('profileEmail').textContent = message;
  document.getElementById('profileScans').textContent = '—';
  document.getElementById('profileSince').textContent = '—';
}

// ===== FETCH PROFILE FROM BACKEND =====
async function loadProfile() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    window.location.replace('login.html');
    return;
  }

  showFieldLoading();

  try {
    const response = await fetch('http://127.0.0.1:5000/api/profile', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (response.status === 401) {
      localStorage.removeItem('access_token');
      window.location.replace('login.html');
      return;
    }

    if (!response.ok) {
      showFieldError('Failed to load profile.');
      return;
    }

    const data = await response.json();
    const user = data.user;

    // Populate fields
    document.getElementById('profileName').textContent  = user.full_name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileScans').textContent = user.total_scans;
    document.getElementById('profileSince').textContent = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Set avatar — use saved photo or initials
    const savedPhoto = localStorage.getItem('scamshield_avatar_' + user.email);
    setAvatar(user.email, savedPhoto);

  } catch (err) {
    showFieldError('Could not reach the server.');
  }
}

// ===== SIDEBAR TOGGLE =====
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ===== INIT =====
loadProfile();
