"use client";

import { type TransactionStatus as TxStatus } from "@/lib/contract";
import { EXPLORER_URL } from "@/lib/constants";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
} from "lucide-react";

interface TransactionStatusProps {
  status: TxStatus;
  hash?: string;
  error?: string;
  label?: string;
}

const statusConfig: Record<
  TxStatus,
  { icon: React.ReactNode; color: string; text: string; bg: string }
> = {
  idle: {
    icon: <Clock className="w-4 h-4" />,
    color: "text-gray-400",
    text: "Ready",
    bg: "bg-gray-500/10",
  },
  pending: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    color: "text-yellow-400",
    text: "Processing...",
    bg: "bg-yellow-500/10",
  },
  success: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-green-400",
    text: "Success!",
    bg: "bg-green-500/10",
  },
  fail: {
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-400",
    text: "Failed",
    bg: "bg-red-500/10",
  },
};

export default function TransactionStatus({
  status,
  hash,
  error,
  label,
}: TransactionStatusProps) {
  if (status === "idle") return null;

  const config = statusConfig[status];

  return (
    <div
      className={`rounded-xl p-3 ${config.bg} border border-white/5 space-y-2`}
    >
      <div className="flex items-center gap-2">
        <span className={config.color}>{config.icon}</span>
        <span className={`text-sm font-medium ${config.color}`}>
          {label || config.text}
        </span>
      </div>

      {hash && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">
            TX: {hash.slice(0, 12)}...{hash.slice(-12)}
          </span>
          <a
            href={`${EXPLORER_URL}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stellar-400 hover:text-stellar-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {error && status === "fail" && (
        <p className="text-xs text-red-300/80">{error}</p>
      )}
    </div>
  );
}
