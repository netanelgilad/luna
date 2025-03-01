import React from 'react';
import { useTokenContext } from '../contexts/TokenContext';

const TokenCounter: React.FC = () => {
  const { tokenCounts, incrementInputTokens, incrementOutputTokens } = useTokenContext();
  
  const handleIncrementInput = () => {
    incrementInputTokens(100); // Increment by 100 tokens for easier testing
  };
  
  const handleIncrementOutput = () => {
    incrementOutputTokens(100); // Increment by 100 tokens for easier testing
  };
  
  return (
    <div className="token-counter fixed top-2 right-4 bg-gray-800 text-white px-3 py-1 rounded-md shadow-md text-sm font-mono z-50">
      <div className="flex items-center space-x-4">
        <div>
          Input: <span className="font-semibold">{tokenCounts.inputTokens.toLocaleString()}</span>
        </div>
        <div>
          Output: <span className="font-semibold">{tokenCounts.outputTokens.toLocaleString()}</span>
        </div>
        <div>
          Total: <span className="font-semibold">{(tokenCounts.inputTokens + tokenCounts.outputTokens).toLocaleString()}</span>
        </div>
      </div>
      <div className="flex mt-2 space-x-2">
        <button 
          onClick={handleIncrementInput}
          className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 rounded"
        >
          +100 Input
        </button>
        <button 
          onClick={handleIncrementOutput}
          className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1 rounded"
        >
          +100 Output
        </button>
      </div>
    </div>
  );
};

export default TokenCounter;

