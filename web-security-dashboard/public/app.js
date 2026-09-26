// Web Security Shield Dashboard Client App
const API_BASE = window.location.origin;

let currentRiskFilter = 'ALL';
let currentSearch = '';
let currentSession = null;
let pollTimer = null;
let allActivities = [];

// Available Models by Provider
const PROVIDER_MODELS = {
  gemini: [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fastest, High Precision)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Deepest Analysis)' }
  ],
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Recommended & Cost-Effective)' },
    { id: 'gpt-4o', name: 'GPT-4o (Flagship Multimodal)' }
  ],
  anthropic: [
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Sub-second Intelligence)' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (State-of-the-Art)' }
  ],
  groq: [
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra Low Latency)' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' }
  ],
  none: [
    { id: 'none', name: 'Local Heuristics Only (No AI Model)' }
  ]
};

// ── DOM ELEMENTS ─────────────────────────────────────────────────────────────
const statSafetyScore = document.getElementById('statSafetyScore');
const statTotalScans = document.getElementById('statTotalScans');
const statBlocked = document.getElementById('statBlocked');
const statSuspicious = document.getElementById('statSuspicious');
const statClean = document.getElementById('statClean');
const activityTableBody = document.getElementById('activityTableBody');
const searchInput = document.getElementById('searchInput');
const riskFilters = document.getElementById('riskFilters');
const dashboardUrlInput = document.getElementById('dashboardUrlInput');
const sessionTokenInput = document.getElementById('sessionTokenInput');
const selectAiProvider = document.getElementById('selectAiProvider');
const selectAiModel = document.getElementById('selectAiModel');
const aiKeysForm = document.getElementById('aiKeysForm');
const btnTestAi = document.getElementById('btnTestAi');
const aiTestResult = document.getElementById('aiTestResult');
const testResultTitle = document.getElementById('testResultTitle');
const testResultLatency = document.getElementById('testResultLatency');
const testResultOutput = document.getElementById('testResultOutput');
const activeAiBadge = document.getElementById('activeAiBadge');
const detailModal = document.getElementById('detailModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const btnModalClose = document.getElementById('btnModalClose');

// ── 1. INITIALIZATION ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  dashboardUrlInput.value = API_BASE;
  await loadSession();
  await refreshAll();

  // Set up polling for real-time telemetry (every 3 seconds)
  pollTimer = setInterval(async () => {
    await fetchStats();
    await fetchActivities(false); // quiet refresh
  }, 3000);

  setupEventListeners();
});

// ── 2. EVENT LISTENERS ───────────────────────────────────────────────────────

