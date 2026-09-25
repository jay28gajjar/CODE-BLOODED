import { analyzeURLForPhishing } from '../security/phishing-detector';
import { calculateRisk } from '../security/risk-engine';
import { reputationCache } from '../security/reputation-cache';
import { ThreatIntelAggregator } from '../providers/threat-intelligence';
import { GoogleSafeBrowsingProvider } from '../providers/google-safe-browsing';
import { VirusTotalProvider } from '../providers/virustotal';
import {
  getSettings, saveSettings, getScanHistory,
  addToHistory, clearCache
} from '../utils/storage';
import { getURLKey, isValidHTTPURL } from '../utils/url-utils';
import { logger } from '../utils/logger';
import type {
  ExtensionMessage, SecurityResult, AnalyzeURLPayload,
  ExtensionSettings, ScanHistoryEntry
} from '../types/security';

// ── Message Handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => {
  (async () => {
    try {
      switch (message.type) {
        case 'ANALYZE_URL': {
          const payload = message.payload as AnalyzeURLPayload;
          const result = await handleAnalyzeURL(payload.url);
          sendResponse(result);
          break;
        }
        case 'ANALYZE_PAGE':
        case 'ANALYZE_EMAIL':
          // Content scripts send pre-analysed results; just echo back
          sendResponse({ success: true, result: message.payload });
          break;
        case 'GET_SETTINGS':
          sendResponse(await getSettings());
          break;
        case 'SAVE_SETTINGS':
          await saveSettings(message.payload as Partial<ExtensionSettings>);
          sendResponse({ success: true });
          break;
        case 'CLEAR_CACHE':
          await clearCache();
          sendResponse({ success: true });
          break;
        case 'GET_HISTORY':
          sendResponse(await getScanHistory());
          break;
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      logger.error('Error handling message:', error);
      sendResponse({ success: false, error: String(error) });
    }
  })();
  return true; // keep message channel open for async response
});

// ── Core URL Analysis Pipeline ───────────────────────────────────────────────
async function handleAnalyzeURL(url: string): Promise<{ success: boolean; result?: SecurityResult; error?: string }> {
  if (!isValidHTTPURL(url)) {
    return { success: false, error: 'Invalid HTTP URL' };
  }

  const cacheKey = getURLKey(url);

  // 1. Cache hit → return immediately
  const cached = await reputationCache.get(cacheKey);
  if (cached) {
    return { success: true, result: { ...cached, isCached: true } };
  }

  const settings = await getSettings();

  // 2. Local heuristic analysis
  const phishingAnalysis = analyzeURLForPhishing(url);
  let result = calculateRisk({
    url,
    phishingAnalysis: phishingAnalysis ?? undefined,
    settings,
  });

  // 3. Optional threat intelligence (requires API keys)
  if (settings.googleSafeBrowsingApiKey || settings.virusTotalApiKey) {
    try {
      const providers = [];
      if (settings.googleSafeBrowsingApiKey) providers.push(new GoogleSafeBrowsingProvider());
      if (settings.virusTotalApiKey) providers.push(new VirusTotalProvider());
      const aggregator = new ThreatIntelAggregator(providers);
      const threatIntel = await aggregator.checkURL(url, settings);

      if (threatIntel.isKnownMalicious) {
        result = calculateRisk({
          url,
          phishingAnalysis: phishingAnalysis ?? undefined,
          threatIntelResult: threatIntel,
          settings,
        });
      }
    } catch (err) {
      logger.error('Threat intelligence check failed:', err);
      // Non-fatal: continue with heuristic result
    }
  }

  // 4. Cache and optionally persist history
  await reputationCache.set(cacheKey, url, result);

  if (settings.storeScanHistory) {
    const entry: Omit<ScanHistoryEntry, 'id'> = {
      url: result.url,
      domain: result.domain,
      riskLevel: result.riskLevel,
      score: result.score,
      timestamp: Date.now(),
    };
    await addToHistory(entry);
  }

  return { success: true, result };
}

// ── Tab Navigation Tracking ──────────────────────────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Notify content script that navigation completed
    chrome.tabs.sendMessage(tabId, {
      type: 'PAGE_ANALYSIS_COMPLETE',
      payload: { url: tab.url },
    }).catch(() => {
      // Tab may not have a content script (chrome:// pages etc.)
    });
  }
});

// ── Periodic Cache Cleanup ───────────────────────────────────────────────────
chrome.alarms.create('cacheCleanup', { periodInMinutes: 720 }); // every 12 hours

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cacheCleanup') {
    reputationCache.clear().catch((err: unknown) => logger.error('Cache cleanup failed:', err));
  }
});

logger.info('Web Security Shield service worker initialized');
