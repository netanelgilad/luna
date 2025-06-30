import React, { useState, useEffect } from 'react';
import { MessageCircle, RefreshCw, QrCode, User, Users, Clock } from 'lucide-react';
import { actions } from 'astro:actions';
import type { WhatsAppResult, ChatData } from '../actions/index';

type WhatsAppChatListState = 
  | { status: 'loading' }
  | WhatsAppResult<ChatData[]>;

export const WhatsAppChatList: React.FC = () => {
  const [state, setState] = useState<WhatsAppChatListState>({ status: 'loading' });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchChatData = async () => {
    setState({ status: 'loading' });
    try {
      const result = await actions.getLatestWhatsAppChats();
      
      if (result.error) {
        setState({ 
          status: 'error',
          error: result.error.message || 'Failed to fetch chats'
        });
      } else {
        setState(result.data);
        if (result.data.status === 'ready') {
          setLastUpdated(new Date());
        }
      }
    } catch (error) {
      console.error('Error fetching WhatsApp chats:', error);
      setState({ 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  useEffect(() => {
    fetchChatData();
  }, []);

  const handleRefresh = () => {
    fetchChatData();
  };

  const isLoading = state.status === 'loading';

  const formatLastMessageTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-6 h-6 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-800">Latest 10 Chats</h2>
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
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                      <div className="w-12 h-3 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            );
            
          case 'waiting_for_qr':
            return (
              <div className="text-center py-8">
                <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-sm text-gray-600 mb-4">
                  Authentication required to view chats
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
              <div className="space-y-3">
                {state.data.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <div>No chats found</div>
                  </div>
                ) : (
                  state.data.map((chat, index) => (
                    <div key={chat.id || index} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex-shrink-0">
                        {chat.isGroup ? (
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {chat.name}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {chat.unreadCount > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {chat.unreadCount}
                              </span>
                            )}
                            {chat.timestamp && (
                              <span className="text-xs text-gray-500 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatLastMessageTime(chat.timestamp)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {chat.isGroup && (
                              <span className="inline-flex items-center mr-1">
                                <Users className="w-3 h-3 mr-1" />
                                Group
                              </span>
                            )}
                            <span className="font-mono">
                              {chat.id.includes('@g.us') ? 'Group Chat' : 'Contact'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
        <div className="mt-4 text-xs text-gray-500 text-center border-t pt-3">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}; 