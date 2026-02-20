import { Campaign } from "./contract";

const CACHE_TTL_MS = 30_000; // 30 seconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CampaignCache {
  private campaigns = new Map<number, CacheEntry<Campaign>>();
  private count: CacheEntry<number> | null = null;

  isValid(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_TTL_MS;
  }

  getCampaign(id: number): Campaign | null {
    const entry = this.campaigns.get(id);
    if (entry && this.isValid(entry.timestamp)) {
      return entry.data;
    }
    return null;
  }

  setCampaign(id: number, campaign: Campaign): void {
    this.campaigns.set(id, { data: campaign, timestamp: Date.now() });
  }

  getCount(): number | null {
    if (this.count && this.isValid(this.count.timestamp)) {
      return this.count.data;
    }
    return null;
  }

  setCount(count: number): void {
    this.count = { data: count, timestamp: Date.now() };
  }

  invalidate(): void {
    this.campaigns.clear();
    this.count = null;
  }

  invalidateCampaign(id: number): void {
    this.campaigns.delete(id);
    this.count = null;
  }
}

export const campaignCache = new CampaignCache();
