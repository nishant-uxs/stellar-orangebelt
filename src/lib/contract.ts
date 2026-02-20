"use client";

import * as StellarSdk from "@stellar/stellar-sdk";
import {
  CONTRACT_ID,
  SOROBAN_RPC_URL,
  NETWORK_PASSPHRASE,
  MOCK_MODE,
} from "./constants";
import { WalletType } from "./constants";
import { signTransaction, validateBalance } from "./wallet";
import {
  TransactionRejectedError,
  InsufficientBalanceError,
  classifyError,
} from "./errors";
import {
  mockCreateCampaign,
  mockDonate,
  mockGetCampaignCount,
  mockGetCampaign,
  mockGetEvents,
} from "./contract-mock";
import { campaignCache } from "./cache";

function addressToScVal(address: string): StellarSdk.xdr.ScVal {
  return StellarSdk.Address.fromString(address).toScVal();
}

export type TransactionStatus = "idle" | "pending" | "success" | "fail";

export interface Campaign {
  id: number;
  creator: string;
  title: string;
  description: string;
  target: bigint;
  deadline: number;
  raised: bigint;
  claimed: boolean;
}

export interface TransactionResult {
  status: TransactionStatus;
  hash?: string;
  error?: string;
}

export interface ContractEvent {
  type: string;
  data: Record<string, any>;
  timestamp: number;
  ledger: number;
}

// Create a Soroban RPC server instance
function getServer(): StellarSdk.rpc.Server {
  return new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
}

// Build and submit a contract call transaction
async function callContract(
  method: string,
  params: StellarSdk.xdr.ScVal[],
  callerAddress: string,
  walletType: WalletType,
  simulate: boolean = false
): Promise<TransactionResult> {
  const server = getServer();

  try {
    const account = await server.getAccount(callerAddress);
    const contract = new StellarSdk.Contract(CONTRACT_ID);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "1000000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...params))
      .setTimeout(300)
      .build();

    const simulated = await server.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
      const simError = (simulated as any).error ?? JSON.stringify(simulated);
      return {
        status: "fail",
        error: `Simulation failed: ${simError}`,
      };
    }

    if (simulate) {
      return { status: "success" };
    }

    const preparedTx = StellarSdk.rpc.assembleTransaction(
      tx,
      simulated as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse
    ).build();

    const xdr = preparedTx.toXDR();

    const signedXdr = await signTransaction(
      xdr,
      walletType,
      NETWORK_PASSPHRASE
    );

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK_PASSPHRASE
    );

    const sendResponse = await server.sendTransaction(
      signedTx as StellarSdk.Transaction
    );

    if (sendResponse.status === "ERROR") {
      const errDetail = (sendResponse as any).errorResult ?? JSON.stringify(sendResponse);
      console.error("[donate] sendTransaction ERROR:", errDetail);
      return {
        status: "fail",
        hash: sendResponse.hash,
        error: `Submission failed: ${errDetail}`,
      };
    }

    // Poll for result
    let getResponse = await server.getTransaction(sendResponse.hash);
    let attempts = 0;
    while (getResponse.status === "NOT_FOUND" && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      getResponse = await server.getTransaction(sendResponse.hash);
      attempts++;
    }

    if (getResponse.status === "SUCCESS") {
      return {
        status: "success",
        hash: sendResponse.hash,
      };
    } else {
      const status = getResponse.status;
      console.error(`[${method}] tx failed on-chain, status:`, status, getResponse);
      return {
        status: "fail",
        hash: sendResponse.hash,
        error: `Transaction failed on-chain (status: ${status})`,
      };
    }
  } catch (error: any) {
    const msg: string = error?.message ?? String(error) ?? "Unknown error";
    return { status: "fail", error: msg };
  }
}

// Create a new campaign
export async function createCampaign(
  callerAddress: string,
  walletType: WalletType,
  title: string,
  description: string,
  targetXlm: number,
  durationSeconds: number
): Promise<TransactionResult> {
  if (MOCK_MODE) {
    try {
      const targetStroops = BigInt(Math.floor(targetXlm * 10_000_000));
      const deadline = Math.floor(Date.now() / 1000) + durationSeconds;
      const hash = await mockCreateCampaign(title, description, targetStroops, deadline);
      return { status: "success", hash };
    } catch (error: any) {
      return { status: "fail", error: error.message };
    }
  }

  await validateBalance(callerAddress, "2");

  const targetStroops = BigInt(Math.floor(targetXlm * 10_000_000));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + durationSeconds);

  const params = [
    addressToScVal(callerAddress),
    StellarSdk.nativeToScVal(title, { type: "string" }),
    StellarSdk.nativeToScVal(description, { type: "string" }),
    StellarSdk.nativeToScVal(targetStroops, { type: "i128" }),
    StellarSdk.nativeToScVal(deadline, { type: "u64" }),
  ];

  const result = await callContract("create", params, callerAddress, walletType);
  if (result.status === "success") {
    campaignCache.invalidate();
  }
  return result;
}

