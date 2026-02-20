"use client";

import { useState, useEffect, useCallback } from "react";
import { WalletType, CONTRACT_ID, EXPLORER_URL } from "@/lib/constants";
import { getBalance } from "@/lib/wallet";
import { Campaign, getCampaignCount, getCampaign } from "@/lib/contract";
import WalletConnect from "@/components/WalletConnect";
import CampaignCard from "@/components/CampaignCard";
import CreateCampaign from "@/components/CreateCampaign";
import EventFeed from "@/components/EventFeed";
import {
  Rocket,
  Globe,
  Shield,
  Zap,
  RefreshCw,
  ExternalLink,
  Github,
} from "lucide-react";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [balance, setBalance] = useState("0");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      const count = await getCampaignCount();
      const loaded: Campaign[] = [];
      for (let i = 0; i < count; i++) {
        const campaign = await getCampaign(i);
        if (campaign) loaded.push(campaign);
      }
      setCampaigns(loaded);
    } catch (error) {
      console.error("Failed to load campaigns:", error);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    await fetchCampaigns();
    setLoading(false);
  }, [fetchCampaigns]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Auto-refresh campaigns every 15 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const count = await getCampaignCount();
        const loaded: Campaign[] = [];
        for (let i = 0; i < count; i++) {
          const campaign = await getCampaign(i);
          if (campaign) loaded.push(campaign);
        }
        setCampaigns(loaded);
      } catch {
        // silent fail on auto-refresh
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async (delayMs = 0) => {
    setRefreshing(true);
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    await fetchCampaigns();
    if (walletAddress) {
      const bal = await getBalance(walletAddress);
      setBalance(bal);
    }
    setRefreshing(false);
  };

  const handleRefreshClick = () => handleRefresh(0);
  const handleDonationComplete = async () => {
    // Wait for ledger to close and balance to update
    await new Promise((r) => setTimeout(r, 8000));
    await fetchCampaigns();
    if (walletAddress) {
      const bal = await getBalance(walletAddress);
      setBalance(bal);
    }
    setRefreshing(false);
  };

  const handleConnect = (address: string, type: WalletType) => {
    setWalletAddress(address);
    setWalletType(type);
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setWalletType(null);
    setBalance("0");
  };

  return (
    <div className="min-h-screen">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-stellar-600/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      </div>

      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stellar-500 to-purple-500 flex items-center justify-center glow-sm">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Stellar Crowdfund</h1>
              <p className="text-xs text-gray-500">Testnet</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshClick}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-400 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
            </button>
            <WalletConnect
              address={walletAddress}
              walletType={walletType}
              balance={balance}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onBalanceUpdate={setBalance}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        {!walletAddress && (
          <section className="text-center py-16 space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold">
              Decentralized{" "}
              <span className="gradient-text">Crowdfunding</span>
              <br />
              on Stellar
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Create campaigns, donate to causes, and track everything in
              real-time on the Stellar testnet. Connect your wallet to get
              started.
            </p>

            <div className="flex flex-wrap justify-center gap-6 pt-4">
              <div className="glass p-4 flex items-center gap-3 min-w-[200px]">
                <Globe className="w-8 h-8 text-stellar-400" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Multi-Wallet</p>
                  <p className="text-xs text-gray-400">
                    Freighter, Albedo, xBull
                  </p>
                </div>
              </div>
              <div className="glass p-4 flex items-center gap-3 min-w-[200px]">
                <Shield className="w-8 h-8 text-green-400" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Smart Contract</p>
                  <p className="text-xs text-gray-400">
                    Soroban on Testnet
                  </p>
                </div>
              </div>
              <div className="glass p-4 flex items-center gap-3 min-w-[200px]">
                <Zap className="w-8 h-8 text-yellow-400" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Real-time</p>
                  <p className="text-xs text-gray-400">
                    Live event tracking
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Contract Info */}
        <section className="glass p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">
              Deployed Contract (Testnet)
            </p>
            <p className="text-sm font-mono text-stellar-300 break-all">
              {CONTRACT_ID}
            </p>
          </div>
          <a
            href={`${EXPLORER_URL}/contract/${CONTRACT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs rounded-lg bg-stellar-600/20 hover:bg-stellar-600/40 text-stellar-300 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            View on Explorer
          </a>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Campaign */}
            {walletAddress && walletType && (
              <CreateCampaign
                walletAddress={walletAddress}
                walletType={walletType}
                onCampaignCreated={handleRefreshClick}
              />
            )}

            {/* Campaigns List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Active Campaigns</h2>
                <span className="text-sm text-gray-400">
                  {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
                </span>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-stellar-400 mb-3" />
                  <p className="text-gray-400">Loading campaigns...</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="glass p-12 text-center">
                  <Rocket className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-400">
                    No campaigns yet
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {walletAddress
                      ? "Be the first to create a campaign!"
                      : "Connect your wallet to create one"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      walletAddress={walletAddress}
                      walletType={walletType}
                      onDonationComplete={handleDonationComplete}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <EventFeed />

            {/* Info Card */}
            <div className="glass p-4 space-y-3">
              <h3 className="font-semibold text-sm">How it works</h3>
              <div className="space-y-2 text-xs text-gray-400">
                <p>
                  <span className="text-stellar-400 font-medium">1.</span>{" "}
                  Connect your Stellar wallet (Freighter, Albedo, or xBull)
                </p>
                <p>
                  <span className="text-stellar-400 font-medium">2.</span>{" "}
                  Fund your testnet account using the Friendbot
                </p>
                <p>
                  <span className="text-stellar-400 font-medium">3.</span>{" "}
                  Create a campaign or donate to existing ones
                </p>
                <p>
                  <span className="text-stellar-400 font-medium">4.</span>{" "}
                  Track transactions and events in real-time
                </p>
              </div>
            </div>

            {/* Error Handling Info */}
            <div className="glass p-4 space-y-3">
              <h3 className="font-semibold text-sm">Error Handling</h3>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 mt-1 shrink-0" />
                  <p>
                    <span className="text-white font-medium">
                      Wallet Not Found
                    </span>{" "}
                    - Detected when extension is missing
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 mt-1 shrink-0" />
                  <p>
                    <span className="text-white font-medium">
                      Transaction Rejected
                    </span>{" "}
                    - When user declines in wallet
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400 mt-1 shrink-0" />
                  <p>
                    <span className="text-white font-medium">
                      Insufficient Balance
                    </span>{" "}
                    - Pre-checked before transactions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16 py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>
            Stellar Crowdfund - Orange Belt Submission
          </p>
          <div className="flex items-center gap-4">
            <a
              href={`${EXPLORER_URL}/contract/${CONTRACT_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stellar-400 transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Explorer
            </a>
            <a
              href="https://github.com/nishant-uxs/stellar-orangebelt"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stellar-400 transition-colors flex items-center gap-1"
            >
              <Github className="w-3 h-3" />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
