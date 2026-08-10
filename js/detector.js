// auth.js handles session guard via inline script in <head> of each protected page

// ===== TAB SWITCHING =====
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    hideResult();
  });
});

// ===== CHAR COUNTERS =====
document.getElementById('messageInput')?.addEventListener('input', function () {
  document.getElementById('messageCount').textContent = this.value.length + ' characters';
});

document.getElementById('emailBody')?.addEventListener('input', function () {
  document.getElementById('emailCount').textContent = this.value.length + ' characters';
});

// ===== VERDICT DISPLAY HELPERS =====
// Maps the backend result string to display label, icon, and subtitle
function getVerdictDisplay(result) {
  if (result === 'scam')       return { label: 'Scam Detected', cls: 'scam',       icon: '🚨', sub: 'This content shows strong signs of being a scam. Do not click any links or share personal information.' };
  if (result === 'suspicious') return { label: 'Suspicious',    cls: 'suspicious', icon: '⚠️', sub: 'This content has some warning signs. Proceed with caution and verify the source.' };
  return                               { label: 'Looks Safe',   cls: 'safe',       icon: '✅', sub: 'No major red flags detected. Always stay cautious with unsolicited messages.' };
}

// ===== MAIN SCAN FUNCTION — calls backend API =====
async function runScan(type) {
  let input_text = '';

  if (type === 'message') {
    input_text = document.getElementById('messageInput').value.trim();
    if (!input_text) return alert('Please paste a message first.');
  } else if (type === 'email') {
    const from    = document.getElementById('emailFrom').value.trim();
    const subject = document.getElementById('emailSubject').value.trim();
    const body    = document.getElementById('emailBody').value.trim();
    if (!body) return alert('Please paste the email body.');
    input_text = [from, subject, body].filter(Boolean).join(' ');
  } else if (type === 'url') {
    input_text = document.getElementById('urlInput').value.trim();
    if (!input_text) return alert('Please paste a URL first.');
  }

  const token = localStorage.getItem('access_token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Show a loading state on the scan button
  const scanBtn = document.querySelector(`#tab-${type} .btn-primary`);
  const originalLabel = scanBtn.textContent;
  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning…';

  try {
    const response = await fetch('http://127.0.0.1:5000/api/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ input_text, scan_type: type })
    });

    const data = await response.json();

    if (response.status === 401) {
      // Token expired or invalid — send back to login
      localStorage.removeItem('access_token');
      window.location.href = 'login.html';
      return;
    }

    if (!response.ok) {
      alert('Scan failed: ' + (data.error || 'Unknown error.'));
      return;
    }

    const verdict = getVerdictDisplay(data.result);
    showResult(verdict, data.risk_score, data.flags, data.ai_explanation, type);

  } catch (err) {
    alert('Could not reach the server. Make sure the backend is running.');
  } finally {
    scanBtn.disabled = false;
    scanBtn.textContent = originalLabel;
  }
}

// ===== DISPLAY RESULT =====
function showResult(verdict, score, flags, aiExplanation, type) {
  const panel = document.getElementById('resultPanel');
  document.getElementById('resultIcon').textContent = verdict.icon;

  const titleEl = document.getElementById('resultTitle');
  titleEl.textContent = verdict.label;
  titleEl.className = 'result-title ' + verdict.cls;

  document.getElementById('resultSubtitle').textContent = verdict.sub;

  const bar = document.getElementById('scoreBar');
  bar.style.width = score + '%';
  bar.className = 'score-bar ' + verdict.cls;

  document.getElementById('scoreValue').textContent = score + ' / 100';

  const flagsEl = document.getElementById('resultFlags');
  let flagsHtml = '';

  // AI explanation first — if available
  if (aiExplanation) {
    flagsHtml += `<div class="flag-item"><span>🤖</span><span>${aiExplanation}</span></div>`;
  }

  // Detected flags below
  if (flags && flags.length > 0) {
    const flagMessages = type === 'url'
      ? flags.map(f => `Suspicious URL pattern matched: <code>${f}</code>`)
      : flags.map(f => `Scam keyword detected: "<strong>${f}</strong>"`);
    flagsHtml += flagMessages.map(msg =>
      `<div class="flag-item"><span>🔴</span><span>${msg}</span></div>`
    ).join('');
  } else if (!aiExplanation) {
    flagsHtml = `<div class="flag-item"><span>🟢</span><span>No specific red flags found in the content.</span></div>`;
  }

  flagsEl.innerHTML = flagsHtml;

  panel.style.display = 'flex';
  // Use setTimeout to ensure display change is painted before scrolling
  setTimeout(() => {
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}

function hideResult() {
  document.getElementById('resultPanel').style.display = 'none';
}

function resetScan() {
  hideResult();
  document.getElementById('messageInput').value = '';
  document.getElementById('emailFrom').value = '';
  document.getElementById('emailSubject').value = '';
  document.getElementById('emailBody').value = '';
  document.getElementById('urlInput').value = '';
  document.getElementById('messageCount').textContent = '0 characters';
  document.getElementById('emailCount').textContent = '0 characters';
}

// Sidebar toggle
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ===== WIRE UP BUTTONS via addEventListener (no onclick in HTML) =====
document.getElementById('scanMessageBtn').addEventListener('click', (e) => {
  e.preventDefault();
  runScan('message');
});

document.getElementById('scanEmailBtn').addEventListener('click', (e) => {
  e.preventDefault();
  runScan('email');
});

document.getElementById('scanUrlBtn').addEventListener('click', (e) => {
  e.preventDefault();
  runScan('url');
});

document.getElementById('resetScanBtn').addEventListener('click', (e) => {
  e.preventDefault();
  resetScan();
});