// Donate to a campaign - sends real XLM payment + records on-chain
export async function donateToCampaign(
  callerAddress: string,
  walletType: WalletType,
  campaignId: number,
  amountXlm: number
): Promise<TransactionResult> {
  if (MOCK_MODE) {
    try {
      const amountStroops = BigInt(Math.floor(amountXlm * 10_000_000));
      const hash = await mockDonate(campaignId, amountStroops);
      return { status: "success", hash };
    } catch (error: any) {
      return { status: "fail", error: error.message };
    }
  }

  const server = getServer();
  const amountStroops = BigInt(Math.floor(amountXlm * 10_000_000));

  try {
    // Get campaign to find creator address
    const campaign = await getCampaign(campaignId);
    if (!campaign) {
      return { status: "fail", error: "Campaign not found" };
    }

    // Step 1: Send real XLM payment to campaign creator
    const account = await server.getAccount(callerAddress);
    const paymentTx = new StellarSdk.TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: campaign.creator,
          asset: StellarSdk.Asset.native(),
          amount: amountXlm.toString(),
        })
      )
      .setTimeout(300)
      .build();

    const paymentXdr = paymentTx.toXDR();
    const signedPaymentXdr = await signTransaction(
      paymentXdr,
      walletType,
      NETWORK_PASSPHRASE
    );
    const signedPaymentTx = StellarSdk.TransactionBuilder.fromXDR(
      signedPaymentXdr,
      NETWORK_PASSPHRASE
    );

    const paymentResponse = await server.sendTransaction(
      signedPaymentTx as StellarSdk.Transaction
    );

    if (paymentResponse.status === "ERROR") {
      return {
        status: "fail",
        error: "Payment transaction failed",
      };
    }

    // Wait for payment to confirm
    let paymentResult = await server.getTransaction(paymentResponse.hash);
    let attempts = 0;
    while (paymentResult.status === "NOT_FOUND" && attempts < 10) {
      await new Promise((r) => setTimeout(r, 2000));
      paymentResult = await server.getTransaction(paymentResponse.hash);
      attempts++;
    }

    if (paymentResult.status !== "SUCCESS") {
      return {
        status: "fail",
        error: "Payment failed on-chain",
      };
    }

    // Step 2: Record donation in contract
    const account2 = await server.getAccount(callerAddress);
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const tx = new StellarSdk.TransactionBuilder(account2, {
      fee: "1000000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "donate",
          addressToScVal(callerAddress),
          StellarSdk.nativeToScVal(campaignId, { type: "u32" }),
          StellarSdk.nativeToScVal(amountStroops, { type: "i128" })
        )
      )
      .setTimeout(300)
      .build();

    const simulated = await server.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
      const simError = (simulated as any).error ?? JSON.stringify(simulated);
      return {
        status: "fail",
        error: `Simulation failed: ${simError}`,
      };
    }

    const preparedTx = StellarSdk.rpc.assembleTransaction(
      tx,
      simulated as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse
    ).build();

    const xdr = preparedTx.toXDR();

    const signedXdr = await signTransaction(
      xdr,
      walletType,
      NETWORK_PASSPHRASE
    );

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK_PASSPHRASE
    );

    const sendResponse = await server.sendTransaction(
      signedTx as StellarSdk.Transaction
    );

    if (sendResponse.status === "ERROR") {
      const errDetail = (sendResponse as any).errorResult ?? JSON.stringify(sendResponse);
      console.error("[donate] sendTransaction ERROR:", errDetail);
      return {
        status: "fail",
        hash: sendResponse.hash,
        error: `Submission failed: ${errDetail}`,
      };
    }

    // Poll for result
    let getResponse = await server.getTransaction(sendResponse.hash);
    let attempts2 = 0;
    while (getResponse.status === "NOT_FOUND" && attempts2 < 20) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      getResponse = await server.getTransaction(sendResponse.hash);
      attempts2++;
    }

    if (getResponse.status === "SUCCESS") {
      campaignCache.invalidateCampaign(campaignId);
      return {
        status: "success",
        hash: sendResponse.hash,
      };
    } else {
      const status = getResponse.status;
      console.error("[donate] tx failed on-chain, status:", status, getResponse);
      return {
        status: "fail",
        hash: sendResponse.hash,
        error: `Transaction failed on-chain (status: ${status})`,
      };
    }
  } catch (error: any) {
    const msg: string = error?.message ?? String(error) ?? "Unknown error";
    return { status: "fail", error: msg };
  }
}

