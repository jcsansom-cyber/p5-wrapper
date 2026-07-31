'use client';

import React, { useRef } from 'react';
import type { UploadedAsset } from '../lib/types';

interface AssetBarProps {
  assets: UploadedAsset[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveAsset: (id: string) => void;
  onClearAssets: () => void;
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetBar({ assets, onAddFiles, onRemoveAsset, onClearAssets }: AssetBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--border-color)',
        background: 'linear-gradient(180deg, rgba(37, 37, 51, 0.9), rgba(26, 26, 36, 0.95))',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Assets</strong>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Upload any file and reference it with <code>p5AssetURL("name")</code>
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => inputRef.current?.click()}
          >
            Add Files
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={onClearAssets}
            disabled={assets.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

        <input
        ref={inputRef}
        type="file"
        multiple
        accept="*/*"
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files?.length) {
            onAddFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {assets.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          {assets.map(asset => {
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
                  flexDirection: 'column',
                  gap: 8,
                  minHeight: 120,
                }}
              >
                <div
                  style={{
                    height: 72,
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {isImage ? (
                    <img
                      src={asset.dataUrl}
                      alt={asset.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: 8 }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{isAudio ? '🎵' : '📄'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {isAudio ? 'Audio file' : 'Asset'}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                    {asset.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatSize(asset.size)}</div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => onRemoveAsset(asset.id)}
                  style={{ width: '100%' }}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          No assets yet. Drop in any file to make it available to your sketch.
        </div>
      )}
    </div>
  );
}
