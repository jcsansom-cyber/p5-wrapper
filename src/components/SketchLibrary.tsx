'use client';

import React, { useRef } from 'react';
import type { SavedSketch } from '../lib/types';

interface SketchLibraryProps {
  sketches: SavedSketch[];
  activeSketchId: string | null;
  onLoadSketch: (sketch: SavedSketch) => void;
  onDeleteSketch: (id: string) => void;
  onImportFiles: (files: FileList | File[]) => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export default function SketchLibrary({
  sketches,
  activeSketchId,
  onLoadSketch,
  onDeleteSketch,
  onImportFiles,
}: SketchLibraryProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Sketch Library</strong>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Load saved sketches or import a downloaded HTML or JS file.
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => inputRef.current?.click()}>
            Import File
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".js,.txt,.html,.htm,text/plain,text/html,application/json"
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files?.length) {
            onImportFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {sketches.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {sketches.map(sketch => (
            <div
              key={sketch.id}
              style={{
                border: sketch.id === activeSketchId ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{sketch.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Updated {formatDate(sketch.updatedAt)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => onLoadSketch(sketch)}>
                  Load
                </button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => onDeleteSketch(sketch.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No saved sketches yet.</div>
      )}
    </div>
  );
}

