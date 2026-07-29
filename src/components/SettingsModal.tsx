'use client';

import React from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    anthropicKey: string;
    openaiKey: string;
    systemPrompt: string;
  };
  onConfigChange: (config: {
    anthropicKey: string;
    openaiKey: string;
    systemPrompt: string;
  }) => void;
}

export default function SettingsModal({ isOpen, onClose, config, onConfigChange }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>⚙️ Settings</h2>
          <button onClick={onClose} className="btn btn-sm btn-secondary" title="Close">✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Anthropic API Key */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9898a8', marginBottom: 6 }}>
              Claude API Key (Anthropic)
            </label>
            <input
              type="password"
              className="input"
              placeholder="sk-ant-..."
              value={config.anthropicKey}
              onChange={e => onConfigChange({ ...config, anthropicKey: e.target.value })}
            />
            <p style={{ fontSize: 11, color: '#6b6b7d', marginTop: 4 }}>
              Get your key from console.anthropic.com
            </p>
          </div>

          {/* OpenAI API Key */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9898a8', marginBottom: 6 }}>
              GPT API Key (OpenAI)
            </label>
            <input
              type="password"
              className="input"
              placeholder="sk-proj-..."
              value={config.openaiKey}
              onChange={e => onConfigChange({ ...config, openaiKey: e.target.value })}
            />
            <p style={{ fontSize: 11, color: '#6b6b7d', marginTop: 4 }}>
              Get your key from platform.openai.com
            </p>
          </div>

          {/* System Prompt */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9898a8', marginBottom: 6 }}>
              Custom System Prompt
            </label>
            <textarea
              className="textarea"
              rows={4}
              placeholder="Override the default system prompt..."
              value={config.systemPrompt}
              onChange={e => onConfigChange({ ...config, systemPrompt: e.target.value })}
            />
          </div>

          {/* Privacy Notice */}
          <div style={{ padding: 12, background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: 6 }}>
            <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 500 }}>🔒 Privacy First</p>
            <p style={{ fontSize: 11, color: '#9898a8', lineHeight: 1.5 }}>
              Your API keys are stored only in your browser&apos;s memory and localStorage. 
              No data is ever sent to our servers. All API requests go directly through this app&apos;s 
              serverless function — we never log or store your prompts or generated code.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
