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
    const response = await fetch(`${API_BASE}/api/profile`, {
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

// ===== INIT =====
loadProfile();

// ===== GMAIL INTEGRATION =====

async function loadGmailStatus() {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  try {
    const res  = await fetch(`${API_BASE}/api/gmail/status`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    renderGmailCard(data);
  } catch (err) {
    renderGmailCard({ connected: false });
  }
}

function renderGmailCard(data) {
  const badge        = document.getElementById('gmailStatusBadge');
  const disconnected = document.getElementById('gmailDisconnected');
  const connected    = document.getElementById('gmailConnected');

  if (data.connected && data.connection) {
    const conn = data.connection;

    badge.textContent = '● Connected';
    badge.className   = 'gmail-status-badge connected';

    document.getElementById('gmailAddress').textContent    = conn.gmail_address || '—';
    document.getElementById('gmailLastScanned').textContent = conn.last_scanned_at
      ? new Date(conn.last_scanned_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Never';

    // Set saved settings on dropdowns
    document.getElementById('scamAction').value       = conn.scam_action       || 'trash';
    document.getElementById('suspiciousAction').value = conn.suspicious_action || 'label';

    disconnected.style.display = 'none';
    connected.style.display    = 'block';
  } else {
    badge.textContent = '○ Not connected';
    badge.className   = 'gmail-status-badge disconnected';
    disconnected.style.display = 'block';
    connected.style.display    = 'none';
  }
}

// ── Connect button ────────────────────────────────────────────────────────────
document.getElementById('gmailConnectBtn').addEventListener('click', async () => {
  const token = localStorage.getItem('access_token');
  const btn   = document.getElementById('gmailConnectBtn');
  btn.disabled    = true;
  btn.textContent = 'Connecting…';

  try {
    const res  = await fetch(`${API_BASE}/api/gmail/auth-url`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.auth_url) {
      // After OAuth, Google → backend → profile.html?gmail=connected
      // If the token expires mid-flow, mark where to return after re-login
      sessionStorage.setItem('post_login_redirect', 'profile.html');
      window.location.href = data.auth_url;
    } else {
      alert('Could not get Google auth URL. Please try again.');
      btn.disabled    = false;
      btn.textContent = '🔗 Connect Gmail';
    }
  } catch (err) {
    alert('Could not reach the server.');
    btn.disabled    = false;
    btn.textContent = '🔗 Connect Gmail';
  }
});

// ── Disconnect button ─────────────────────────────────────────────────────────
document.getElementById('gmailDisconnectBtn').addEventListener('click', async () => {
  if (!confirm('Disconnect Gmail? ScamShield will stop scanning your inbox automatically.')) return;

  const token = localStorage.getItem('access_token');
  const btn   = document.getElementById('gmailDisconnectBtn');
  btn.disabled    = true;
  btn.textContent = 'Disconnecting…';

  try {
    await fetch(`${API_BASE}/api/gmail/disconnect`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    loadGmailStatus();
  } catch (err) {
    alert('Could not reach the server.');
  } finally {
    btn.disabled    = false;
    btn.textContent = '🔌 Disconnect';
  }
});

// ── Save settings ─────────────────────────────────────────────────────────────
document.getElementById('gmailSaveSettingsBtn').addEventListener('click', async () => {
  const token  = localStorage.getItem('access_token');
  const btn    = document.getElementById('gmailSaveSettingsBtn');
  const saved  = document.getElementById('gmailSettingsSaved');
  btn.disabled = true;

  try {
    await fetch(`${API_BASE}/api/gmail/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        scam_action:       document.getElementById('scamAction').value,
        suspicious_action: document.getElementById('suspiciousAction').value
      })
    });
    saved.style.display = 'inline';
    setTimeout(() => { saved.style.display = 'none'; }, 2500);
  } catch (err) {
    alert('Could not save settings.');
  } finally {
    btn.disabled = false;
  }
});

// ── Scan Now button ───────────────────────────────────────────────────────────
document.getElementById('gmailScanNowBtn').addEventListener('click', async () => {
  const token     = localStorage.getItem('access_token');
  const btn       = document.getElementById('gmailScanNowBtn');
  const resultEl  = document.getElementById('gmailScanResult');

  btn.disabled    = true;
  btn.textContent = '⏳ Scanning…';
  resultEl.style.display = 'none';

  try {
    const res  = await fetch(`${API_BASE}/api/gmail/scan-now`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (data.error) {
      resultEl.innerHTML     = `❌ ${escapeHtml(data.error)}`;
      resultEl.style.display = 'block';
    } else {
      resultEl.innerHTML = `
        ✅ Scan complete —
        <strong>${data.scanned}</strong> email${data.scanned !== 1 ? 's' : ''} scanned,
        <strong style="color:#ef4444">${data.scam}</strong> scam${data.scam !== 1 ? 's' : ''} trashed,
        <strong style="color:#f59e0b">${data.suspicious}</strong> suspicious flagged,
        <strong style="color:#22c55e">${data.safe}</strong> safe.
      `;
      resultEl.style.display = 'block';
      // Refresh last scanned time
      loadGmailStatus();
    }
  } catch (err) {
    resultEl.innerHTML     = '❌ Could not reach the server.';
    resultEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = '⚡ Scan Now';
  }
});

// ── Handle redirect back from Google OAuth ────────────────────────────────────
const gmailParam = new URLSearchParams(window.location.search).get('gmail');
if (gmailParam === 'connected') {
  // Clean up the URL and show a success message
  history.replaceState({}, '', 'profile.html');
  const banner = document.createElement('div');
  banner.className   = 'auth-success';
  banner.style.cssText = 'display:block; margin-bottom:1rem; max-width:520px;';
  banner.textContent = '✅ Gmail connected successfully! ScamShield will now scan your inbox every 5 minutes.';
  document.querySelector('.dashboard-main').prepend(banner);
  setTimeout(() => banner.remove(), 5000);
} else if (gmailParam === 'denied' || gmailParam === 'error') {
  history.replaceState({}, '', 'profile.html');
  const banner = document.createElement('div');
  banner.className   = 'auth-error';
  banner.style.cssText = 'display:block; margin-bottom:1rem; max-width:520px;';
  banner.textContent = gmailParam === 'denied'
    ? '❌ Gmail connection was cancelled.'
    : '❌ Something went wrong connecting Gmail. Please try again.';
  document.querySelector('.dashboard-main').prepend(banner);
  setTimeout(() => banner.remove(), 5000);
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadGmailStatus();
