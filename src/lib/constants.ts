export const NETWORK = "TESTNET";
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";

// Set to true to test UI without deploying contract
// Using MOCK_MODE for now - set to false when you have a deployed contract
export const MOCK_MODE = false;

// Placeholder contract ID - update this with your deployed contract
// For now, using mock mode to demonstrate full functionality
export const CONTRACT_ID =
  "CCEWBXDQJ2YHQ6NVRQW3OLAJ6MGH2FSDSEQW6L4GSEUPZQRLIFK3UW3F";

export const EXPLORER_URL = "https://stellar.expert/explorer/testnet";

export enum WalletType {
  FREIGHTER = "freighter",
  ALBEDO = "albedo",
  XBULL = "xbull",
}

export const WALLET_INFO: Record<
  WalletType,
  { name: string; icon: string; url: string }
> = {
  [WalletType.FREIGHTER]: {
    name: "Freighter",
    icon: "🚀",
    url: "https://www.freighter.app/",
  },
  [WalletType.ALBEDO]: {
    name: "Albedo",
    icon: "🌟",
    url: "https://albedo.link/",
  },
  [WalletType.XBULL]: {
    name: "xBull",
    icon: "🐂",
    url: "https://xbull.app/",
  },
};

