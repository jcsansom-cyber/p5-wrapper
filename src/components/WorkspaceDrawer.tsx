'use client';

import React, { useRef } from 'react';
import type { UploadedAsset } from '../lib/types';

interface WorkspaceDrawerProps {
  isOpen: boolean;
  assets: UploadedAsset[];
  htmlTemplate: string;
  activeTab: 'files' | 'html';
  onToggleOpen: () => void;
  onTabChange: (tab: 'files' | 'html') => void;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveAsset: (id: string) => void;
  onClearAssets: () => void;
  onHtmlTemplateChange: (template: string) => void;
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function WorkspaceDrawer({
  isOpen,
  assets,
  htmlTemplate,
  activeTab,
  onToggleOpen,
  onTabChange,
  onAddFiles,
  onRemoveAsset,
  onClearAssets,
  onHtmlTemplateChange,
}: WorkspaceDrawerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const drawerWidth = 680;

  return (
    <>
      <button
        type="button"
        onClick={onToggleOpen}
        title={isOpen ? 'Close workspace drawer' : 'Open workspace drawer'}
        style={{
          position: 'absolute',
          right: isOpen ? drawerWidth : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 40,
          border: '1px solid var(--border-color)',
          borderRight: isOpen ? 'none' : '1px solid var(--border-color)',
          borderRadius: '8px 0 0 8px',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          padding: '10px 8px',
          cursor: 'pointer',
          boxShadow: 'var(--shadow)',
        }}
      >
        {isOpen ? '◀' : '▶'}
      </button>

      <div
        style={{
          position: 'absolute',
          right: isOpen ? 0 : -drawerWidth,
          top: 0,
          width: drawerWidth,
          height: '100%',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: isOpen ? '-8px 0 24px rgba(0,0,0,0.25)' : 'none',
          transition: 'right 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 35,
        }}
      >
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'files' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 0, flex: 1 }}
            onClick={() => onTabChange('files')}
          >
            Files
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'html' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 0, flex: 1 }}
            onClick={() => onTabChange('html')}
          >
            HTML
          </button>
        </div>

        {activeTab === 'files' ? (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Files</strong>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Add images and audio for p5AssetURL()</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => inputRef.current?.click()}>
                  Add Files
                </button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={onClearAssets} disabled={assets.length === 0}>
                  Clear
                </button>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,audio/*"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files?.length) {
                  onAddFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />

            <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr', gap: 8, minHeight: 0 }}>
              {assets.length > 0 ? (
                assets.map(asset => {
                  const isImage = asset.type.startsWith('image/');
                  const isAudio = asset.type.startsWith('audio/');
                  return (
                    <div
                      key={asset.id}
                      style={{
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-primary)',
                        borderRadius: 10,
                        padding: 8,
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 8,
                          overflow: 'hidden',
                          background: 'rgba(255,255,255,0.03)',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isImage ? (
                          <img src={asset.dataUrl} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ textAlign: 'center', fontSize: 11 }}>
                            <div style={{ fontSize: 20 }}>{isAudio ? '🎵' : '📄'}</div>
                            <div style={{ color: 'var(--text-muted)' }}>{isAudio ? 'Audio' : 'File'}</div>
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, wordBreak: 'break-word' }}>{asset.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatSize(asset.size)}</div>
                      </div>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => onRemoveAsset(asset.id)}>
                        Remove
                      </button>
                    </div>
                  );
                })
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No files uploaded yet.</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'hidden', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 14, color: 'var(--text-secondary)' }}>HTML</strong>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Edit the exported wrapper file here. WebGL, webcam, and script-tag tweaks belong here.</span>
            </div>
            <textarea
              className="textarea"
              value={htmlTemplate}
              onChange={e => onHtmlTemplateChange(e.target.value)}
              spellCheck={false}
              style={{
                flex: 1,
                minHeight: 0,
                resize: 'none',
                padding: 16,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                fontSize: 12,
                lineHeight: 1.6,
                border: '1px solid var(--border-color)',
                borderRadius: 10,
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
