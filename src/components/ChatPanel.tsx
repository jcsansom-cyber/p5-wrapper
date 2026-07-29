'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  currentProvider: 'anthropic' | 'openai';
  hasApiKey: boolean;
}

export default function ChatPanel({ messages, onSendMessage, isLoading, currentProvider, hasApiKey }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const providerName = currentProvider === 'anthropic' ? 'Claude' : 'GPT';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const welcomeMessages = [
    "What would you like to create?",
    "Try asking for:",
    "• Animated shapes",
    "• Particle systems",
    "• Interactive drawings",
    "• Data visualizations",
    "• ml5.js object detection",
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>💬 AI Assistant</span>
          {hasApiKey ? (
            <span className="badge badge-green">● Connected</span>
          ) : (
            <span className="badge badge-orange" style={{ cursor: 'pointer' }} title="Add your API key in settings">⚠️ No API key</span>
          )}
        </div>
        {!hasApiKey && (
          <p style={{ fontSize: 11, color: '#fb923c' }}>Set up your Claude or GPT API key in ⚙️ Settings to get started</p>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 40 }}>
            <p style={{ fontSize: 28, marginBottom: 16 }}>🎨</p>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Welcome to p5.js AI Studio
            </p>
            <div style={{ textAlign: 'left', display: 'inline-block', gap: 4 }}>
              {welcomeMessages.map((msg, i) => (
                <p key={i} style={{ fontSize: 13, margin: ${i === 0 ? '0' : '6'}px 0, opacity: msg.startsWith('Try') ? 0.8 : 0.5 }}>
                  {msg}
                </p>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={ade-in }
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              animation: 'slideIn 0.2s ease-out',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                fontSize: 13,
                lineHeight: 1.5,
                border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none',
                wordBreak: 'break-word',
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{ fontSize: 10, fontWeight: 500, marginBottom: 4, opacity: 0.6 }}>
                  {providerName} AI
                </div>
              )}
              <div dangerouslySetInnerHTML={{
                __html: msg.content
                  .replace(/`(\w*)\n?([\s\S]*?)`/g, '<pre style="background:var(--bg-primary);padding:10px;border-radius:6px;overflow-x:auto;font-size:12px;margin:8px 0;color:var(--text-primary)"></pre>')
                  .replace(/([^]+)/g, '<code style="background:rgba(92,141,249,0.15);padding:2px 6px;border-radius:3px;font-size:12px"></code>')
                  .split('\n').filter(l => l).map(l => l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')).join('<br>')
              }} />
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'slideIn 0.2s ease-out' }}>
            <div className="typing-indicator" style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            className="textarea"
            placeholder={Ask me to create a p5.js sketch... (Shift+Enter for newline)}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasApiKey || isLoading}
            rows={1}
          />
          <button
            type="submit"
            className={tn btn-primary }
            disabled={!hasApiKey || isLoading || !input.trim()}
            style={{ alignSelf: 'flex-end', flexShrink: 0 }}
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}
