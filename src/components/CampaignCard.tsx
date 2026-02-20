"use client";

import { useState, useEffect } from "react";
import { Campaign, donateToCampaign, getCampaign, TransactionResult } from "@/lib/contract";
import { WalletType, EXPLORER_URL } from "@/lib/constants";
import TransactionStatusComponent from "./TransactionStatus";
import { toast } from "sonner";
import {
  Target,
  Clock,
  User,
  TrendingUp,
  Send,
  Loader2,
} from "lucide-react";

interface CampaignCardProps {
  campaign: Campaign;
  walletAddress: string | null;
  walletType: WalletType | null;
  onDonationComplete: () => void;
}

export default function CampaignCard({
  campaign,
  walletAddress,
  walletType,
  onDonationComplete,
}: CampaignCardProps) {
  const [donateAmount, setDonateAmount] = useState("");
  const [txResult, setTxResult] = useState<TransactionResult>({
    status: "idle",
  });
  const [localRaised, setLocalRaised] = useState<bigint>(campaign.raised);

  // Sync localRaised when campaign prop updates from parent
  useEffect(() => {
    setLocalRaised(campaign.raised);
  }, [campaign.raised]);

  const raisedXlm = Number(localRaised) / 10_000_000;
  const targetXlm = Number(campaign.target) / 10_000_000;
  const progress = targetXlm > 0 ? Math.min((raisedXlm / targetXlm) * 100, 100) : 0;
  const isExpired = campaign.deadline * 1000 < Date.now();
  const timeLeft = campaign.deadline * 1000 - Date.now();

  const formatTimeLeft = () => {
    if (isExpired) return "Ended";
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h left`;
    const mins = Math.floor(timeLeft / (1000 * 60));
    return `${mins}m left`;
  };

  const handleDonate = async () => {
    if (!walletAddress || !walletType) {
      toast.error("Please connect your wallet first");
      return;
    }

    const amount = parseFloat(donateAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (isExpired) {
      toast.error("This campaign has ended");
      return;
    }

    // Check if campaign has reached target
    if (localRaised >= campaign.target) {
      toast.error("Campaign has already reached its target!");
      return;
    }

    // Check if donation would exceed target
    const amountStroops = BigInt(Math.floor(amount * 10_000_000));
    if (localRaised + amountStroops > campaign.target) {
      const remaining = Number(campaign.target - localRaised) / 10_000_000;
      toast.error(`Only ${remaining.toFixed(2)} XLM needed to reach target!`);
      return;
    }

    setTxResult({ status: "pending" });
    toast.loading("Please approve 2 transactions in Freighter...", { id: "donate" });

    try {
      const result = await donateToCampaign(
        walletAddress,
        walletType,
        campaign.id,
        amount
      );

      setTxResult(result);

      if (result.status === "success") {
        toast.success("Donation successful!", {
          id: "donate",
          description: `You donated ${amount} XLM`,
        });
        setDonateAmount("");
        // Poll until raised updates on-chain (ledger needs to close)
        const prevRaised = localRaised;
        let attempts = 0;
        const poll = async () => {
          while (attempts < 10) {
            await new Promise((r) => setTimeout(r, 3000));
            const updated = await getCampaign(campaign.id);
            if (updated && updated.raised !== prevRaised) {
              setLocalRaised(updated.raised);
              break;
            }
            attempts++;
          }
          onDonationComplete();
        };
        poll();
      } else {
        toast.error("Donation failed", {
          id: "donate",
          description: result.error,
        });
      }
    } catch (error: any) {
      const msg = error?.message ?? String(error);
      setTxResult({ status: "fail", error: msg });
      toast.error("Donation failed", {
        id: "donate",
        description: msg,
      });
    }
  };

  return (
    <div className="glass p-5 space-y-4 glass-hover">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-bold">{campaign.title}</h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {campaign.description}
          </p>
        </div>
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            isExpired
              ? "bg-red-500/20 text-red-400"
              : progress >= 100
              ? "bg-green-500/20 text-green-400"
              : "bg-stellar-500/20 text-stellar-400"
          }`}
        >
          {isExpired ? "Ended" : progress >= 100 ? "Funded!" : "Active"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-stellar-500 to-purple-500 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {raisedXlm.toFixed(2)} XLM raised
          </span>
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            {targetXlm.toFixed(2)} XLM goal
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {campaign.creator.slice(0, 6)}...{campaign.creator.slice(-4)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimeLeft()}
        </span>
      </div>

      {/* Donate section */}
      {!isExpired && walletAddress && (
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Amount (XLM)"
            value={donateAmount}
            onChange={(e) => setDonateAmount(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-stellar-500 transition-colors"
            min="0.01"
            step="0.01"
          />
          <button
            onClick={handleDonate}
            disabled={txResult.status === "pending"}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-stellar-600 to-purple-600 hover:from-stellar-500 hover:to-purple-500 text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1"
          >
            {txResult.status === "pending" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Donate
          </button>
        </div>
      )}

      {/* Transaction status */}
      <TransactionStatusComponent
        status={txResult.status}
        hash={txResult.hash}
        error={txResult.error}
      />
    </div>
  );
}
