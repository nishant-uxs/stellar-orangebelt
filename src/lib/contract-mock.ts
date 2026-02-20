import { Campaign, ContractEvent } from "./contract";

// Mock data for testing UI without deployed contract
const mockCampaigns: Map<number, Campaign> = new Map();
let mockCampaignCount = 0;
const mockEvents: ContractEvent[] = [];

// Initialize with sample campaigns
function initMockData() {
  if (mockCampaignCount === 0) {
    // Sample campaign 1
    mockCampaigns.set(0, {
      id: 0,
      creator: "GABC...XYZ",
      title: "Build a School in Rural Area",
      description: "Help us build a school for underprivileged children in rural communities.",
      target: BigInt(50000_0000000), // 50,000 XLM
      deadline: Date.now() / 1000 + 30 * 24 * 60 * 60, // 30 days from now
      raised: BigInt(15000_0000000), // 15,000 XLM raised
      claimed: false,
    });

    // Sample campaign 2
    mockCampaigns.set(1, {
      id: 1,
      creator: "GDEF...ABC",
      title: "Medical Equipment for Hospital",
      description: "Fundraising for critical medical equipment to save lives.",
      target: BigInt(100000_0000000), // 100,000 XLM
      deadline: Date.now() / 1000 + 45 * 24 * 60 * 60, // 45 days from now
      raised: BigInt(75000_0000000), // 75,000 XLM raised
      claimed: false,
    });

    // Sample campaign 3
    mockCampaigns.set(2, {
      id: 2,
      creator: "GHIJ...DEF",
      title: "Clean Water Project",
      description: "Provide clean drinking water to 1000 families.",
      target: BigInt(25000_0000000), // 25,000 XLM
      deadline: Date.now() / 1000 + 60 * 24 * 60 * 60, // 60 days from now
      raised: BigInt(5000_0000000), // 5,000 XLM raised
      claimed: false,
    });

    mockCampaignCount = 3;

    // Sample events
    mockEvents.push(
      {
        type: "create",
        ledger: 12345,
        timestamp: Date.now() - 3600000,
        data: { campaign_id: 0, creator: "GABC...XYZ" },
      },
      {
        type: "donate",
        ledger: 12346,
        timestamp: Date.now() - 1800000,
        data: { campaign_id: 0, donor: "GXYZ...ABC", amount: "5000" },
      },
      {
        type: "create",
        ledger: 12347,
        timestamp: Date.now() - 900000,
        data: { campaign_id: 1, creator: "GDEF...ABC" },
      }
    );
  }
}

export async function mockCreateCampaign(
  title: string,
  description: string,
  target: bigint,
  deadline: number
): Promise<string> {
  initMockData();
  
  await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay

  const campaignId = mockCampaignCount++;
  mockCampaigns.set(campaignId, {
    id: campaignId,
    creator: "YOUR_ADDRESS",
    title,
    description,
    target,
    deadline,
    raised: BigInt(0),
    claimed: false,
  });

  // Add event
  mockEvents.unshift({
    type: "create",
    ledger: 12340 + mockCampaignCount,
    timestamp: Date.now(),
    data: { campaign_id: campaignId, creator: "YOUR_ADDRESS" },
  });

  // Return mock transaction hash
  return `mock_tx_${Date.now()}_create_campaign_${campaignId}`;
}

export async function mockDonate(
  campaignId: number,
  amount: bigint
): Promise<string> {
  initMockData();
  
  await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay

  const campaign = mockCampaigns.get(campaignId);
  if (campaign) {
    campaign.raised += amount;
    mockCampaigns.set(campaignId, campaign);

    // Add event
    mockEvents.unshift({
      type: "donate",
      ledger: 12340 + mockEvents.length,
      timestamp: Date.now(),
      data: {
        campaign_id: campaignId,
        donor: "YOUR_ADDRESS",
        amount: amount.toString(),
      },
    });
  }

  // Return mock transaction hash
  return `mock_tx_${Date.now()}_donate_${campaignId}_${amount}`;
}

export async function mockGetCampaignCount(): Promise<number> {
  initMockData();
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockCampaignCount;
}

export async function mockGetCampaign(
  campaignId: number
): Promise<Campaign | null> {
  initMockData();
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockCampaigns.get(campaignId) || null;
}

export async function mockGetEvents(): Promise<ContractEvent[]> {
  initMockData();
  await new Promise((resolve) => setTimeout(resolve, 300));
  return [...mockEvents].slice(0, 10); // Return last 10 events
}
