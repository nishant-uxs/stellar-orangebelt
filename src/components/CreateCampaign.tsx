"use client";

import { useState } from "react";
import { createCampaign, TransactionResult } from "@/lib/contract";
import { WalletType } from "@/lib/constants";
import TransactionStatusComponent from "./TransactionStatus";
import { toast } from "sonner";
import { Plus, Loader2, X } from "lucide-react";

interface CreateCampaignProps {
  walletAddress: string;
  walletType: WalletType;
  onCampaignCreated: () => void;
}

export default function CreateCampaign({
  walletAddress,
  walletType,
  onCampaignCreated,
}: CreateCampaignProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [duration, setDuration] = useState("7");
  const [txResult, setTxResult] = useState<TransactionResult>({
    status: "idle",
  });

  const handleCreate = async () => {
    if (!title.trim() || !description.trim() || !target) {
      toast.error("Please fill in all fields");
      return;
    }

    const targetAmount = parseFloat(target);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast.error("Please enter a valid target amount");
      return;
    }

    const durationDays = parseInt(duration);
    const durationSeconds = durationDays * 24 * 60 * 60;

    setTxResult({ status: "pending" });
    toast.loading("Creating campaign...", { id: "create" });

    try {
      const result = await createCampaign(
        walletAddress,
        walletType,
        title,
        description,
        targetAmount,
        durationSeconds
      );

      setTxResult(result);

      if (result.status === "success") {
        toast.success("Campaign created!", {
          id: "create",
          description: `"${title}" is now live`,
        });
        setTitle("");
        setDescription("");
        setTarget("");
        setDuration("7");
        setShowForm(false);
        onCampaignCreated();
      } else {
        toast.error("Failed to create campaign", {
          id: "create",
          description: result.error,
        });
      }
    } catch (error: any) {
      setTxResult({ status: "fail", error: error.message });
      toast.error("Failed to create campaign", {
        id: "create",
        description: error.message,
      });
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-stellar-500/50 text-gray-400 hover:text-stellar-400 transition-all duration-300 flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Create New Campaign
      </button>
    );
  }

  return (
    <div className="glass p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold gradient-text">New Campaign</h3>
        <button
          onClick={() => setShowForm(false)}
          className="p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Campaign title"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-stellar-500 transition-colors"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this campaign about?"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-stellar-500 transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Target (XLM)
            </label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="100"
              min="1"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-stellar-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Duration (days)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="7"
              min="1"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-stellar-500 transition-colors"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={txResult.status === "pending"}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-stellar-600 to-purple-600 hover:from-stellar-500 hover:to-purple-500 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {txResult.status === "pending" ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Plus className="w-5 h-5" />
            Create Campaign
          </>
        )}
      </button>

      <TransactionStatusComponent
        status={txResult.status}
        hash={txResult.hash}
        error={txResult.error}
      />
    </div>
  );
}
