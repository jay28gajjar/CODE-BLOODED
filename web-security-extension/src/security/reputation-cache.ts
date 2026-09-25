import { SecurityResult, CachedSecurityResult, RiskLevel } from '../types/security';

class ReputationCache {
  private memoryCache: Map<string, CachedSecurityResult>;
  private readonly TTL_LOW_RISK = 30 * 60 * 1000;
  private readonly TTL_UNKNOWN = 10 * 60 * 1000;
  private readonly TTL_SUSPICIOUS = 5 * 60 * 1000;
  private readonly TTL_HIGH = 2 * 60 * 1000;
  private readonly MAX_MEMORY_SIZE = 500;
  private loaded = false;

  constructor() {
    this.memoryCache = new Map();
  }

  private async loadFromStorage(): Promise<void> {
    if (this.loaded || typeof chrome === 'undefined' || !chrome.storage) return;
    try {
      const data = await chrome.storage.local.get('reputationCache');
      if (data.reputationCache) {
        const entries = JSON.parse(data.reputationCache);
        for (const entry of entries) {
          if (!this.isExpired(entry)) {
            this.memoryCache.set(entry.key, entry);
          }
        }
      }
      this.loaded = true;
    } catch (e) {
      console.warn('Failed to load reputation cache', e);
    }
  }

  private async saveToStorage(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    try {
      const entries = Array.from(this.memoryCache.values()).filter(e => !this.isExpired(e));
      await chrome.storage.local.set({ reputationCache: JSON.stringify(entries) });
    } catch (e) {
      console.warn('Failed to save reputation cache', e);
    }
  }

  async get(key: string): Promise<SecurityResult | null> {
    await this.loadFromStorage();
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.memoryCache.delete(key);
      await this.saveToStorage();
      return null;
    }
    const result = { ...entry.result, isCached: true };
    return result;
  }

  async set(key: string, url: string, result: SecurityResult): Promise<void> {
    await this.loadFromStorage();
    
    if (this.memoryCache.size >= this.MAX_MEMORY_SIZE) {
      this.evictOldest();
    }

    const entry: CachedSecurityResult = {
      key,
      url,
      result: { ...result, isCached: true },
      timestamp: Date.now(),
      expiresAt: Date.now() + this.getTTL(result.riskLevel)
    };

    this.memoryCache.set(key, entry);
    await this.saveToStorage();
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.remove('reputationCache');
    }
  }

  private isExpired(entry: CachedSecurityResult): boolean {
    return Date.now() > entry.expiresAt;
  }

  private getTTL(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case 'HIGH': return this.TTL_HIGH;
      case 'SUSPICIOUS': return this.TTL_SUSPICIOUS;
      case 'LOW': return this.TTL_LOW_RISK;
      case 'UNKNOWN': return this.TTL_UNKNOWN;
      default: return this.TTL_UNKNOWN;
    }
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Infinity;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }
}

export const reputationCache = new ReputationCache();
