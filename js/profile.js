// ===== SESSION GUARD =====
const raw = sessionStorage.getItem('scamshield_user');
if (!raw) window.location.href = 'index.html';

const user  = JSON.parse(raw);
const scans = JSON.parse(sessionStorage.getItem('scamshield_scans') || '[]');

// ===== AVATAR =====
const avatarEl = document.getElementById('profileAvatar');

function setAvatar(src) {
  if (src) {
    avatarEl.innerHTML = `<img src="${src}" alt="Profile photo" />`;
  } else {
    const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    avatarEl.textContent = initials;
  }
}

// Load saved photo or fall back to initials
const savedPhoto = localStorage.getItem('scamshield_avatar_' + user.email);
setAvatar(savedPhoto);

// File picker
document.getElementById('avatarInput').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const dataUrl = e.target.result;
    localStorage.setItem('scamshield_avatar_' + user.email, dataUrl);
    setAvatar(dataUrl);
    loadUserSession(); // refresh topbar
  };
  reader.readAsDataURL(file);
});

// ===== FIELDS =====
document.getElementById('profileName').textContent  = user.name;
document.getElementById('profileEmail').textContent = user.email;
document.getElementById('profileScans').textContent = scans.length;
document.getElementById('profileSince').textContent = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

// ===== SIDEBAR TOGGLE =====
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
