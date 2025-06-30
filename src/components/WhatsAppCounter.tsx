import React, { useState, useEffect } from 'react';
import { MessageCircle, RefreshCw, QrCode } from 'lucide-react';
import { actions } from 'astro:actions';
import type { WhatsAppResult } from '../actions/index';

type WhatsAppComponentState = 
  | { status: 'loading' }
  | WhatsAppResult<{ unreadCount: number; totalChats: number }>;

export const WhatsAppCounter: React.FC = () => {
  const [state, setState] = useState<WhatsAppComponentState>({ status: 'loading' });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWhatsAppData = async () => {
    setState({ status: 'loading' });
    try {
      const result = await actions.getWhatsAppUnread();
      
      if (result.error) {
        setState({ 
          status: 'error',
          error: result.error.message || 'Failed to fetch data'
        });
      } else {
        setState(result.data);
        if (result.data.status === 'ready') {
          setLastUpdated(new Date());
        }
      }
    } catch (error) {
      console.error('Error fetching WhatsApp data:', error);
      setState({ 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };



  useEffect(() => {
    fetchWhatsAppData();
  }, []);

  const handleRefresh = () => {
    fetchWhatsAppData();
  };

  const isLoading = state.status === 'loading';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-6 h-6 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-800">WhatsApp</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {(() => {
        switch (state.status) {
          case 'loading':
            return (
              <div className="text-center">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            );
            
          case 'waiting_for_qr':
            return (
              <div className="text-center">
                <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-sm text-gray-600 mb-4">
                  Authentication required
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
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {state.data.unreadCount}
                </div>
                <div className="text-sm text-gray-600">
                  Unread chat{state.data.unreadCount !== 1 ? 's' : ''}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  out of {state.data.totalChats} total chats
                </div>
              </div>
            );
            
          case 'error':
            return (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm text-red-800">
                  <strong>Error:</strong> {state.error}
                </div>
              </div>
            );
            
          default:
            return null;
        }
      })()}
      
      {lastUpdated && state.status === 'ready' && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}; 