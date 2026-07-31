'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildHtmlFromTemplate, type UploadedAsset } from '../lib/types';

interface PreviewPanelProps {
  code: string;
  includeMl5: boolean;
  assets: UploadedAsset[];
  htmlTemplate: string;
  onToggleMl5: (include: boolean) => void;
  onError: (error: string | null) => void;
}

function buildPreviewHtml(sketchCode: string, includeMl5: boolean, assets: UploadedAsset[], htmlTemplate: string): string {
  return buildHtmlFromTemplate(htmlTemplate, {
    sketchSource: sketchCode,
    assets,
    includeMl5,
  });
}

export default function PreviewPanel({ code, includeMl5, assets, htmlTemplate, onToggleMl5, onError }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const previewHtml = useMemo(() => {
    return code ? buildPreviewHtml(code, includeMl5, assets, htmlTemplate) : '';
  }, [code, includeMl5, assets, htmlTemplate]);

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

        {includeMl5 && <span className="badge badge-purple">ml5.js</span>}

        {frameLoaded && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent-green)' }}>● Live</span>}

        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => onToggleMl5(!includeMl5)}
          title="Toggle ml5.js support"
        >
          {includeMl5 ? 'Disable ml5' : 'Enable ml5'}
        </button>

        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => setIsFullscreen(prev => !prev)}
          title={isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen'}
        >
          {isFullscreen ? '⊡' : '⊞'}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          fontSize: 12,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          borderTop: '1px solid var(--border-color)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <input
          type="checkbox"
          checked={includeMl5}
          onChange={e => onToggleMl5(e.target.checked)}
          style={{ accentColor: 'var(--accent-purple)' }}
        />
        Include ml5.js for ML features
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
            sandbox="allow-scripts"
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
    </div>
  );
}
