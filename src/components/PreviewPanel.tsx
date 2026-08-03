'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildHtmlFromTemplate, type UploadedAsset } from '../lib/types';

interface PreviewPanelProps {
  code: string;
  assets: UploadedAsset[];
  htmlTemplate: string;
  onError: (error: string | null) => void;
}

function buildPreviewHtml(sketchCode: string, assets: UploadedAsset[], htmlTemplate: string): string {
  return buildHtmlFromTemplate(htmlTemplate, {
    sketchSource: sketchCode,
    assets,
    includeMl5: true,
  });
}

export default function PreviewPanel({ code, assets, htmlTemplate, onError }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<string[]>([]);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const previewHtml = useMemo(() => {
    return code ? buildPreviewHtml(code, assets, htmlTemplate) : '';
  }, [code, assets, htmlTemplate]);

  useEffect(() => {
    if (!code) {
      onError(null);
    }
  }, [code, onError]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'p5-error') {
        onError(`p5.js error: ${event.data.message || 'Unknown error'}`);
      }

      if (event.data?.type === 'p5-console') {
        const message = String(event.data.message || 'Unknown preview error');
        setConsoleEntries(entries => [...entries, message].slice(-50));
      }

      if (event.data?.type === 'p5-ready') {
        onError(null);
      }

      if (event.data?.type === 'p5-exit-fullscreen') {
        exitFullscreen();
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onError, exitFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        exitFullscreen();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, exitFullscreen]);

  useEffect(() => {
    setFrameLoaded(false);
    setConsoleEntries([]);
  }, [previewHtml]);

  const sketchStyle = isFullscreen
    ? { position: 'fixed' as const, inset: 0, zIndex: 9999, border: 'none', width: '100%', height: '100%' }
    : { flex: 1, border: 'none', width: '100%', height: '100%' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>🎨 Preview</span>

        <span className="badge badge-purple">ml5.js enabled</span>

        {frameLoaded && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent-green)' }}>● Live</span>}

        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => setIsFullscreen(prev => !prev)}
          title={isFullscreen ? 'Exit fullscreen preview' : 'Open preview fullscreen'}
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', background: '#ffffff' }}>
        {code ? (
          <iframe
            ref={iframeRef}
            title="p5.js Preview"
            srcDoc={previewHtml}
            onLoad={() => {
              setFrameLoaded(true);
            }}
            style={sketchStyle}
            allow="camera *; microphone *; autoplay *; fullscreen *"
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            <span>Write some p5.js code to see the preview here.</span>
          </div>
        )}
      </div>

      {!isFullscreen && (
        <div
          aria-live="polite"
          style={{
            height: 116,
            flexShrink: 0,
            overflowY: 'auto',
            background: '#17191d',
            borderTop: '1px solid var(--border-color)',
            color: consoleEntries.length ? '#fca5a5' : '#94a3b8',
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontSize: 11,
            lineHeight: 1.5,
            padding: '8px 12px',
          }}
        >
          <div style={{ color: '#e2e8f0', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>
            PREVIEW CONSOLE
          </div>
          {consoleEntries.length ? consoleEntries.map((entry, index) => <div key={`${index}-${entry}`}>Error: {entry}</div>) : <div>No errors.</div>}
        </div>
      )}
    </div>
  );
}
