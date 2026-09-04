// auth.js handles session guard via inline script in <head> of each protected page

// ===== LOAD USER INFO =====
const raw  = sessionStorage.getItem('scamshield_user');
const user = raw ? JSON.parse(raw) : null;

if (user) {
  const firstName = user.name.split(' ')[0];
  const welcomeEl = document.getElementById('welcomeMsg');
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${firstName} 👋`;
}

// ===== FETCH SCANS FROM BACKEND =====
async function loadDashboard() {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/api/scans`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!response.ok) return;

    const data  = await response.json();
    const scans = data.scans || [];

    renderStats(scans);
    renderRecentScans(scans);
  } catch (err) {
    // Backend unreachable — show empty state silently
    renderStats([]);
    renderRecentScans([]);
  }
}

function renderStats(scans) {
  const total     = scans.length;
  const scamCount = scans.filter(s => s.result === 'scam').length;
  const safeCount = scans.filter(s => s.result === 'safe').length;
  const suspCount = scans.filter(s => s.result === 'suspicious').length;
  const autoCount = scans.filter(s => s.input_text.startsWith('[Auto]')).length;

  document.getElementById('statTotal').textContent        = total;
  document.getElementById('statScam').textContent         = scamCount;
  document.getElementById('statSafe').textContent         = safeCount;
  document.getElementById('statSuspicious').textContent   = suspCount;
  document.getElementById('statAutoScanned').textContent  = autoCount;
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

  // Show most recent 10 — backend already returns newest first
  const recent = scans.slice(0, 10);
  tbody.innerHTML = recent.map(scan => {
    const date = new Date(scan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const isAuto    = scan.input_text.startsWith('[Auto]');
    const rawText   = isAuto ? scan.input_text.replace(/^\[Auto\]\s*/, '') : scan.input_text;
    const preview   = rawText.length > 80 ? rawText.slice(0, 80) + '…' : rawText;
    const safePreview = escapeHtml(preview);
    const safeTitle   = escapeHtml(rawText);
    const autoBadge   = isAuto ? '<span class="auto-badge">Auto</span> ' : '';
    return `
      <tr>
        <td title="${safeTitle}">${autoBadge}${safePreview}</td>
        <td><span class="type-tag">${capitalize(scan.scan_type)}</span></td>
        <td><span class="badge-${scan.result}">${capitalize(scan.result)}</span></td>
        <td>${date}</td>
      </tr>`;
  }).join('');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== INIT =====
loadDashboard();
