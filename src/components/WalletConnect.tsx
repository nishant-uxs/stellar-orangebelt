"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { WalletType, WALLET_INFO } from "@/lib/constants";
import { connectWallet, getBalance, fundWithFriendbot } from "@/lib/wallet";
import {
  WalletNotFoundError,
  TransactionRejectedError,
} from "@/lib/errors";
import { toast } from "sonner";
import {
  Wallet,
  LogOut,
  Copy,
  ExternalLink,
  Coins,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

interface WalletConnectProps {
  address: string | null;
  walletType: WalletType | null;
  balance: string;
  onConnect: (address: string, walletType: WalletType) => void;
  onDisconnect: () => void;
  onBalanceUpdate: (balance: string) => void;
}

export default function WalletConnect({
  address,
  walletType,
  balance,
  onConnect,
  onDisconnect,
  onBalanceUpdate,
}: WalletConnectProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [connecting, setConnecting] = useState<WalletType | null>(null);
  const [funding, setFunding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openModal = () => {
    setModalKey((k) => k + 1);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleConnect = async (type: WalletType) => {
    setConnecting(type);
    try {
      const connection = await connectWallet(type);
      const bal = await getBalance(connection.address);
      onConnect(connection.address, type);
      onBalanceUpdate(bal);
      setShowModal(false);
      toast.success(`Connected to ${WALLET_INFO[type].name}`, {
        description: `Address: ${connection.address.slice(0, 8)}...${connection.address.slice(-8)}`,
      });
    } catch (error) {
      if (error instanceof WalletNotFoundError) {
        toast.error("Wallet Not Found", {
          description: error.message,
          action: {
            label: "Install",
            onClick: () =>
              window.open(WALLET_INFO[type].url, "_blank"),
          },
        });
      } else if (error instanceof TransactionRejectedError) {
        toast.error("Connection Rejected", {
          description: "You rejected the connection request.",
        });
      } else {
        toast.error("Connection Failed", {
          description:
            error instanceof Error
              ? error.message
              : "Unknown error occurred",
        });
      }
    } finally {
      setConnecting(null);
    }
  };

  const handleFund = async () => {
    if (!address) return;
    setFunding(true);
    try {
      const success = await fundWithFriendbot(address);
      if (success) {
        const bal = await getBalance(address);
        onBalanceUpdate(bal);
        toast.success("Account Funded!", {
          description: "10,000 test XLM added to your account.",
        });
      } else {
        toast.error("Funding Failed", {
          description: "Could not fund account. It may already be funded.",
        });
      }
    } catch {
      toast.error("Funding Error");
    } finally {
      setFunding(false);
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied!");
    }
  };

  if (address && walletType) {
    return (
      <div className="glass p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">
              {WALLET_INFO[walletType].icon} {WALLET_INFO[walletType].name}
            </p>
            <p className="text-sm font-mono">
              {address.slice(0, 6)}...{address.slice(-6)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-sm font-semibold text-stellar-400">
            {parseFloat(balance).toFixed(2)} XLM
          </span>

          <button
            onClick={copyAddress}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Copy address"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() =>
              window.open(
                `https://stellar.expert/explorer/testnet/account/${address}`,
                "_blank"
              )
            }
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="View on Explorer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleFund}
            disabled={funding}
            className="px-3 py-1.5 text-xs rounded-lg bg-stellar-600/20 hover:bg-stellar-600/40 text-stellar-300 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {funding ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Coins className="w-3 h-3" />
            )}
            Fund
          </button>

          <button
            onClick={onDisconnect}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
            title="Disconnect"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={openModal}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-stellar-600 to-purple-600 hover:from-stellar-500 hover:to-purple-500 font-semibold transition-all duration-300 glow flex items-center gap-2"
      >
        <Wallet className="w-5 h-5" />
        Connect Wallet
      </button>

      {mounted && showModal && createPortal(
        <div
          key={modalKey}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={closeModal}
        >
          <div
            className="glass p-6 w-full max-w-md mx-4 space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold gradient-text">
                Connect Wallet
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <p className="text-sm text-gray-400">
              Choose a wallet to connect to Stellar Testnet
            </p>

            <div className="space-y-2">
              {Object.entries(WALLET_INFO).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => handleConnect(type as WalletType)}
                  disabled={connecting !== null}
                  className="w-full p-4 rounded-xl glass glass-hover flex items-center gap-3 disabled:opacity-50"
                >
                  <span className="text-2xl">{info.icon}</span>
                  <div className="text-left flex-1">
                    <p className="font-semibold">{info.name}</p>
                    <p className="text-xs text-gray-400">
                      Click to connect
                    </p>
                  </div>
                  {connecting === type && (
                    <Loader2 className="w-5 h-5 animate-spin text-stellar-400" />
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-500 text-center">
              Make sure you have the wallet extension installed
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
