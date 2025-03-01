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
    setTokenCounts((prev) => ({
      inputTokens: prev.inputTokens + count,
      outputTokens: prev.outputTokens,
      totalTokens: prev.totalTokens + count,
    }));
  };

  const incrementOutputTokens = (count: number) => {
    setTokenCounts((prev) => ({
      inputTokens: prev.inputTokens,
      outputTokens: prev.outputTokens + count,
      totalTokens: prev.totalTokens + count,
    }));
  };

  const resetTokenCounts = () => {
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
