'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage, Provider } from '../lib/types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  currentProvider: Provider;
  hasApiKey: boolean;
}

function renderMessageContent(content: string) {
  const segments: React.ReactNode[] = [];
  const fenceRegex = /```([\w-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = fenceRegex.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    if (before.trim()) {
      segments.push(
        <span key={`text-${key++}`} style={{ whiteSpace: 'pre-wrap' }}>
          {before}
        </span>
      );
    }

    segments.push(
      <pre
        key={`code-${key++}`}
        style={{
          margin: '8px 0',
          padding: 10,
          borderRadius: 6,
          background: '#f8fafc',
          border: '1px solid var(--border-color)',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          fontSize: 12,
          lineHeight: 1.5,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        }}
      >
        {match[2].trim()}
      </pre>
    );

    lastIndex = fenceRegex.lastIndex;
  }

  const tail = content.slice(lastIndex);
  if (tail.trim()) {
    segments.push(
      <span key={`tail-${key++}`} style={{ whiteSpace: 'pre-wrap' }}>
        {tail}
      </span>
    );
  }

  if (segments.length === 0) {
    return <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>;
  }

  return segments;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  isLoading,
  currentProvider,
  hasApiKey,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const providerName = currentProvider === 'anthropic' ? 'Claude' : 'GPT';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
  }, [input]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const welcomeMessages = [
    'What would you like to create?',
    'Try asking for:',
    'Animated shapes',
    'Particle systems',
    'Interactive drawings',
    'Data visualizations',
    'ml5.js object detection',
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>AI Assistant</span>
          {hasApiKey ? (
            <span className="badge badge-green">Connected</span>
          ) : (
            <span className="badge badge-orange" title="Configure this provider's API key on the server">
              Not configured
            </span>
          )}
        </div>
        {!hasApiKey && (
          <p style={{ fontSize: 11, color: 'var(--accent-orange)' }}>
            Configure this provider's API key as a server environment variable to start generating code.
          </p>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, background: '#fff' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 40 }}>
            <p style={{ fontSize: 28, marginBottom: 16 }}>🎨</p>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Welcome to p5.js AI Studio
            </p>
            <div style={{ textAlign: 'left', display: 'inline-block' }}>
              {welcomeMessages.map((msg, i) => (
                <p
                  key={msg}
                  style={{
                    fontSize: 13,
                    margin: `${i === 0 ? 0 : 6}px 0`,
                    opacity: i === 1 ? 0.8 : 0.55,
                  }}
                >
                  {msg}
                </p>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className="fade-in"
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
                  {providerName}
                </div>
              )}
              <div>{renderMessageContent(msg.content)}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'slideIn 0.2s ease-out' }}>
            <div
              className="typing-indicator"
              style={{
                padding: '10px 14px',
                borderRadius: '12px 12px 12px 4px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            className="textarea"
            placeholder="Ask me to create a p5.js sketch... (Shift+Enter for newline)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasApiKey || isLoading}
            rows={1}
          />
          <button
            type="submit"
            className="btn btn-primary"
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
