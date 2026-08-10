// auth.js handles session guard via inline script in <head> of each protected page

// ===== LOAD USER INFO =====
const user = raw ? JSON.parse(raw) : null;

if (user) {
  const firstName = user.name.split(' ')[0];
  const welcomeEl = document.getElementById('welcomeMsg');
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${firstName} 👋`;
  // topbar is handled by auth.js loadUserSession()
}

// ===== LOAD SCAN HISTORY FROM SESSION STORAGE =====
function getScanHistory() {
  const history = sessionStorage.getItem('scamshield_scans');
  return history ? JSON.parse(history) : [];
}

function renderStats(scans) {
  const total      = scans.length;
  const scamCount  = scans.filter(s => s.result === 'scam').length;
  const safeCount  = scans.filter(s => s.result === 'safe').length;
  const suspCount  = scans.filter(s => s.result === 'suspicious').length;

  document.getElementById('statTotal').textContent      = total;
  document.getElementById('statScam').textContent       = scamCount;
  document.getElementById('statSafe').textContent       = safeCount;
  document.getElementById('statSuspicious').textContent = suspCount;
}

function renderRecentScans(scans) {
  const tbody = document.getElementById('recentScansBody');
  if (!tbody) return;

  if (scans.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; color:var(--text-muted); padding:2rem;">
          No scans yet. <a href="detector.html" style="color:#818cf8;">Run your first scan →</a>
        </td>
      </tr>`;
    return;
  }

  // Show most recent 10
  const recent = [...scans].reverse().slice(0, 10);
  tbody.innerHTML = recent.map(scan => `
    <tr>
      <td title="${scan.input}">${scan.input}</td>
      <td><span class="type-tag">${scan.type}</span></td>
      <td><span class="badge-${scan.result}">${scan.result.charAt(0).toUpperCase() + scan.result.slice(1)}</span></td>
      <td>${scan.date}</td>
    </tr>
  `).join('');
}

// ===== SIDEBAR TOGGLE (mobile) =====
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ===== INIT =====
const scans = getScanHistory();
renderStats(scans);
renderRecentScans(scans);
