'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ChatPanel from '../components/ChatPanel';
import CodePanel from '../components/CodePanel';
import PreviewPanel from '../components/PreviewPanel';
import SettingsModal from '../components/SettingsModal';
import WorkspaceDrawer from '../components/WorkspaceDrawer';
import {
  DEFAULT_CONFIG,
  DEFAULT_SKETCH,
  DEFAULT_HTML_TEMPLATE,
  type AppConfig,
  type ChatMessage,
  type Provider,
  type ProviderMessage,
  type SavedSketch,
  type UploadedAsset,
  buildAssetContext,
  extractFencedBlock,
  extractHtmlTemplate,
  normalizeAnthropicModel,
} from '../lib/types';
import { extractCodeBlock } from '../lib/types';
import { clearAssets as clearStoredAssets, loadAssets, saveAssets } from '../lib/assetStore';
import { extractSketchFromImportedText } from '../lib/sketchImport';
import { loadSketches, removeSketch, saveSketches, upsertSketch } from '../lib/sketchStore';

type LayoutMode = 'split' | 'chat' | 'code';

interface PersistedAppState {
  activeProvider: Provider;
  currentCode: string;
  messages: ChatMessage[];
  includeMl5: boolean;
  layout: LayoutMode;
  sessionCount: number;
  activeSketchId: string | null;
  chatWidth: number;
  codeWidth: number;
  htmlTemplate: string;
  drawerOpen: boolean;
}

const CONFIG_STORAGE_KEY = 'p5-ai-config';
const STATE_STORAGE_KEY = 'p5-ai-state';
const MIN_CHAT_WIDTH = 280;
const MIN_CODE_WIDTH = 320;
const DEFAULT_CHAT_WIDTH = 360;
const DEFAULT_CODE_WIDTH = 520;
const RESIZE_GRIP_WIDTH = 8;

function composeSystemPrompt(basePrompt: string, includeMl5: boolean, sketchContext: string, assetContext: string): string {
  const trimmedBase = basePrompt.trim() || DEFAULT_CONFIG.systemPrompt;
  let prompt = trimmedBase;

  if (includeMl5) {
    prompt +=
      '\n\nThe user may want ml5.js features. If so, include the ml5.js CDN script and write code that works in the browser.' +
      '\nFor webcam models such as FaceMesh, BodyPose, and HandPose, use createCapture(VIDEO), hide the video element, and call detectStart(video, callback).' +
      '\nFor image classification or Teachable Machine, choose the matching classifier API and keep the sketch logic separate from the HTML wrapper.' +
      '\nDo not use the old ml5.faceApi API.' +
      '\nIf the sketch needs the camera, remind the user it requires HTTPS or localhost.' +
      '\nIf the sketch needs extra script tags, iframe permissions, or other wrapper changes, you may return a full HTML document in a fenced html code block so the app can apply it.';
  }

  if (sketchContext.trim()) {
    prompt += `\n\nCurrent sketch context:\n\`\`\`javascript\n${sketchContext.trim()}\n\`\`\``;
  }

  if (assetContext.trim()) {
    prompt += assetContext;
  }

  return prompt;
}

function buildApiMessages(currentCode: string, previousMessages: ChatMessage[], nextMessage: string): ProviderMessage[] {
  const history: ProviderMessage[] = previousMessages.slice(-8).map(message => ({
    role: message.role,
    content: message.content,
  }));

  const sketchContext = currentCode.trim()
    ? [
        {
          role: 'user' as const,
          content: `Here is the current p5.js sketch:\n\n\`\`\`javascript\n${currentCode.trim()}\n\`\`\``,
        },
      ]
    : [];

  return [...sketchContext, ...history, { role: 'user', content: nextMessage }];
}

