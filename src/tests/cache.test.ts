import { describe, it, expect, beforeEach, vi } from "vitest";
import { campaignCache } from "@/lib/cache";
import type { Campaign } from "@/lib/contract";

const mockCampaign: Campaign = {
  id: 0,
  creator: "GCHL5O...NNEL",
  title: "Test Campaign",
  description: "A test campaign",
  target: BigInt(1_000_000_000),
  deadline: Math.floor(Date.now() / 1000) + 86400,
  raised: BigInt(0),
  claimed: false,
};

describe("CampaignCache", () => {
  beforeEach(() => {
    campaignCache.invalidate();
  });

  it("returns null for uncached campaign", () => {
    expect(campaignCache.getCampaign(0)).toBeNull();
  });

  it("returns null for uncached count", () => {
    expect(campaignCache.getCount()).toBeNull();
  });

  it("stores and retrieves a campaign", () => {
    campaignCache.setCampaign(0, mockCampaign);
    const result = campaignCache.getCampaign(0);
    expect(result).not.toBeNull();
    expect(result?.title).toBe("Test Campaign");
    expect(result?.id).toBe(0);
  });

  it("stores and retrieves campaign count", () => {
    campaignCache.setCount(5);
    expect(campaignCache.getCount()).toBe(5);
  });

  it("invalidate clears all campaigns and count", () => {
    campaignCache.setCampaign(0, mockCampaign);
    campaignCache.setCount(1);
    campaignCache.invalidate();
    expect(campaignCache.getCampaign(0)).toBeNull();
    expect(campaignCache.getCount()).toBeNull();
  });

  it("invalidateCampaign removes only that campaign", () => {
    const campaign1 = { ...mockCampaign, id: 1, title: "Campaign 1" };
    campaignCache.setCampaign(0, mockCampaign);
    campaignCache.setCampaign(1, campaign1);
    campaignCache.setCount(2);

    campaignCache.invalidateCampaign(0);

    expect(campaignCache.getCampaign(0)).toBeNull();
    expect(campaignCache.getCampaign(1)).not.toBeNull();
    expect(campaignCache.getCount()).toBeNull(); // count also cleared
  });

  it("returns stale cache as null after TTL expires", () => {
    vi.useFakeTimers();
    campaignCache.setCampaign(0, mockCampaign);
    campaignCache.setCount(1);

    // Advance time by 31 seconds (past 30s TTL)
    vi.advanceTimersByTime(31_000);

    expect(campaignCache.getCampaign(0)).toBeNull();
    expect(campaignCache.getCount()).toBeNull();

    vi.useRealTimers();
  });

  it("stores multiple campaigns independently", () => {
    const c1 = { ...mockCampaign, id: 0, title: "Alpha" };
    const c2 = { ...mockCampaign, id: 1, title: "Beta" };
    const c3 = { ...mockCampaign, id: 2, title: "Gamma" };

    campaignCache.setCampaign(0, c1);
    campaignCache.setCampaign(1, c2);
    campaignCache.setCampaign(2, c3);

    expect(campaignCache.getCampaign(0)?.title).toBe("Alpha");
    expect(campaignCache.getCampaign(1)?.title).toBe("Beta");
    expect(campaignCache.getCampaign(2)?.title).toBe("Gamma");
  });
});
