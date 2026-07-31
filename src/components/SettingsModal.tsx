'use client';

import React from 'react';
import { ANTHROPIC_MODEL_OPTIONS, OPENAI_MODEL_OPTIONS, type AppConfig, type SavedSketch } from '../lib/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (config: AppConfig) => void;
  savedSketches: SavedSketch[];
  onLoadSketch: (sketch: SavedSketch) => void;
  onDeleteSketch: (id: string) => void;
  onImportSketchFiles: (files: FileList | File[]) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  config,
  onConfigChange,
  savedSketches,
  onLoadSketch,
  onDeleteSketch,
  onImportSketchFiles,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal fade-in"
        onClick={e => e.stopPropagation()}
        style={{
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>⚙️ Settings</h2>
          <button type="button" onClick={onClose} className="btn btn-sm btn-secondary" title="Close">
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingRight: 6, minHeight: 0, flex: 1 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Saved Sketches
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Load, delete, or import a downloaded sketch.</span>
              <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                Import Sketch
                <input
                  type="file"
                  accept=".js,.txt,.html,.htm,text/plain,text/html,application/json"
                  style={{ display: 'none' }}
                  onChange={e => {
                    if (e.target.files?.length) {
                      onImportSketchFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
              {savedSketches.length > 0 ? (
                savedSketches.map(sketch => (
                  <div
                    key={sketch.id}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: 8,
                        padding: 10,
                        background: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, wordBreak: 'break-word' }}>{sketch.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Updated {new Date(sketch.updatedAt).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => onLoadSketch(sketch)}>
                        Load
                      </button>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => onDeleteSketch(sketch.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: '#6b6b7d' }}>No saved sketches yet.</div>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Claude API Key (Anthropic)
            </label>
            <input
              type="password"
              className="input"
              placeholder="sk-ant-..."
              value={config.anthropicKey}
              onChange={e => onConfigChange({ ...config, anthropicKey: e.target.value })}
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Stored only in your browser session.</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Claude Model ID
            </label>
            <input
              type="text"
              className="input"
              value={config.anthropicModel}
              onChange={e => onConfigChange({ ...config, anthropicModel: e.target.value })}
              placeholder="claude-sonnet-4-20250514"
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {ANTHROPIC_MODEL_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => onConfigChange({ ...config, anthropicModel: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Claude Haiku 4.5 is the default low-cost Anthropic option we support, and you can still paste a custom Claude model ID if needed.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              GPT API Key (OpenAI)
            </label>
            <input
              type="password"
              className="input"
              placeholder="sk-proj-..."
              value={config.openaiKey}
              onChange={e => onConfigChange({ ...config, openaiKey: e.target.value })}
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Stored only in your browser session.</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              GPT Model ID
            </label>
            <input
              type="text"
              className="input"
              value={config.openaiModel}
              onChange={e => onConfigChange({ ...config, openaiModel: e.target.value })}
              placeholder="gpt-5-nano-2025-08-07"
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              GPT-4.1 nano is the lowest-cost OpenAI option we support here.
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {OPENAI_MODEL_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => onConfigChange({ ...config, openaiModel: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              System Prompt
            </label>
            <textarea
              className="textarea"
              rows={6}
              placeholder="Customize the assistant's instructions..."
              value={config.systemPrompt}
              onChange={e => onConfigChange({ ...config, systemPrompt: e.target.value })}
            />
          </div>

            <div
              style={{
                padding: 12,
                background: 'rgba(5, 150, 105, 0.07)',
                border: '1px solid rgba(5, 150, 105, 0.18)',
                borderRadius: 6,
              }}
            >
            <p style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 500 }}>🔒 Privacy First</p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              API keys stay in browser session storage. Generated sketches and chat history can be saved locally in your
              browser, but nothing is written to the backend.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