// Simulate a read-only contract call (no signing needed)
async function simulateReadCall(
  method: string,
  params: StellarSdk.xdr.ScVal[]
): Promise<StellarSdk.xdr.ScVal | null> {
  const server = getServer();

  try {
    // Use a random keypair as source for simulation (no signing needed)
    const keypair = StellarSdk.Keypair.random();
    const account = new StellarSdk.Account(keypair.publicKey(), "0");
    const contract = new StellarSdk.Contract(CONTRACT_ID);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...params))
      .setTimeout(30)
      .build();

    const simulated = await server.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
      return null;
    }

    const successResult =
      simulated as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse;
    if (successResult.result) {
      return successResult.result.retval;
    }
    return null;
  } catch (error) {
    console.error(`Error simulating ${method}:`, error);
    return null;
  }
}

// Get campaign count
export async function getCampaignCount(): Promise<number> {
  if (MOCK_MODE) {
    return mockGetCampaignCount();
  }

  const cached = campaignCache.getCount();
  if (cached !== null) return cached;

  try {
    const result = await simulateReadCall("get_count", []);
    if (result) {
      const count = Number(StellarSdk.scValToNative(result));
      campaignCache.setCount(count);
      return count;
    }
    return 0;
  } catch {
    return 0;
  }
}

// Get campaign details by ID
export async function getCampaign(campaignId: number, skipCache = false): Promise<Campaign | null> {
  if (MOCK_MODE) {
    return mockGetCampaign(campaignId);
  }

  if (!skipCache) {
    const cached = campaignCache.getCampaign(campaignId);
    if (cached) return cached;
  }

  try {
    const result = await simulateReadCall("get_campaign", [
      StellarSdk.nativeToScVal(campaignId, { type: "u32" }),
    ]);

    if (result) {
      const data = StellarSdk.scValToNative(result);
      const campaign: Campaign = {
        id: campaignId,
        creator: data.creator,
        title: data.title,
        description: data.desc,
        target: BigInt(data.target),
        deadline: Number(data.deadline),
        raised: BigInt(data.raised),
        claimed: data.claimed,
      };
      campaignCache.setCampaign(campaignId, campaign);
      return campaign;
    }
    return null;
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return null;
  }
}

// Get recent contract events for real-time updates
export async function getContractEvents(
  startLedger?: number
): Promise<ContractEvent[]> {
  if (MOCK_MODE) {
    return mockGetEvents();
  }

  const server = getServer();

  try {
    const latestLedger = await server.getLatestLedger();
    const start = startLedger || latestLedger.sequence - 1000;

    const eventsResponse = await server.getEvents({
      startLedger: start,
      filters: [
        {
          type: "contract",
          contractIds: [CONTRACT_ID],
        },
      ],
      limit: 20,
    });

    if (!eventsResponse.events) return [];

    return eventsResponse.events.map((event: any) => ({
      type: event.topic?.[0]
        ? StellarSdk.scValToNative(event.topic[0])
        : "unknown",
      data: event.value ? StellarSdk.scValToNative(event.value) : {},
      timestamp: Date.now(),
      ledger: event.ledger,
    }));
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

// Poll for events (real-time simulation)
export function startEventPolling(
  callback: (events: ContractEvent[]) => void,
  intervalMs: number = 5000
): () => void {
  let lastLedger: number | undefined;
  let active = true;

  const poll = async () => {
    while (active) {
      try {
        const events = await getContractEvents(lastLedger);
        if (events.length > 0) {
          lastLedger = events[events.length - 1].ledger + 1;
          callback(events);
        }
      } catch (error) {
        console.error("Event polling error:", error);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  };

  poll();

  return () => {
    active = false;
  };
}
