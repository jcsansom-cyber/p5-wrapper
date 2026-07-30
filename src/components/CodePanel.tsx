'use client';

import React, { useEffect, useState } from 'react';
import { buildHtmlFromTemplate, type UploadedAsset } from '../lib/types';

interface CodePanelProps {
  code: string;
  assets: UploadedAsset[];
  htmlTemplate: string;
  includeMl5: boolean;
  onCodeChange: (code: string) => void;
  onSaveSketch: (code: string) => void;
}

function buildDownloadHtml(sketchCode: string, assets: UploadedAsset[], htmlTemplate: string, includeMl5: boolean): string {
  return buildHtmlFromTemplate(htmlTemplate, {
    sketchSource: sketchCode,
    assets,
    includeMl5,
  });
}

export default function CodePanel({ code, assets, htmlTemplate, includeMl5, onCodeChange, onSaveSketch }: CodePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localCode, setLocalCode] = useState(code);

  useEffect(() => {
    if (!isEditing) {
      setLocalCode(code);
    }
  }, [code, isEditing]);

  function handleDownload() {
    const fullHtml = buildDownloadHtml(localCode, assets, htmlTemplate, includeMl5);
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'p5-sketch.html';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function handleCopy() {
    navigator.clipboard.writeText(localCode).catch(() => {});
  }

  function handleSaveEdit() {
    onCodeChange(localCode);
    setIsEditing(false);
  }

  function handleSaveCurrent() {
    onSaveSketch(localCode);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>📝 Sketch Code</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {isEditing ? (
            <>
              <button type="button" className="btn btn-sm btn-success" onClick={handleSaveEdit}>
                💾 Save
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setLocalCode(code);
                  setIsEditing(true);
                }}
              >
                ✏️ Edit
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={handleSaveCurrent} title="Save sketch locally">
                💾 Save
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={handleCopy} title="Copy code">
                📋 Copy
              </button>
              <button type="button" className="btn btn-sm btn-primary" onClick={handleDownload} title="Download sketch as HTML">
                ⬇ Download
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-primary)' }}>
        {isEditing ? (
          <textarea
            value={localCode}
            onChange={e => setLocalCode(e.target.value)}
            style={{
              width: '100%',
              height: '100%',
              padding: 16,
              border: 'none',
              outline: 'none',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              fontSize: 12,
              lineHeight: 1.6,
              resize: 'none',
            }}
            spellCheck={false}
          />
        ) : (
          <div style={{ padding: 16 }}>
            {code ? (
              <pre className="code-block" style={{ margin: 0 }}>
                {code}
              </pre>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 20px' }}>
                Ask the assistant to generate p5.js code, or write your own sketch here.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
