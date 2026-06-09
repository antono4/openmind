/**
 * OPEN MIND AI - Desktop Application
 * 
 * Main entry point for the Tauri + React desktop application.
 */

import React, { useState, useCallback } from 'react';
import { ChatInterface, Card, Badge, Button } from '@openmind/ui';
import type { Message, Conversation } from '@openmind/shared-types';

// Simple local AI processing (no API required)
const processMessage = async (input: string): Promise<string> => {
  // Simulate AI processing without token limits
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const responses = [
    `I've processed your message: "${input}". This is OPEN MIND AI - running without token limitations!`,
    `Interesting thought! As an open-source AI, I can process as much text as you need.`,
    `OPEN MIND AI is designed to be free from traditional token constraints. Your message has been received.`,
    `Processing complete! I'm running locally with full context awareness.`,
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const messages = activeConversation?.messages || [];

  const handleNewConversation = useCallback(() => {
    const id = generateId();
    const newConversation: Conversation = {
      id,
      title: `Conversation ${conversations.length + 1}`,
      messages: [{
        id: generateId(),
        role: 'assistant',
        content: 'Hello! I am OPEN MIND AI. I am an open-source AI assistant without token limitations. How can I help you today?',
        timestamp: Date.now(),
      }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations(prev => [...prev, newConversation]);
    setActiveConversationId(id);
  }, [conversations.length]);

  const handleSend = useCallback(async (content: string) => {
    if (!activeConversationId) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setConversations(prev => prev.map(c => {
      if (c.id === activeConversationId) {
        return {
          ...c,
          messages: [...c.messages, userMessage],
          updatedAt: Date.now(),
        };
      }
      return c;
    }));

    setLoading(true);
    try {
      const response = await processMessage(content);
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages: [...c.messages, assistantMessage],
            updatedAt: Date.now(),
          };
        }
        return c;
      }));
    } finally {
      setLoading(false);
    }
  }, [activeConversationId]);

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-blue-600">OPEN MIND AI</h1>
          <p className="text-xs text-gray-500 mt-1">No token limits • Open Source</p>
        </div>
        
        <div className="p-2">
          <Button onClick={handleNewConversation} className="w-full">
            + New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {conversations.map(conv => (
            <Card
              key={conv.id}
              onClick={() => setActiveConversationId(conv.id)}
              className={`cursor-pointer ${conv.id === activeConversationId ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{conv.title}</span>
                <Badge variant={conv.id === activeConversationId ? 'info' : 'success'}>
                  {conv.messages.length}
                </Badge>
              </div>
            </Card>
          ))}
          
          {conversations.length === 0 && (
            <div className="text-center text-gray-500 p-4">
              <p className="text-sm">No conversations yet.</p>
              <p className="text-xs mt-1">Click "New Chat" to start!</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t text-xs text-gray-500">
          <p>OPEN MIND AI v1.0.0</p>
          <p className="mt-1">Built with Tauri + React</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {activeConversation?.title || 'OPEN MIND AI'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="success">● Online</Badge>
              <span className="text-xs text-gray-500">No token limits</span>
            </div>
          </div>
        </div>

        <div className="flex-1">
          {activeConversationId ? (
            <ChatInterface
              messages={messages}
              onSend={handleSend}
              loading={loading}
              placeholder="Type your message to OPEN MIND AI..."
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-700 mb-2">Welcome to OPEN MIND AI</h2>
                <p className="text-gray-500 mb-4">An open-source AI without token limitations</p>
                <Button onClick={handleNewConversation} size="lg">
                  Start New Chat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;