export default function Home() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [activeProvider, setActiveProvider] = useState<Provider>('anthropic');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentCode, setCurrentCode] = useState(DEFAULT_SKETCH);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [includeMl5, setIncludeMl5] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutMode>('split');
  const [sessionCount, setSessionCount] = useState(0);
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [savedSketches, setSavedSketches] = useState<SavedSketch[]>([]);
  const [activeSketchId, setActiveSketchId] = useState<string | null>(null);
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
  const [codeWidth, setCodeWidth] = useState(DEFAULT_CODE_WIDTH);
  const [htmlTemplate, setHtmlTemplate] = useState(DEFAULT_HTML_TEMPLATE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<'files' | 'html'>('files');
  const [hydrated, setHydrated] = useState(false);
  const dragStateRef = useRef<{ type: 'chat' | 'code' | null; startX: number; startWidth: number }>({
    type: null,
    startX: 0,
    startWidth: 0,
  });

  useEffect(() => {
    const savedConfig = sessionStorage.getItem(CONFIG_STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as Partial<AppConfig>;
        setConfig(prev => ({
          ...prev,
          ...parsed,
          anthropicModel: normalizeAnthropicModel(parsed.anthropicModel),
        }));
      } catch {
        // Ignore malformed session data.
      }
    }

    const savedState = localStorage.getItem(STATE_STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState) as Partial<PersistedAppState>;
        if (parsed.activeProvider === 'anthropic' || parsed.activeProvider === 'openai') {
          setActiveProvider(parsed.activeProvider);
        }
        if (typeof parsed.currentCode === 'string') {
          setCurrentCode(parsed.currentCode);
        }
        if (Array.isArray(parsed.messages)) {
          setMessages(parsed.messages as ChatMessage[]);
        }
        if (typeof parsed.includeMl5 === 'boolean') {
          setIncludeMl5(parsed.includeMl5);
        }
        if (parsed.layout === 'split' || parsed.layout === 'chat' || parsed.layout === 'code') {
          setLayout(parsed.layout);
        }
        if (typeof parsed.sessionCount === 'number') {
          setSessionCount(parsed.sessionCount);
        }
        if (typeof parsed.activeSketchId === 'string' || parsed.activeSketchId === null) {
          setActiveSketchId(parsed.activeSketchId);
        }
        if (typeof parsed.chatWidth === 'number') {
          setChatWidth(Math.max(MIN_CHAT_WIDTH, parsed.chatWidth));
        }
        if (typeof parsed.codeWidth === 'number') {
          setCodeWidth(Math.max(MIN_CODE_WIDTH, parsed.codeWidth));
        }
        if (typeof parsed.htmlTemplate === 'string' && parsed.htmlTemplate.trim()) {
          setHtmlTemplate(parsed.htmlTemplate);
        }
        if (typeof parsed.drawerOpen === 'boolean') {
          setDrawerOpen(parsed.drawerOpen);
        }
      } catch {
        // Ignore malformed saved state.
      }
    }

    loadAssets()
      .then(setAssets)
      .catch(() => {
        // Asset storage is optional and may not be available in every browser profile.
      })
      .finally(() => {
        setAssetsLoaded(true);
      });

    try {
      setSavedSketches(loadSketches());
    } catch {
      setSavedSketches([]);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    const state: PersistedAppState = {
      activeProvider,
      currentCode,
      messages,
      includeMl5,
      layout,
      sessionCount,
      activeSketchId,
      chatWidth,
      codeWidth,
      htmlTemplate,
      drawerOpen,
    };

    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
  }, [activeProvider, currentCode, messages, includeMl5, layout, sessionCount, activeSketchId, chatWidth, codeWidth, htmlTemplate, drawerOpen, hydrated]);

  useEffect(() => {
    if (!hydrated || !assetsLoaded) return;
    saveAssets(assets).catch(() => {
      // If the browser refuses persistence, the current session still works.
    });
  }, [assets, hydrated, assetsLoaded]);

  useEffect(() => {
    if (!hydrated) return;
    saveSketches(savedSketches);
  }, [savedSketches, hydrated]);

  const providerKey = activeProvider === 'anthropic' ? config.anthropicKey.trim() : config.openaiKey.trim();
  const hasApiKey = Boolean(providerKey);
  const anthropicModel = normalizeAnthropicModel(config.anthropicModel);
  const openaiModel = config.openaiModel.trim() || DEFAULT_CONFIG.openaiModel;

  const sendMessage = useCallback(
    async (content: string) => {
      if (!providerKey || isLoading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setIsLoading(true);

      const systemPrompt = composeSystemPrompt(config.systemPrompt, includeMl5, currentCode, buildAssetContext(assets));
      const apiMessages = buildApiMessages(currentCode, messages, content);

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: activeProvider,
            apiKey: providerKey,
            model: activeProvider === 'anthropic' ? anthropicModel : openaiModel,
            messages: apiMessages,
            systemPrompt,
            maxTokens: 4096,
          }),
        });

        if (!response.ok) {
          const rawError = await response.text().catch(() => '');
          let message = `API error (${response.status})`;
          if (rawError) {
            try {
              const parsed = JSON.parse(rawError) as { error?: string; message?: string };
              message = parsed.error || parsed.message || rawError || message;
            } catch {
              message = rawError;
            }
          }
          throw new Error(message);
        }

        const data = (await response.json()) as { text?: string };
        const text = data.text ?? '';
        const htmlTemplateCandidate = extractHtmlTemplate(text);
        const code = htmlTemplateCandidate
          ? extractFencedBlock(text, ['p5js', 'javascript', 'js']) || extractSketchFromImportedText(text)
          : extractCodeBlock(text);

        if (code) {
          setCurrentCode(code);
          setActiveSketchId(null);
          setSessionCount(prev => prev + 1);
        }

        if (htmlTemplateCandidate) {
          setHtmlTemplate(htmlTemplateCandidate);
          setDrawerOpen(true);
          setSessionCount(prev => prev + 1);
        }

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: text,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      } catch (error) {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [providerKey, isLoading, messages, activeProvider, config.systemPrompt, anthropicModel, openaiModel, includeMl5, currentCode]
  );

  const handleCodeChange = useCallback((newCode: string) => {
    setCurrentCode(newCode);
    setActiveSketchId(null);
    setSessionCount(prev => prev + 1);
  }, []);

  const handleSaveSketch = useCallback((code: string) => {
    setCurrentCode(code);
    const nextSketches = upsertSketch({
      id: activeSketchId ?? undefined,
      name: activeSketchId ? savedSketches.find(sketch => sketch.id === activeSketchId)?.name : undefined,
      code,
      existing: savedSketches,
    });
    setSavedSketches(nextSketches);
    setActiveSketchId(activeSketchId ?? nextSketches[0]?.id ?? null);
    setSessionCount(prev => prev + 1);
  }, [activeSketchId, savedSketches]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setPreviewError(null);
  }, []);

  const loadSampleSketch = useCallback(() => {
    setCurrentCode(DEFAULT_SKETCH);
    setActiveSketchId(null);
    setSessionCount(prev => prev + 1);
  }, []);

  const handleAddFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(file => file.type.startsWith('image/') || file.type.startsWith('audio/'));
    if (files.length === 0) return;

    const readAsDataUrl = (file: File) =>
      new Promise<UploadedAsset>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: String(reader.result || ''),
            addedAt: Date.now(),
          });
        };
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      });

    try {
      const uploadedAssets = await Promise.all(files.map(readAsDataUrl));
      setAssets(prev => [...prev, ...uploadedAssets]);
      setSessionCount(prev => prev + uploadedAssets.length);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to add asset');
    }
  }, []);

  const handleLoadSavedSketch = useCallback((sketch: SavedSketch) => {
    setCurrentCode(sketch.code);
    setActiveSketchId(sketch.id);
    setSessionCount(prev => prev + 1);
  }, []);

  const handleDeleteSketch = useCallback((id: string) => {
    const nextSketches = removeSketch(id, savedSketches);
    setSavedSketches(nextSketches);
    if (activeSketchId === id) {
      setActiveSketchId(null);
    }
  }, [activeSketchId, savedSketches]);

  const handleImportSketchFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const importedSketches: SavedSketch[] = [];

    for (const file of files) {
      const text = await file.text();
      const code = extractSketchFromImportedText(text);
      if (!code) continue;

      const baseName = file.name.replace(/\.[^.]+$/, '') || 'Imported Sketch';
      const sketch: SavedSketch = {
        id: crypto.randomUUID(),
        name: baseName,
        code,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      importedSketches.push(sketch);
    }

    if (importedSketches.length === 0) return;

    const nextSketches = [...importedSketches, ...savedSketches];
    setSavedSketches(nextSketches);
    setCurrentCode(importedSketches[0].code);
    setActiveSketchId(importedSketches[0].id);
    setSessionCount(prev => prev + importedSketches.length);
  }, [savedSketches]);

  const startResize = useCallback(
    (type: 'chat' | 'code', event: React.PointerEvent<HTMLDivElement>) => {
      if (layout !== 'split') return;
      event.preventDefault();

      const startX = event.clientX;
      const startWidth = type === 'chat' ? chatWidth : codeWidth;
      const maxWidth =
        type === 'chat'
          ? Math.max(MIN_CHAT_WIDTH, window.innerWidth - MIN_CODE_WIDTH - 160)
          : Math.max(MIN_CODE_WIDTH, window.innerWidth - chatWidth - 160);

      const onMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        const nextWidth = Math.max(
          type === 'chat' ? MIN_CHAT_WIDTH : MIN_CODE_WIDTH,
          Math.min(startWidth + delta, maxWidth)
        );

        if (type === 'chat') {
          setChatWidth(nextWidth);
        } else {
          setCodeWidth(nextWidth);
        }
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    },
    [layout, chatWidth, codeWidth]
  );

  const handleRemoveAsset = useCallback((id: string) => {
    setAssets(prev => prev.filter(asset => asset.id !== id));
  }, []);

  const handleClearAssets = useCallback(() => {
    setAssets([]);
    clearStoredAssets().catch(() => {});
  }, []);

  const layoutButtonLabel = (mode: LayoutMode) => {
    if (mode === 'split') return 'Split';
    if (mode === 'chat') return 'Chat';
    return 'Code';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {(['split', 'chat', 'code'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              className={`btn btn-sm ${layout === mode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setLayout(mode)}
              style={{ textTransform: 'capitalize' }}
              title={`Show ${layoutButtonLabel(mode)}`}
            >
              {layoutButtonLabel(mode)}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border-color)' }} />

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(['anthropic', 'openai'] as const).map(provider => (
            <button
              key={provider}
              type="button"
              className={`btn btn-sm ${activeProvider === provider ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveProvider(provider)}
            >
              {provider === 'anthropic' ? 'Claude' : 'GPT'}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border-color)' }} />

        <button type="button" className="btn btn-sm btn-secondary" onClick={clearChat} title="Clear chat">
          Clear Chat
        </button>
        <button type="button" className="btn btn-sm btn-success" onClick={loadSampleSketch} title="Load sample sketch">
          Sample Sketch
        </button>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => {
            setDrawerOpen(true);
            setWorkspaceTab('html');
          }}
          title="Open the HTML editor"
        >
          Edit HTML
        </button>

        <div style={{ flex: 1 }} />

        {sessionCount > 0 && (
          <span className="badge badge-blue" style={{ fontSize: 11 }}>
            {sessionCount} saved or generated sketch{sessionCount > 1 ? 'es' : ''}
          </span>
        )}

        <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowSettings(true)} title="Settings">
          Settings
        </button>
      </div>

      {previewError && (
        <div
          style={{
            padding: '6px 12px',
            background: 'rgba(248, 113, 113, 0.1)',
            borderBottom: '1px solid rgba(248, 113, 113, 0.3)',
            fontSize: 12,
            color: '#f87171',
          }}
        >
          {previewError}
        </div>
      )}

      <div style={{ position: 'relative', flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {(layout === 'split' || layout === 'chat') && (
          <div
            style={{
              width: layout === 'split' ? chatWidth : '100%',
              minWidth: layout === 'split' ? MIN_CHAT_WIDTH : 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              borderRight: layout === 'split' ? '1px solid var(--border-color)' : 'none',
            }}
          >
            <ChatPanel
              messages={messages}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              currentProvider={activeProvider}
              hasApiKey={hasApiKey}
            />
          </div>
        )}

        {layout === 'split' && (
          <div
            role="separator"
            aria-orientation="vertical"
            onPointerDown={event => startResize('chat', event)}
            style={{
              width: RESIZE_GRIP_WIDTH,
              cursor: 'col-resize',
              background: 'linear-gradient(180deg, transparent, rgba(92, 141, 249, 0.15), transparent)',
              flexShrink: 0,
            }}
          />
        )}

        {(layout === 'split' || layout === 'code' || layout === 'chat') && (
          <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
            {layout !== 'chat' && (
              <div
              style={{
                width: layout === 'split' ? codeWidth : '100%',
                minWidth: layout === 'split' ? MIN_CODE_WIDTH : 0,
                display: 'flex',
                flexDirection: 'column',
                  minHeight: 0,
                  borderRight: layout === 'split' ? '1px solid var(--border-color)' : 'none',
                }}
              >
                <CodePanel
                  code={currentCode}
                  assets={assets}
                  htmlTemplate={htmlTemplate}
                  includeMl5={includeMl5}
                  onCodeChange={handleCodeChange}
                  onSaveSketch={handleSaveSketch}
                />
              </div>
            )}

            {layout === 'split' && (
              <div
                role="separator"
                aria-orientation="vertical"
                onPointerDown={event => startResize('code', event)}
                style={{
                  width: RESIZE_GRIP_WIDTH,
                  cursor: 'col-resize',
                  background: 'linear-gradient(180deg, transparent, rgba(155, 109, 255, 0.15), transparent)',
                  flexShrink: 0,
                }}
              />
            )}

            {layout !== 'code' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <PreviewPanel
                  code={currentCode}
                  includeMl5={includeMl5}
                  assets={assets}
                  htmlTemplate={htmlTemplate}
                  onToggleMl5={setIncludeMl5}
                  onError={setPreviewError}
                />
              </div>
            )}
          </div>
        )}
        <WorkspaceDrawer
          isOpen={drawerOpen}
          assets={assets}
          htmlTemplate={htmlTemplate}
          activeTab={workspaceTab}
          onToggleOpen={() => setDrawerOpen(prev => !prev)}
          onTabChange={setWorkspaceTab}
          onAddFiles={handleAddFiles}
          onRemoveAsset={handleRemoveAsset}
          onClearAssets={handleClearAssets}
          onHtmlTemplateChange={setHtmlTemplate}
        />
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        config={config}
        onConfigChange={setConfig}
        savedSketches={savedSketches}
        onLoadSketch={handleLoadSavedSketch}
        onDeleteSketch={handleDeleteSketch}
        onImportSketchFiles={handleImportSketchFiles}
      />
    </div>
  );
}
