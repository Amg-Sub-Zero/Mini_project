// ===== SESSION GUARD =====
if (!sessionStorage.getItem('scamshield_user')) {
  window.location.href = 'index.html';
}

// ===== LOAD DATA =====
function getScans() {
  return JSON.parse(sessionStorage.getItem('scamshield_scans') || '[]');
}

// ===== RENDER TABLE =====
function renderHistory(scans) {
  const tbody = document.getElementById('historyBody');
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

  const reversed = [...scans].reverse();
  tbody.innerHTML = reversed.map(scan => `
    <tr>
      <td title="${scan.input}">${scan.input}</td>
      <td><span class="type-tag">${scan.type}</span></td>
      <td><span class="badge-${scan.result}">${capitalize(scan.result)}</span></td>
      <td>
        <div class="mini-bar-wrapper">
          <div class="mini-bar">
            <div class="mini-bar-fill ${scan.result}" style="width:${scan.score ?? 0}%"></div>
          </div>
          <span class="mini-score">${scan.score ?? 0}/100</span>
        </div>
      </td>
      <td>${scan.date}</td>
    </tr>
  `).join('');

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

  let scans = getScans();

  if (search) scans = scans.filter(s => s.input.toLowerCase().includes(search));
  if (result !== 'all') scans = scans.filter(s => s.result === result);
  if (type   !== 'all') scans = scans.filter(s => s.type === type);

  renderHistory(scans);
}

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('filterResult').addEventListener('change', applyFilters);
document.getElementById('filterType').addEventListener('change', applyFilters);

// ===== CLEAR HISTORY =====
document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('Clear all scan history? This cannot be undone.')) {
    sessionStorage.removeItem('scamshield_scans');
    renderHistory([]);
  }
});

// ===== SIDEBAR TOGGLE =====
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ===== INIT =====
renderHistory(getScans());
