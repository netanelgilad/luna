import React from 'react';
import { useTokenContext } from '../contexts/TokenContext';

const TokenCounter: React.FC = () => {
  const { tokenCounts } = useTokenContext();
  
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
    </div>
  );
};

export default TokenCounter;

