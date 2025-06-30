import React, { useState, useEffect } from 'react';
import { Brain, RefreshCw, QrCode, AlertTriangle, Info, Clock, Zap } from 'lucide-react';
import { actions } from 'astro:actions';
import type { WhatsAppResult, WhatsAppBrief as WhatsAppBriefType } from '../actions/index';

type WhatsAppBriefState = 
  | { status: 'loading' }
  | WhatsAppResult<WhatsAppBriefType>;

export const WhatsAppBrief: React.FC = () => {
  const [state, setState] = useState<WhatsAppBriefState>({ status: 'loading' });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBrief = async () => {
    setState({ status: 'loading' });
    try {
      const result = await actions.generateWhatsAppBrief();
      
      if (result.error) {
        setState({ 
          status: 'error',
          error: result.error.message || 'Failed to generate brief'
        });
      } else {
        setState(result.data);
        if (result.data.status === 'ready') {
          setLastUpdated(new Date());
        }
      }
    } catch (error) {
      console.error('Error generating WhatsApp brief:', error);
      setState({ 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  useEffect(() => {
    fetchBrief();
  }, []);

  const handleRefresh = () => {
    fetchBrief();
  };

  const isLoading = state.status === 'loading';

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Brain className="w-6 h-6 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-800">AI Brief</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Generate New Brief"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {(() => {
        switch (state.status) {
          case 'loading':
            return (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-500 py-4">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
                  Analyzing messages with AI...
                </div>
              </div>
            );
            
          case 'waiting_for_qr':
            return (
              <div className="text-center py-8">
                <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-sm text-gray-600 mb-4">
                  Authentication required to generate brief
                </div>
                
                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-2">
                    Scan this QR code with WhatsApp
                  </div>
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(state.qr)}`}
                      alt="WhatsApp QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              </div>
            );
            
          case 'ready':
            return (
              <div className="space-y-6">
                {/* Header Stats */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {state.data.totalUnread}
                        </div>
                        <div className="text-xs text-gray-600">Unread</div>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        Generated {formatTime(state.data.generatedAt)}
                      </div>
                    </div>
                    <Zap className="w-8 h-8 text-purple-400" />
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h3 className="text-md font-semibold text-gray-800 mb-2 flex items-center">
                    <Info className="w-4 h-4 mr-2 text-blue-600" />
                    Summary
                  </h3>
                  <p className="text-gray-700 text-sm leading-relaxed bg-blue-50 p-3 rounded-lg">
                    {state.data.summary}
                  </p>
                </div>

                {/* Urgent Items */}
                {state.data.urgentItems.length > 0 && (
                  <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
                      Needs Attention
                      <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                        {state.data.urgentItems.length}
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {state.data.urgentItems.map((item, index) => (
                        <div key={index} className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r-lg">
                          <p className="text-sm text-red-800">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Can Ignore */}
                {state.data.canIgnore.length > 0 && (
                  <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                      <Info className="w-4 h-4 mr-2 text-gray-600" />
                      Low Priority
                      <span className="ml-2 bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded-full">
                        {state.data.canIgnore.length}
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {state.data.canIgnore.map((item, index) => (
                        <div key={index} className="bg-gray-50 border-l-4 border-gray-300 p-3 rounded-r-lg">
                          <p className="text-sm text-gray-700">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {state.data.urgentItems.length === 0 && state.data.canIgnore.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <div>No actionable items found</div>
                    <div className="text-xs">All caught up! 🎉</div>
                  </div>
                )}
              </div>
            );
            
          case 'error':
            return (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="text-sm font-medium text-red-800">Error Generating Brief</h3>
                </div>
                <div className="text-sm text-red-700">
                  {state.error}
                </div>
                <div className="mt-3 text-xs text-red-600">
                  Make sure your GROQ_API_KEY is configured in your environment variables.
                </div>
              </div>
            );
            
          default:
            return null;
        }
      })()}
      
      {lastUpdated && state.status === 'ready' && (
        <div className="mt-6 text-xs text-gray-500 text-center border-t pt-3">
          Last generated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}; 