import type { ExtensionSettings, ScanHistoryEntry } from '../types/security';
import { DEFAULT_SETTINGS } from '../types/security';

export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  HISTORY: 'scanHistory',
  CACHE: 'urlCache',
} as const;

export async function getSettings(): Promise<ExtensionSettings> {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const stored = data[STORAGE_KEYS.SETTINGS] || {};
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch (error) {
    console.error('Failed to get settings', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
  } catch (error) {
    console.error('Failed to save settings', error);
  }
}

export async function getScanHistory(): Promise<ScanHistoryEntry[]> {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    return data[STORAGE_KEYS.HISTORY] || [];
  } catch (error) {
    console.error('Failed to get scan history', error);
    return [];
  }
}

export async function addToHistory(entry: Omit<ScanHistoryEntry, 'id'>): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.storeScanHistory) return;

    const history = await getScanHistory();
    const newEntry: ScanHistoryEntry = {
      ...entry,
      id: crypto.randomUUID()
    };
    
    // Add to beginning and limit to 500
    const updated = [newEntry, ...history].slice(0, 500);
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updated });
  } catch (error) {
    console.error('Failed to add to history', error);
  }
}

export async function clearCache(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEYS.CACHE);
  } catch (error) {
    console.error('Failed to clear cache', error);
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEYS.HISTORY);
  } catch (error) {
    console.error('Failed to clear history', error);
  }
}
