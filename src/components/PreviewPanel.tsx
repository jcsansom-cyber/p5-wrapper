'use client';

import React, { useState, useRef, useEffect } from 'react';

interface PreviewPanelProps {
  code: string;
  includeMl5: boolean;
  onToggleMl5: (include: boolean) => void;
  onError: (error: string | null) => void;
}

export default function PreviewPanel({ code, includeMl5, onToggleMl5, onError }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (code && iframeRef.current?.contentDocument) {
      loadPreview(code);
    }
  }, [code]);

  function loadPreview(sketchCode: string) {
    if (!iframeRef.current) return;

    const fullHtml = <!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; }
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0a0a0f; overflow: hidden; }
    canvas { display: block; max-width: 100%; max-height: 100vh; }
  </style>
</head>
<body>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js"><\/script>
  
  <script>
    window.addEventListener('error', function(e) {
      window.parent.postMessage({ type: 'p5-error', message: e.message, filename: e.filename, line: e.line }, '*');
    });

    window._p5Ready = false;
    window._drawFrameCount = 0;
    let startTime = Date.now();

    window.addEventListener('load', function() {
      // Wait for p5 to initialize
      const checkP5 = setInterval(function() {
        if (typeof p5 !== 'undefined') {
          clearInterval(checkP5);
          window._p5Ready = true;
          window.parent.postMessage({ type: 'p5-ready' }, '*');
        }
      }, 100);
    });

    // Original createCanvas that counts frames
    const origCreateCanvas = p5.prototype.createCanvas;
    p5.prototype.createCanvas = function() {
      const result = origCreateCanvas.apply(this, arguments);
      setInterval(function() {
        if (window._p5Ready) {
          window.parent.postMessage({ type: 'p5-frame', frameCount: ++window._drawFrameCount }, '*');
        }
      }, 100);
      return result;
    };

    try {

    } catch(err) {
      window.parent.postMessage({ type: 'p5-error', message: err.message, filename: 'sketch.js', line: 0 }, '*');
    }
  <\/script>
</body>
</html>;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;
    setFrameLoaded(false);

    iframeRef.current.onload = () => {
      setFrameLoaded(true);
      onError(null);
    };
  }

  // Listen for p5 errors from the iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'p5-error') {
        onError(p5.js Error: );
      } else if (event.data?.type === 'p5-ready') {
        onError(null);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onError]);

  const sketchStyle = isFullscreen ? 'position: fixed; inset: 0; z-index: 9999; border: none;' : 'flex: 1; border: none; width: 100%;';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Preview toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
        background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>🎨 Preview</span>
        
        {includeMl5 && (
          <span className="badge badge-purple">ml5.js</span>
        )}
        
        {frameLoaded && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent-green)' }}>● Live</span>
        )}

        <button
          className="btn btn-sm btn-secondary"
          onClick={() => code && loadPreview(code)}
          title="Reload preview"
          disabled={!code}
          style={{ marginLeft: 'auto' }}
        >
          ⟳ Reload
        </button>

        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen'}
        >
          {isFullscreen ? '⊡' : '⊞'}
        </button>
      </div>

      {/* Preview toggle buttons */}
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
        fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer',
        borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)'
      }}>
        <input
          type="checkbox"
          checked={includeMl5}
          onChange={e => onToggleMl5(e.target.checked)}
          style={{ accentColor: 'var(--accent-purple)' }}
        />
        Include ml5.js for ML features
      </label>

      {/* Iframe container */}
      <div style={{ flex: 1, overflow: 'auto', background: '#0a0a0f' }}>
        {isFullscreen ? (
          <iframe
            ref={iframeRef}
            title="p5.js Preview"
            style={sketchStyle}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        ) : (
          code ? (
            <iframe
              ref={iframeRef}
              title="p5.js Preview"
              style={sketchStyle}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>
              <span>Write some p5.js code to see the preview here</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
