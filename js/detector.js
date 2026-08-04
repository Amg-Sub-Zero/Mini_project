// ===== SESSION GUARD =====
if (!sessionStorage.getItem('scamshield_user')) {
  window.location.href = 'index.html';
}

// auth.js handles topbar display via loadUserSession()

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

// ===== SCAM DETECTION LOGIC =====
const scamKeywords = [
  'won', 'winner', 'claim', 'prize', 'reward', 'gift card', 'lottery',
  'urgent', 'verify', 'suspended', 'confirm your account', 'bank details',
  'click here', 'free money', 'congratulations', 'password', 'OTP',
  'transfer funds', 'inheritance', 'investment opportunity', 'act now'
];

const suspiciousUrlPatterns = [
  /bit\.ly/i, /tinyurl/i, /goo\.gl/i, /ow\.ly/i,
  /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/,   // IP address as domain
  /paypa[^l]/i, /arnazon/i, /goggle/i,       // typosquatting
  /secure.*login/i, /verify.*account/i,
  /free.*gift/i, /claim.*now/i
];

function analyzeText(text) {
  const lower = text.toLowerCase();
  const hits = scamKeywords.filter(kw => lower.includes(kw));
  const score = Math.min(100, hits.length * 18 + (text.length > 20 ? 5 : 0));
  return { score, flags: hits };
}

function analyzeUrl(url) {
  const hits = suspiciousUrlPatterns.filter(p => p.test(url));
  const score = Math.min(100, hits.length * 30 + (url.length > 60 ? 10 : 0));
  const flags = hits.map(p => p.toString().replace(/\//g, '').replace(/[iI]$/, '').slice(0, 40));
  return { score, flags };
}

function getVerdict(score) {
  if (score >= 60) return { label: 'Scam Detected', cls: 'scam', icon: '🚨', sub: 'This content shows strong signs of being a scam. Do not click any links or share personal information.' };
  if (score >= 30) return { label: 'Suspicious', cls: 'suspicious', icon: '⚠️', sub: 'This content has some warning signs. Proceed with caution and verify the source.' };
  return { label: 'Looks Safe', cls: 'safe', icon: '✅', sub: 'No major red flags detected. Always stay cautious with unsolicited messages.' };
}

function runScan(type) {
  let text = '';

  if (type === 'message') {
    text = document.getElementById('messageInput').value.trim();
    if (!text) return alert('Please paste a message first.');
  } else if (type === 'email') {
    const from = document.getElementById('emailFrom').value.trim();
    const subject = document.getElementById('emailSubject').value.trim();
    const body = document.getElementById('emailBody').value.trim();
    text = [from, subject, body].join(' ');
    if (!body) return alert('Please paste the email body.');
  } else if (type === 'url') {
    text = document.getElementById('urlInput').value.trim();
    if (!text) return alert('Please paste a URL first.');
  }

  const analysis = type === 'url' ? analyzeUrl(text) : analyzeText(text);
  const verdict = getVerdict(analysis.score);

  saveScan(text, type === 'url' ? 'Link' : type === 'email' ? 'Email' : 'Message', verdict.cls, analysis.score);
  showResult(verdict, analysis.score, analysis.flags, type, text);
}

function saveScan(input, type, result, score) {
  const scans = JSON.parse(sessionStorage.getItem('scamshield_scans') || '[]');
  scans.push({
    input: input.length > 80 ? input.slice(0, 80) + '…' : input,
    type,
    result,
    score,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  });
  sessionStorage.setItem('scamshield_scans', JSON.stringify(scans));
}

function showResult(verdict, score, flags, type, rawInput) {
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
  if (flags.length > 0) {
    const flagMessages = type === 'url'
      ? flags.map(f => `Suspicious URL pattern matched: <code>${f}</code>`)
      : flags.map(f => `Scam keyword detected: "<strong>${f}</strong>"`);

    flagsEl.innerHTML = flagMessages.map(msg =>
      `<div class="flag-item"><span>🔴</span><span>${msg}</span></div>`
    ).join('');
  } else {
    flagsEl.innerHTML = `<div class="flag-item"><span>🟢</span><span>No specific red flags found in the content.</span></div>`;
  }

  panel.style.display = 'flex';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
