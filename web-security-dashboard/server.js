import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = join(__dirname, 'data');
const DB_FILE = join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Default Database Structure
const DEFAULT_DB = {
  session: {
    token: 'wss_sec_' + crypto.randomBytes(8).toString('hex'),
    aiProvider: 'gemini', // 'gemini' | 'openai' | 'anthropic' | 'groq' | 'none'
    aiModel: 'gemini-1.5-flash',
    aiKeys: {
      gemini: '',
      openai: '',
      anthropic: '',
      groq: ''
    },
    sensitivity: 'medium',
    createdAt: Date.now(),
    lastActive: Date.now()
  },
  activities: [
    {
      id: 'act_demo_1',
      url: 'https://google.com/search?q=cybersecurity',
      domain: 'google.com',
      riskLevel: 'LOW',
      score: 5,
      indicators: [
        { code: 'HTTPS_VALID', message: 'Valid secure HTTPS protocol', score: 0 }
      ],
      eventType: 'HOVER_SCAN',
      timestamp: Date.now() - 3600000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    {
      id: 'act_demo_2',
      url: 'https://paypal-verify-billing-account.xyz/login',
      domain: 'paypal-verify-billing-account.xyz',
      riskLevel: 'HIGH',
      score: 95,
      indicators: [
        { code: 'BRAND_IMPERSONATION', message: 'Domain impersonates brand: paypal', score: 35 },
        { code: 'SUSPICIOUS_PATH', message: 'Path contains authentication keyword: /login', score: 20 },
        { code: 'SUSPICIOUS_TLD', message: 'Uses high-abuse registry TLD: .xyz', score: 15 },
        { code: 'DOMAIN_LENGTH', message: 'Unusually long lookalike domain name', score: 10 }
      ],
      eventType: 'NAVIGATION_BLOCKED',
      timestamp: Date.now() - 1800000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    {
      id: 'act_demo_3',
      url: 'https://tinyurl.com/meeting-urgent-doc',
      domain: 'tinyurl.com',
      riskLevel: 'UNKNOWN',
      score: 25,
      indicators: [
        { code: 'URL_SHORTENER', message: 'Concealed destination via URL shortener', score: 10 },
        { code: 'SUSPICIOUS_PATH', message: 'Path mentions urgent / document keyword', score: 10 }
      ],
      eventType: 'HOVER_SCAN',
      timestamp: Date.now() - 900000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  ]
};

// Database Read/Write Helpers
function loadDB() {
  try {
    if (existsSync(DB_FILE)) {
      const raw = readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      // Ensure structure completeness
      if (!data.session) data.session = { ...DEFAULT_DB.session };
      if (!data.session.aiKeys) data.session.aiKeys = { ...DEFAULT_DB.session.aiKeys };
      if (!data.activities) data.activities = [];
      return data;
    }
  } catch (err) {
    console.error('Failed to load database file, resetting to defaults:', err);
  }
  saveDB(DEFAULT_DB);
  return DEFAULT_DB;
}

function saveDB(data) {
  try {
    writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database file:', err);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));

// Helper to mask sensitive keys
function maskKey(key) {
  if (!key || typeof key !== 'string') return '';
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

// ── 1. SESSION & API KEY MANAGEMENT ──────────────────────────────────────────

app.get('/api/session', (req, res) => {
  const db = loadDB();
  const session = db.session;
  
  res.json({
    success: true,
    token: session.token,
    aiProvider: session.aiProvider,
    aiModel: session.aiModel,
    sensitivity: session.sensitivity,
    keysConfigured: {
      gemini: !!session.aiKeys.gemini,
      openai: !!session.aiKeys.openai,
      anthropic: !!session.aiKeys.anthropic,
      groq: !!session.aiKeys.groq
    },
    maskedKeys: {
      gemini: maskKey(session.aiKeys.gemini),
      openai: maskKey(session.aiKeys.openai),
      anthropic: maskKey(session.aiKeys.anthropic),
      groq: maskKey(session.aiKeys.groq)
    },
    totalActivities: db.activities.length,
    lastActive: session.lastActive
  });
});

app.post('/api/session/regenerate-token', (req, res) => {
  const db = loadDB();
  db.session.token = 'wss_sec_' + crypto.randomBytes(8).toString('hex');
  db.session.lastActive = Date.now();
  saveDB(db);
  res.json({ success: true, token: db.session.token });
});

app.post('/api/session/keys', (req, res) => {
  const { aiProvider, aiModel, sensitivity, keys } = req.body;
  const db = loadDB();

  if (aiProvider) db.session.aiProvider = aiProvider;
  if (aiModel) db.session.aiModel = aiModel;
  if (sensitivity) db.session.sensitivity = sensitivity;

  if (keys && typeof keys === 'object') {
    if (keys.gemini !== undefined) db.session.aiKeys.gemini = keys.gemini.trim();
    if (keys.openai !== undefined) db.session.aiKeys.openai = keys.openai.trim();
    if (keys.anthropic !== undefined) db.session.aiKeys.anthropic = keys.anthropic.trim();
    if (keys.groq !== undefined) db.session.aiKeys.groq = keys.groq.trim();
  }

  db.session.lastActive = Date.now();
  saveDB(db);

  res.json({
    success: true,
    message: 'API Session & Keys saved successfully',
    aiProvider: db.session.aiProvider,
    aiModel: db.session.aiModel,
    keysConfigured: {
      gemini: !!db.session.aiKeys.gemini,
      openai: !!db.session.aiKeys.openai,
      anthropic: !!db.session.aiKeys.anthropic,
      groq: !!db.session.aiKeys.groq
    }
  });
});

// ── 2. AI CONNECTION TEST SANDBOX ────────────────────────────────────────────

app.post('/api/session/test-ai', async (req, res) => {
  const { provider, apiKey, model } = req.body;
  const db = loadDB();

  const chosenProvider = provider || db.session.aiProvider;
  const chosenKey = apiKey ? apiKey.trim() : db.session.aiKeys[chosenProvider];
  const chosenModel = model || db.session.aiModel;

  if (!chosenKey) {
    return res.status(400).json({
      success: false,
      error: `No API key provided for ${chosenProvider.toUpperCase()}. Please insert a key first.`
    });
  }

  const samplePrompt = `You are a web security and anti-phishing AI analyzer.
Analyze this sample URL and respond in strict JSON:
URL: https://apple-id-verify-security.top/account/login?ref=auth

JSON format:
{
  "riskLevel": "HIGH",
  "confidence": 0.98,
  "reasons": ["Impersonates Apple brand on a .top TLD", "Credential harvesting path /account/login"],
  "summary": "High risk phishing link designed to steal Apple credentials."
}`;

  const startTime = Date.now();

  try {
    let result = null;

    if (chosenProvider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel || 'gemini-1.5-flash'}:generateContent?key=${chosenKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: samplePrompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google Gemini API Error (${response.status}): ${errText}`);
      }
      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      result = JSON.parse(rawText);

    } else if (chosenProvider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${chosenKey}`
        },
        body: JSON.stringify({
          model: chosenModel || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an anti-phishing cyber security analyzer. Return JSON only.' },
            { role: 'user', content: samplePrompt }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
      }
      const data = await response.json();
      result = JSON.parse(data.choices[0].message.content);

    } else if (chosenProvider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': chosenKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: chosenModel || 'claude-3-5-haiku-20241022',
          max_tokens: 300,
          messages: [{ role: 'user', content: samplePrompt }]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic Claude API Error (${response.status}): ${errText}`);
      }
      const data = await response.json();
      const content = data.content?.[0]?.text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };

    } else if (chosenProvider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${chosenKey}`
        },
        body: JSON.stringify({
          model: chosenModel || 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'You are an anti-phishing cyber security analyzer. Return JSON only.' },
            { role: 'user', content: samplePrompt }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API Error (${response.status}): ${errText}`);
      }
      const data = await response.json();
      result = JSON.parse(data.choices[0].message.content);

    } else {
      throw new Error(`Unsupported AI Provider: ${chosenProvider}`);
    }

    const latency = Date.now() - startTime;
    res.json({
      success: true,
      provider: chosenProvider,
      model: chosenModel,
      latencyMs: latency,
      message: `Successfully connected to ${chosenProvider.toUpperCase()} (${latency}ms)`,
      aiResponse: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      provider: chosenProvider,
      latencyMs: Date.now() - startTime,
      error: error.message || 'AI request failed'
    });
  }
});

// ── 3. AI PHISHING ANALYZER PROXY (CALLED BY CHROME EXTENSION) ───────────────

app.post('/api/ai/analyze', async (req, res) => {
  const { url, domain, pageText, emailContent, indicators } = req.body;
  const db = loadDB();
  const { aiProvider, aiKeys, aiModel } = db.session;

  if (aiProvider === 'none' || !aiKeys[aiProvider]) {
    return res.status(400).json({
      success: false,
      error: 'AI analysis is disabled or no API key is configured on the dashboard.'
    });
  }

  const prompt = `Analyze this web resource for phishing, credential theft, and brand impersonation:
Destination URL: ${url}
Domain: ${domain}
Existing Detected Indicators: ${JSON.stringify(indicators || [])}
${pageText ? `Page Snippet: ${pageText.slice(0, 500)}` : ''}
${emailContent ? `Email Context: ${emailContent.slice(0, 500)}` : ''}

Respond in strict JSON with:
{
  "riskLevel": "LOW" | "UNKNOWN" | "SUSPICIOUS" | "HIGH",
  "confidence": 0.0 to 1.0,
  "reasons": ["concise reason 1", "concise reason 2"],
  "summary": "1 sentence explainable conclusion"
}`;

  try {
    const apiKey = aiKeys[aiProvider];
    let aiResult = null;

    if (aiProvider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      const data = await response.json();
      aiResult = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');

    } else if (aiProvider === 'openai' || aiProvider === 'groq') {
      const baseUrl = aiProvider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.groq.com/openai/v1';
      const defaultModel = aiProvider === 'openai' ? 'gpt-4o-mini' : 'llama-3.1-8b-instant';
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: aiModel || defaultModel,
          messages: [
            { role: 'system', content: 'You are an anti-phishing cyber security analyzer. Return JSON only.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });
      const data = await response.json();
      aiResult = JSON.parse(data.choices[0].message.content);

    } else if (aiProvider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: aiModel || 'claude-3-5-haiku-20241022',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await response.json();
      const content = data.content?.[0]?.text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    }

    res.json({ success: true, aiResult });

  } catch (error) {
    console.error('Cloud AI analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── 4. ACTIVITY TELEMETRY & REPORTING ─────────────────────────────────────────

// Ingest scan or click event from extension
app.post('/api/activity', (req, res) => {
  const { event } = req.body;
  if (!event || !event.url) {
    return res.status(400).json({ success: false, error: 'Invalid activity payload' });
  }

  const db = loadDB();
  const newActivity = {
    id: 'act_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
    url: event.url,
    domain: event.domain || new URL(event.url).hostname,
    riskLevel: event.riskLevel || 'UNKNOWN',
    score: typeof event.score === 'number' ? event.score : 0,
    indicators: Array.isArray(event.indicators) ? event.indicators : [],
    eventType: event.eventType || 'HOVER_SCAN', // 'HOVER_SCAN' | 'NAVIGATION_BLOCKED' | 'PAGE_SCAN'
    timestamp: event.timestamp || Date.now(),
    userAgent: req.headers['user-agent'] || 'Chrome Extension'
  };

  db.activities.unshift(newActivity);
  // Cap at 2,000 entries
  if (db.activities.length > 2000) {
    db.activities = db.activities.slice(0, 2000);
  }
  db.session.lastActive = Date.now();
  saveDB(db);

  res.json({ success: true, id: newActivity.id });
});

// Query activities with search and risk filters
app.get('/api/activity', (req, res) => {
  const { search, risk, limit = 50, offset = 0 } = req.query;
  const db = loadDB();
  let list = db.activities;

  if (risk && risk !== 'ALL') {
    list = list.filter(a => a.riskLevel.toUpperCase() === risk.toUpperCase());
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(a => 
      a.url.toLowerCase().includes(q) ||
      a.domain.toLowerCase().includes(q) ||
      a.indicators.some(i => i.message.toLowerCase().includes(q))
    );
  }

  const total = list.length;
  const paginated = list.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    success: true,
    total,
    activities: paginated
  });
});

// Clear activity history
app.delete('/api/activity', (req, res) => {
  const db = loadDB();
  db.activities = [];
  saveDB(db);
  res.json({ success: true, message: 'All activity records cleared.' });
});

// Export activity as JSON or CSV
app.get('/api/activity/export', (req, res) => {
  const { format = 'json' } = req.query;
  const db = loadDB();

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="web-security-activity.csv"');

    const headers = 'ID,Timestamp,Date,RiskLevel,Score,Domain,URL,EventType,ThreatIndicators\n';
    const rows = db.activities.map(a => {
      const dateStr = new Date(a.timestamp).toISOString();
      const inds = (a.indicators || []).map(i => i.message).join(' | ').replace(/"/g, '""');
      return `"${a.id}","${a.timestamp}","${dateStr}","${a.riskLevel}",${a.score},"${a.domain}","${a.url}","${a.eventType}","${inds}"`;
    }).join('\n');

    return res.send(headers + rows);
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="web-security-activity.json"');
  res.send(JSON.stringify(db.activities, null, 2));
});

// Aggregated security statistics
app.get('/api/stats', (req, res) => {
  const db = loadDB();
  const total = db.activities.length;
  const high = db.activities.filter(a => a.riskLevel === 'HIGH').length;
  const suspicious = db.activities.filter(a => a.riskLevel === 'SUSPICIOUS').length;
  const unknown = db.activities.filter(a => a.riskLevel === 'UNKNOWN').length;
  const low = db.activities.filter(a => a.riskLevel === 'LOW').length;
  const blocked = db.activities.filter(a => a.eventType === 'NAVIGATION_BLOCKED').length;

  // Safety Score: 100 - weighted threat impact
  let safetyScore = 100;
  if (total > 0) {
    const dangerRatio = (high * 1.0 + suspicious * 0.5 + unknown * 0.1) / total;
    safetyScore = Math.max(10, Math.round(100 - (dangerRatio * 80)));
  }

  // Frequency of top domains
  const domainCounts = {};
  db.activities.forEach(a => {
    domainCounts[a.domain] = (domainCounts[a.domain] || 0) + 1;
  });
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  res.json({
    success: true,
    totalScans: total,
    threatsBlocked: blocked,
    highRisk: high,
    suspicious,
    unknown,
    cleanUrls: low,
    safetyScore,
    topDomains,
    lastScanTime: total > 0 ? db.activities[0].timestamp : null
  });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🛡️  Web Security Shield Central Console is running!`);
  console.log(`🌐 Dashboard URL: http://localhost:${PORT}`);
  console.log(`🔗 API Endpoint:  http://localhost:${PORT}/api/session`);
  console.log(`======================================================\n`);
});
