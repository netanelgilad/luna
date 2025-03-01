"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface TokenContextProps {
  tokenCounts: TokenCounts;
  incrementInputTokens: (count: number) => void;
  incrementOutputTokens: (count: number) => void;
  resetTokenCounts: () => void;
}

const TokenContext = createContext<TokenContextProps | undefined>(undefined);

export const TokenContextProvider = ({ children }: { children: ReactNode }) => {
  const [tokenCounts, setTokenCounts] = useState<TokenCounts>({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  });

  const incrementInputTokens = (count: number) => {
    console.log(`Incrementing input tokens by ${count}`);
    setTokenCounts((prev) => {
      const newValues = {
        inputTokens: prev.inputTokens + count,
        outputTokens: prev.outputTokens,
        totalTokens: prev.totalTokens + count,
      };
      console.log(`Token counts updated: Input: ${newValues.inputTokens}, Output: ${newValues.outputTokens}, Total: ${newValues.totalTokens}`);
      return newValues;
    });
  };

  const incrementOutputTokens = (count: number) => {
    console.log(`Incrementing output tokens by ${count}`);
    setTokenCounts((prev) => {
      const newValues = {
        inputTokens: prev.inputTokens,
        outputTokens: prev.outputTokens + count,
        totalTokens: prev.totalTokens + count,
      };
      console.log(`Token counts updated: Input: ${newValues.inputTokens}, Output: ${newValues.outputTokens}, Total: ${newValues.totalTokens}`);
      return newValues;
    });
  };

  const resetTokenCounts = () => {
    console.log('Resetting token counts to zero');
    setTokenCounts({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
  };

  return (
    <TokenContext.Provider
      value={{
        tokenCounts,
        incrementInputTokens,
        incrementOutputTokens,
        resetTokenCounts,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};

export const useTokenContext = () => {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error("useTokenContext must be used within a TokenContextProvider");
  }
  return context;
};
