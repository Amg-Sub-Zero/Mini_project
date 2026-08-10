// auth.js handles session guard via inline script in <head> of each protected page

let allScans = [];

// ===== FETCH SCANS FROM BACKEND =====
async function loadHistory() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    window.location.replace('login.html');
    return;
  }

  showLoading();

  try {
    const response = await fetch('http://127.0.0.1:5000/api/scans', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (response.status === 401) {
      localStorage.removeItem('access_token');
      window.location.replace('login.html');
      return;
    }

    if (!response.ok) {
      showError('Failed to load scan history. Please try again.');
      return;
    }

    const data = await response.json();
    allScans   = data.scans || [];
    applyFilters();

  } catch (err) {
    showError('Could not reach the server. Make sure the backend is running.');
  }
}

// ===== LOADING STATE =====
function showLoading() {
  const tbody   = document.getElementById('historyBody');
  const countEl = document.getElementById('historyCount');
  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center; color:var(--text-muted); padding:2.5rem;">
        ⏳ Loading your scan history…
      </td>
    </tr>`;
  countEl.textContent = '';
}

// ===== ERROR STATE =====
function showError(message) {
  const tbody   = document.getElementById('historyBody');
  const countEl = document.getElementById('historyCount');
  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center; color:#f87171; padding:2.5rem;">
        ❌ ${message}
      </td>
    </tr>`;
  countEl.textContent = '';
}

// ===== RENDER TABLE =====
function renderHistory(scans) {
  const tbody   = document.getElementById('historyBody');
  const countEl = document.getElementById('historyCount');

  if (scans.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color:var(--text-muted); padding:2.5rem;">
          No scans found. <a href="detector.html" style="color:#818cf8;">Run a scan →</a>
        </td>
      </tr>`;
    countEl.textContent = '';
    return;
  }

  tbody.innerHTML = scans.map(scan => {
    const date    = new Date(scan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const preview = scan.input_text.length > 80 ? scan.input_text.slice(0, 80) + '…' : scan.input_text;
    // Escape HTML to prevent XSS from stored scan content
    const safePreview = preview.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeTitle   = scan.input_text.replace(/"/g, '&quot;');
    return `
      <tr>
        <td title="${safeTitle}">${safePreview}</td>
        <td><span class="type-tag">${capitalize(scan.scan_type)}</span></td>
        <td><span class="badge-${scan.result}">${capitalize(scan.result)}</span></td>
        <td>
          <div class="mini-bar-wrapper">
            <div class="mini-bar">
              <div class="mini-bar-fill ${scan.result}" style="width:${scan.risk_score ?? 0}%"></div>
            </div>
            <span class="mini-score">${scan.risk_score ?? 0}/100</span>
          </div>
        </td>
        <td>${date}</td>
      </tr>`;
  }).join('');

  countEl.textContent = `Showing ${scans.length} scan${scans.length !== 1 ? 's' : ''}`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== FILTERS =====
function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const result = document.getElementById('filterResult').value;
  const type   = document.getElementById('filterType').value;

  let filtered = [...allScans];

  if (search) filtered = filtered.filter(s => s.input_text.toLowerCase().includes(search));
  if (result !== 'all') filtered = filtered.filter(s => s.result === result);
  // Backend scan_type values: "message", "email", "url"
  // Filter dropdown values:   "Message", "Email",   "Link"
  if (type !== 'all') {
    const typeMap = { 'Message': 'message', 'Email': 'email', 'Link': 'url' };
    filtered = filtered.filter(s => s.scan_type === typeMap[type]);
  }

  renderHistory(filtered);
}

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('filterResult').addEventListener('change', applyFilters);
document.getElementById('filterType').addEventListener('change', applyFilters);

// ===== CLEAR HISTORY =====
document.getElementById('clearBtn').addEventListener('click', () => {
  alert('Clear history will be available in a future update.');
});

// ===== INIT =====
loadHistory();