function setupEventListeners() {
  // Search input
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.trim().toLowerCase();
    renderActivities();
  });

  // Risk filter pills
  riskFilters.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      riskFilters.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRiskFilter = btn.dataset.risk;
      renderActivities();
    });
  });

  // Copy buttons
  document.getElementById('btnCopyUrl').addEventListener('click', () => {
    navigator.clipboard.writeText(dashboardUrlInput.value);
    showToast('Copied Dashboard URL!');
  });

  document.getElementById('btnCopyToken').addEventListener('click', () => {
    navigator.clipboard.writeText(sessionTokenInput.value);
    showToast('Copied Pairing Token!');
  });

  // Regenerate token
  document.getElementById('btnRegenToken').addEventListener('click', async () => {
    if (!confirm('Regenerate pairing token? You will need to update the token in your Chrome extension.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/session/regenerate-token`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        sessionTokenInput.value = data.token;
        showToast('Generated fresh pairing token');
      }
    } catch (e) {
      alert('Failed to regenerate token: ' + e.message);
    }
  });

  // AI Provider change -> update model dropdown & visible key field
  selectAiProvider.addEventListener('change', () => {
    updateModelDropdown(selectAiProvider.value);
    updateVisibleKeyGroup(selectAiProvider.value);
  });

  // Key Visibility toggles
  document.querySelectorAll('.btn-toggle-vis').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetInput = document.getElementById(btn.dataset.target);
      if (targetInput.type === 'password') {
        targetInput.type = 'text';
        btn.textContent = '🔒';
      } else {
        targetInput.type = 'password';
        btn.textContent = '👁️';
      }
    });
  });

  // Save AI Keys Form
  aiKeysForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const provider = selectAiProvider.value;
    const model = selectAiModel.value;

    const payload = {
      aiProvider: provider,
      aiModel: model,
      keys: {
        gemini: document.getElementById('keyGemini').value,
        openai: document.getElementById('keyOpenAI').value,
        anthropic: document.getElementById('keyAnthropic').value,
        groq: document.getElementById('keyGroq').value
      }
    };

    try {
      const res = await fetch(`${API_BASE}/api/session/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Saved API Session & Keys!');
        await loadSession();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  });

  // Test Live AI Button
  btnTestAi.addEventListener('click', async () => {
    const provider = selectAiProvider.value;
    const model = selectAiModel.value;
    
    // Get entered key, or fall back to stored key
    let keyInput = '';
    if (provider === 'gemini') keyInput = document.getElementById('keyGemini').value;
    if (provider === 'openai') keyInput = document.getElementById('keyOpenAI').value;
    if (provider === 'anthropic') keyInput = document.getElementById('keyAnthropic').value;
    if (provider === 'groq') keyInput = document.getElementById('keyGroq').value;

    aiTestResult.style.display = 'block';
    testResultTitle.textContent = `Connecting to ${provider.toUpperCase()}...`;
    testResultLatency.textContent = 'Testing...';
    testResultOutput.textContent = 'Sending simulated phishing detection challenge...';

    try {
      const res = await fetch(`${API_BASE}/api/session/test-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          apiKey: keyInput || undefined
        })
      });
      const data = await res.json();

      if (data.success) {
        testResultTitle.textContent = `✓ ${data.provider.toUpperCase()} Ready`;
        testResultLatency.textContent = `${data.latencyMs}ms`;
        testResultOutput.textContent = JSON.stringify(data.aiResponse, null, 2);
      } else {
        testResultTitle.textContent = `✗ Connection Failed`;
        testResultLatency.textContent = `${data.latencyMs || 0}ms`;
        testResultOutput.textContent = `Error: ${data.error}`;
      }
    } catch (err) {
      testResultTitle.textContent = `✗ Request Error`;
      testResultLatency.textContent = 'Error';
      testResultOutput.textContent = err.message;
    }
  });

  // Export Buttons
  document.getElementById('btnExportJson').addEventListener('click', () => {
    window.location.href = `${API_BASE}/api/activity/export?format=json`;
  });

  document.getElementById('btnExportCsv').addEventListener('click', () => {
    window.location.href = `${API_BASE}/api/activity/export?format=csv`;
  });

  // Clear History
  document.getElementById('btnClearHistory').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all recorded activity logs?')) return;
    try {
      await fetch(`${API_BASE}/api/activity`, { method: 'DELETE' });
      showToast('Activity history cleared.');
      await refreshAll();
    } catch (e) {
      alert('Failed to clear: ' + e.message);
    }
  });

  // Manual Refresh
  document.getElementById('btnRefreshActivity').addEventListener('click', () => {
    refreshAll();
  });

  // Modal Close
  btnModalClose.addEventListener('click', () => {
    detailModal.style.display = 'none';
  });
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) detailModal.style.display = 'none';
  });
}

// ── 3. DATA FETCHING ─────────────────────────────────────────────────────────

async function refreshAll() {
  await Promise.all([
    fetchStats(),
    fetchActivities(true)
  ]);
}

async function loadSession() {
  try {
    const res = await fetch(`${API_BASE}/api/session`);
    const data = await res.json();
    if (data.success) {
      currentSession = data;
      sessionTokenInput.value = data.token;
      selectAiProvider.value = data.aiProvider || 'gemini';
      
      updateModelDropdown(data.aiProvider, data.aiModel);
      updateVisibleKeyGroup(data.aiProvider);

      // Key status pills
      setKeyStatus('statusGemini', data.keysConfigured.gemini, data.maskedKeys.gemini);
      setKeyStatus('statusOpenAI', data.keysConfigured.openai, data.maskedKeys.openai);
      setKeyStatus('statusAnthropic', data.keysConfigured.anthropic, data.maskedKeys.anthropic);
      setKeyStatus('statusGroq', data.keysConfigured.groq, data.maskedKeys.groq);

      // Badge
      activeAiBadge.textContent = (data.aiProvider || 'none').toUpperCase();
    }
  } catch (err) {
    console.error('Failed to load session:', err);
  }
}

