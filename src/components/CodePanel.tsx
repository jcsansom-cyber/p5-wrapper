'use client';

import React, { useState } from 'react';

interface CodePanelProps {
  code: string;
  onCodeChange: (code: string) => void;
}

export default function CodePanel({ code, onCodeChange }: CodePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localCode, setLocalCode] = useState(code);

  React.useEffect(() => {
    if (!isEditing) setLocalCode(code);
  }, [code, isEditing]);

  function handleDownload() {
    const fullHtml = generateFullSketchHtml(localCode);
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sketch_.html;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleCopy() {
    navigator.clipboard.writeText(localCode).catch(() => {});
  }

  function handleSaveEdit() {
    onCodeChange(localCode);
    setIsEditing(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Code toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
        background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)'
      }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>📝 Sketch Code</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {isEditing ? (
            <>
              <button className="btn btn-sm btn-success" onClick={handleSaveEdit}>💾 Save</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn btn-sm btn-secondary" onClick={() => { setLocalCode(code); setIsEditing(true); }}>✏️ Edit</button>
              <button className="btn btn-sm btn-secondary" onClick={handleCopy} title="Copy code">📋 Copy</button>
              <button className="btn btn-sm btn-primary" onClick={handleDownload} title="Download sketch as HTML file">⬇ Download</button>
            </>
          )}
        </div>
      </div>

      {/* Code content */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-primary)' }}>
        {isEditing ? (
          <textarea
            value={localCode}
            onChange={e => setLocalCode(e.target.value)}
            style={{
              width: '100%', height: '100%', padding: 16, border: 'none', outline: 'none',
              background: 'var(--bg-primary)', color: 'var(--text-primary)',
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              fontSize: 12, lineHeight: 1.6, resize: 'none'
            }}
            spellCheck={false}
          />
        ) : (
          <div style={{ padding: 16 }}>
            {code ? (
              <pre className="code-block" style={{ margin: 0 }}>{code}</pre>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 20px' }}>
                Ask the AI assistant to generate p5.js code, or write your own sketch here.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function generateFullSketchHtml(sketchCode: string): string {
  return <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>p5.js Sketch</title>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f0f0f0; overflow: hidden; }
  </style>
</head>
<body>
<script>

<\/script>
</body>
</html>;
}
