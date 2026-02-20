import { describe, it, expect } from "vitest";
import {
  WalletNotFoundError,
  TransactionRejectedError,
  InsufficientBalanceError,
  classifyError,
} from "@/lib/errors";

describe("Custom Error Classes", () => {
  it("WalletNotFoundError has correct name and message", () => {
    const err = new WalletNotFoundError("freighter");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(WalletNotFoundError);
    expect(err.name).toBe("WalletNotFoundError");
    expect(err.message).toContain("freighter");
  });

  it("TransactionRejectedError has correct name", () => {
    const err = new TransactionRejectedError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(TransactionRejectedError);
    expect(err.name).toBe("TransactionRejectedError");
  });

  it("InsufficientBalanceError stores required and available amounts", () => {
    const err = new InsufficientBalanceError("10", "5");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(InsufficientBalanceError);
    expect(err.name).toBe("InsufficientBalanceError");
    expect(err.required).toBe("10");
    expect(err.available).toBe("5");
  });

  it("classifyError returns WalletNotFoundError for wallet-related messages", () => {
    const err = classifyError(new Error("wallet not found"));
    expect(err).toBeInstanceOf(WalletNotFoundError);
  });

  it("classifyError returns TransactionRejectedError for rejection messages", () => {
    const err = classifyError(new Error("user declined"));
    expect(err).toBeInstanceOf(TransactionRejectedError);
  });

  it("classifyError returns original error for unknown errors", () => {
    const original = new Error("some unknown error");
    const err = classifyError(original);
    expect(err).toBe(original);
  });
});