function setKeyStatus(elemId, isConfigured, maskedVal) {
  const el = document.getElementById(elemId);
  if (!el) return;
  if (isConfigured) {
    el.textContent = `Configured (${maskedVal})`;
    el.className = 'key-status configured';
  } else {
    el.textContent = 'Not Configured';
    el.className = 'key-status missing';
  }
}

function updateModelDropdown(provider, selectedModel) {
  const models = PROVIDER_MODELS[provider] || PROVIDER_MODELS.gemini;
  selectAiModel.innerHTML = '';
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    if (selectedModel && m.id === selectedModel) {
      opt.selected = true;
    }
    selectAiModel.appendChild(opt);
  });
}

function updateVisibleKeyGroup(provider) {
  const groups = ['keyGroupGemini', 'keyGroupOpenAI', 'keyGroupAnthropic', 'keyGroupGroq'];
  groups.forEach(id => document.getElementById(id).style.display = 'none');

  if (provider === 'gemini') document.getElementById('keyGroupGemini').style.display = 'block';
  if (provider === 'openai') document.getElementById('keyGroupOpenAI').style.display = 'block';
  if (provider === 'anthropic') document.getElementById('keyGroupAnthropic').style.display = 'block';
  if (provider === 'groq') document.getElementById('keyGroupGroq').style.display = 'block';
}

