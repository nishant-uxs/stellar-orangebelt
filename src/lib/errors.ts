// Custom error types for Stellar wallet and contract interactions

export class WalletNotFoundError extends Error {
  constructor(walletName: string) {
    super(
      `${walletName} wallet extension not found. Please install it from the official website.`
    );
    this.name = "WalletNotFoundError";
  }
}

export class TransactionRejectedError extends Error {
  constructor() {
    super("Transaction was rejected by the user in their wallet.");
    this.name = "TransactionRejectedError";
  }
}

export class InsufficientBalanceError extends Error {
  public required: string;
  public available: string;

  constructor(required: string, available: string) {
    super(
      `Insufficient balance. Required: ${required} XLM, Available: ${available} XLM`
    );
    this.name = "InsufficientBalanceError";
    this.required = required;
    this.available = available;
  }
}

export function classifyError(error: unknown): Error {
  const message =
    error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("not found") ||
    lower.includes("not installed") ||
    lower.includes("no extension") ||
    lower.includes("unable to find")
  ) {
    return new WalletNotFoundError("Wallet");
  }

  if (
    lower.includes("user declined") ||
    lower.includes("rejected") ||
    lower.includes("cancelled") ||
    lower.includes("denied") ||
    lower.includes("user refused")
  ) {
    return new TransactionRejectedError();
  }

  if (
    lower.includes("insufficient") ||
    lower.includes("underfunded") ||
    lower.includes("not enough")
  ) {
    return new InsufficientBalanceError("unknown", "unknown");
  }

  return error instanceof Error ? error : new Error(message);
}