async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    const data = await res.json();
    if (data.success) {
      statSafetyScore.textContent = `${data.safetyScore}%`;
      statTotalScans.textContent = data.totalScans.toLocaleString();
      statBlocked.textContent = data.threatsBlocked.toLocaleString();
      statSuspicious.textContent = data.suspicious.toLocaleString();
      statClean.textContent = data.cleanUrls.toLocaleString();

      // Counts for filter pills
      document.getElementById('countAll').textContent = data.totalScans;
      document.getElementById('countHigh').textContent = data.highRisk;
      document.getElementById('countSuspicious').textContent = data.suspicious;
      document.getElementById('countUnknown').textContent = data.unknown;
      document.getElementById('countLow').textContent = data.cleanUrls;
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

async function fetchActivities(showLoading = false) {
  if (showLoading && allActivities.length === 0) {
    activityTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-muted">Refreshing live telemetry...</td></tr>`;
  }

  try {
    const res = await fetch(`${API_BASE}/api/activity?limit=100`);
    const data = await res.json();
    if (data.success) {
      allActivities = data.activities || [];
      renderActivities();
    }
  } catch (err) {
    console.error('Error fetching activities:', err);
  }
}

// ── 4. TABLE RENDERING ───────────────────────────────────────────────────────

function renderActivities() {
  let list = allActivities;

  // Filter by Risk
  if (currentRiskFilter !== 'ALL') {
    list = list.filter(a => a.riskLevel.toUpperCase() === currentRiskFilter.toUpperCase());
  }

  // Filter by Search Query
  if (currentSearch) {
    list = list.filter(a => 
      a.url.toLowerCase().includes(currentSearch) ||
      a.domain.toLowerCase().includes(currentSearch) ||
      (a.indicators || []).some(i => i.message.toLowerCase().includes(currentSearch))
    );
  }

  if (list.length === 0) {
    activityTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-muted">
          No security events matching this filter.
        </td>
      </tr>
    `;
    return;
  }

  activityTableBody.innerHTML = list.map(item => {
    const riskClass = getRiskPillClass(item.riskLevel);
    const eventBadge = getEventTypeBadge(item.eventType);
    const scoreColor = getScoreColor(item.score);
    const formattedTime = formatTime(item.timestamp);

    const indicatorTags = (item.indicators || []).slice(0, 2).map(ind => `
      <span class="indicator-tag" onclick="showDetailModal('${item.id}')">${escapeHtml(ind.message)}</span>
    `).join('');

    const moreCount = (item.indicators || []).length > 2 
      ? `<span class="indicator-tag" onclick="showDetailModal('${item.id}')">+${item.indicators.length - 2} more</span>` 
      : '';

    return `
      <tr>
        <td><span class="risk-pill ${riskClass}">${item.riskLevel}</span></td>
        <td><span class="score-badge-table" style="color: ${scoreColor}">${item.score}/100</span></td>
        <td class="domain-cell">
          <div class="domain-title" title="${escapeHtml(item.domain)}">${escapeHtml(item.domain)}</div>
          <div class="url-sub" title="${escapeHtml(item.url)}">${escapeHtml(item.url)}</div>
        </td>
        <td>${eventBadge}</td>
        <td>
          <div class="indicator-tags">
            ${indicatorTags || '<span class="text-dim text-xs">No threats detected</span>'}
            ${moreCount}
          </div>
        </td>
        <td class="time-cell">${formattedTime}</td>
      </tr>
    `;
  }).join('');
}

// ── 5. HELPERS & MODAL ───────────────────────────────────────────────────────

function getRiskPillClass(level) {
  switch ((level || '').toUpperCase()) {
    case 'HIGH': return 'risk-pill-high';
    case 'SUSPICIOUS': return 'risk-pill-suspicious';
    case 'LOW': return 'risk-pill-low';
    default: return 'risk-pill-unknown';
  }
}

function getEventTypeBadge(type) {
  if (type === 'NAVIGATION_BLOCKED') {
    return `<span class="event-type-badge event-type-blocked">🚫 BLOCKED</span>`;
  }
  if (type === 'PAGE_SCAN') {
    return `<span class="event-type-badge">📄 Page Scan</span>`;
  }
  if (type === 'EMAIL_SCAN') {
    return `<span class="event-type-badge">✉️ Email Link</span>`;
  }
  return `<span class="event-type-badge">🔍 Link Hover</span>`;
}

function getScoreColor(score) {
  if (score >= 75) return '#ef4444';
  if (score >= 50) return '#f59e0b';
  if (score >= 20) return '#94a3b8';
  return '#10b981';
}

function formatTime(timestamp) {
  if (!timestamp) return 'Just now';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  const d = new Date(timestamp);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.showDetailModal = function(id) {
  const item = allActivities.find(a => a.id === id);
  if (!item) return;

  modalTitle.textContent = `Inspection: ${item.domain}`;
  modalBody.innerHTML = `
    <div style="margin-bottom: 16px;">
      <div style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Destination URL</div>
      <div style="font-family: monospace; font-size: 0.85rem; color: #38bdf8; word-break: break-all; margin-top: 4px;">
        ${escapeHtml(item.url)}
      </div>
    </div>

    <div style="display: flex; gap: 16px; margin-bottom: 20px;">
      <div style="flex: 1; background: #0f172a; padding: 12px; border-radius: 8px;">
        <div style="font-size: 0.75rem; color: #94a3b8;">Risk Level</div>
        <div style="font-size: 1.1rem; font-weight: 700;" class="${getRiskPillClass(item.riskLevel)}">${item.riskLevel}</div>
      </div>
      <div style="flex: 1; background: #0f172a; padding: 12px; border-radius: 8px;">
        <div style="font-size: 0.75rem; color: #94a3b8;">Threat Score</div>
        <div style="font-size: 1.1rem; font-weight: 700; color: ${getScoreColor(item.score)};">${item.score} / 100</div>
      </div>
      <div style="flex: 1; background: #0f172a; padding: 12px; border-radius: 8px;">
        <div style="font-size: 0.75rem; color: #94a3b8;">Event Trigger</div>
        <div style="font-size: 0.95rem; font-weight: 600; color: #fff;">${item.eventType}</div>
      </div>
    </div>

    <h4 style="font-size: 0.95rem; color: #fff; margin-bottom: 10px;">Detected Threat Indicators (${(item.indicators || []).length})</h4>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${(item.indicators && item.indicators.length > 0) ? item.indicators.map(ind => `
        <div style="background: rgba(30, 41, 59, 0.8); border-left: 3px solid #f59e0b; padding: 10px 12px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 600; font-size: 0.85rem; color: #fde68a;">${escapeHtml(ind.code || 'THREAT')}</span>
            <span style="font-size: 0.75rem; font-family: monospace; color: #ef4444;">+${ind.score} pts</span>
          </div>
          <p style="font-size: 0.82rem; color: #cbd5e1; margin-top: 4px;">${escapeHtml(ind.message)}</p>
        </div>
      `).join('') : '<p style="color: #10b981; font-size: 0.85rem;">✓ No adverse threat indicators identified.</p>'}
    </div>
  `;

  detailModal.style.display = 'flex';
};

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #38bdf8;
    color: #0b1120;
    padding: 10px 18px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.85rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    z-index: 9999;
    transition: opacity 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}
