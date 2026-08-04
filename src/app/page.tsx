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
  type PromptContentPart,
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
const MAX_NON_IMAGE_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_HISTORY_CHARS = 8_000;
const MAX_HISTORY_MESSAGE_CHARS = 1_800;
const MAX_SKETCH_CONTEXT_CHARS = 6_000;

function composeSystemPrompt(basePrompt: string, includeMl5: boolean, assetContext: string): string {
  const trimmedBase = basePrompt.trim() || DEFAULT_CONFIG.systemPrompt;
  let prompt = trimmedBase;

  if (includeMl5) {
    prompt +=
      '\n\nThe workspace already loads one compatible p5.js and ml5.js pair. Return sketch JavaScript only; do not add CDN script tags.' +
      '\nFor FaceMesh, BodyPose, and HandPose, create and hide createCapture(VIDEO) in setup, then use detectStart(video, callback); do not use async constructors or faceApi.' +
      '\nFor HandPose, use hands[0].keypoints[8]. Use uploaded images with p5AssetURL("exact-file-name"), never remote replacements.';
  }

  if (assetContext.trim()) {
    prompt += assetContext;
  }

  return prompt;
}

function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}\n\n[trimmed]`;
}

function isPreviousDefaultPrompt(prompt: string | undefined): boolean {
  return Boolean(
    prompt?.includes('You are a helpful p5.js assistant.') ||
      (prompt?.includes('You are a collaborative creative-coding co-designer') && prompt.includes('Help users develop art pieces'))
  );
}

async function makeVisionThumbnail(dataUrl: string, mimeType: string): Promise<string> {
  const maxDimension = 384;
  const quality = 0.6;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to prepare image preview'));
    img.src = dataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to prepare image preview');
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(mimeType === 'image/png' ? 'image/png' : 'image/jpeg', quality);
}

async function buildApiMessages(
  currentCode: string,
  previousMessages: ChatMessage[],
  nextMessage: string,
  assets: UploadedAsset[]
): Promise<ProviderMessage[]> {
  const history: ProviderMessage[] = [];
  let remainingHistoryChars = MAX_HISTORY_CHARS;

  // Keep the most recent context first, dropping old turns once the request is full.
  for (let index = previousMessages.length - 1; index >= 0 && remainingHistoryChars > 0; index -= 1) {
    const message = previousMessages[index];
    if (!message.content.trim()) continue;

    const content = truncateText(message.content, Math.min(MAX_HISTORY_MESSAGE_CHARS, remainingHistoryChars));
    if (!content) continue;

    history.unshift({ role: message.role, content });
    remainingHistoryChars -= content.length;
  }

  const sketchContext = currentCode.trim()
    ? [
        {
          role: 'user' as const,
          content: `Here is the current p5.js sketch:\n\n\`\`\`javascript\n${truncateText(currentCode.trim(), MAX_SKETCH_CONTEXT_CHARS)}\n\`\`\``,
      },
    ]
    : [];

  const imageAssets = assets
    .filter(asset => asset.type.startsWith('image/'))
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, 1);

  const imageParts: PromptContentPart[] = [];
  for (const imageAsset of imageAssets) {
    try {
      imageParts.push({
        type: 'image' as const,
        mediaType: imageAsset.type || 'image/png',
        dataUrl: await makeVisionThumbnail(imageAsset.dataUrl, imageAsset.type || 'image/png'),
      });
    } catch {
      // A damaged or unsupported image should not prevent text-only generation.
    }
  }

  const assetGuidanceText = assets.length
    ? [
        'Uploaded assets are available in the workspace.',
        'Use exact uploaded filenames with p5AssetURL("exact-file-name") when you need a local file.',
        'Do not invent remote URLs for user-uploaded images, audio, or video.',
        imageAssets.length ? `Available image files: ${imageAssets.map(asset => asset.name).join(', ')}` : 'No image assets are currently uploaded.',
      ].join(' ')
    : '';

  const nextUserMessage: ProviderMessage =
    imageParts.length > 0 || assetGuidanceText
      ? {
          role: 'user',
          content: [
            {
              type: 'text',
              text: truncateText([nextMessage, assetGuidanceText].filter(Boolean).join('\n\n'), MAX_HISTORY_MESSAGE_CHARS) || 'Please use the uploaded assets in the sketch.',
            },
            ...imageParts,
          ],
        }
      : { role: 'user', content: truncateText(nextMessage, MAX_HISTORY_MESSAGE_CHARS) || 'Please help create a p5.js sketch.' };

  return [...sketchContext, ...history, nextUserMessage];
}

export default function Home() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [activeProvider, setActiveProvider] = useState<Provider>('anthropic');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentCode, setCurrentCode] = useState(DEFAULT_SKETCH);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
  const activeRequestRef = useRef<AbortController | null>(null);
  const chatContextVersionRef = useRef(0);

  async function compressImageFile(file: File): Promise<string> {
    const maxDimension = 1280;
    const quality = 0.85;
    const sourceUrl = URL.createObjectURL(file);

    try {
      const bitmap = await createImageBitmap(file).catch(() => null);
      const width = bitmap?.width ?? 0;
      const height = bitmap?.height ?? 0;

      if (!bitmap || !width || !height) {
        return await new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error(`Failed to process ${file.name}`));
              return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality));
          };
          img.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          img.src = sourceUrl;
        });
      }

      const scale = Math.min(1, maxDimension / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error(`Failed to process ${file.name}`);
      }

      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();

      return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality);
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  useEffect(() => {
    const savedConfig = sessionStorage.getItem(CONFIG_STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as Partial<AppConfig>;
        setConfig({
          anthropicKey: typeof parsed.anthropicKey === 'string' ? parsed.anthropicKey : '',
          openaiKey: typeof parsed.openaiKey === 'string' ? parsed.openaiKey : '',
          anthropicModel: normalizeAnthropicModel(parsed.anthropicModel),
          openaiModel: typeof parsed.openaiModel === 'string' ? parsed.openaiModel : DEFAULT_CONFIG.openaiModel,
          systemPrompt: typeof parsed.systemPrompt === 'string' && !isPreviousDefaultPrompt(parsed.systemPrompt)
            ? parsed.systemPrompt
            : DEFAULT_CONFIG.systemPrompt,
        });
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
      layout,
      sessionCount,
      activeSketchId,
      chatWidth,
      codeWidth,
      htmlTemplate,
      drawerOpen,
    };

    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
  }, [activeProvider, currentCode, messages, layout, sessionCount, activeSketchId, chatWidth, codeWidth, htmlTemplate, drawerOpen, hydrated]);

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
  const effectiveIncludeMl5 = true;

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
      const chatContextVersion = chatContextVersionRef.current;
      let requestController: AbortController | null = null;

      try {
        const systemPrompt = composeSystemPrompt(config.systemPrompt, effectiveIncludeMl5, buildAssetContext(assets));
        const apiMessages = await buildApiMessages(currentCode, messages, content, assets);
        if (chatContextVersion !== chatContextVersionRef.current) return;

        const controller = new AbortController();
        requestController = controller;
        activeRequestRef.current = controller;
        const timeoutId = window.setTimeout(() => controller.abort(), 75_000);
        let response: Response;

        try {
          response = await fetch('/api/generate', {
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
              // GPT-5 counts reasoning and visible output against this limit.
              // Give it enough headroom to return a complete sketch response.
              maxTokens: 8192,
            }),
            signal: controller.signal,
          });
        } catch (error) {
          if (controller.signal.aborted) {
            throw new Error('Generation timed out after 75 seconds. Please try again.');
          }
          throw error;
        } finally {
          window.clearTimeout(timeoutId);
        }

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
        if (chatContextVersion !== chatContextVersionRef.current) return;
        const text = data.text ?? '';
        if (!text.trim()) {
          throw new Error('The model completed without visible text. Please try again.');
        }
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
        if (chatContextVersionRef.current !== chatContextVersion) return;
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        if (activeRequestRef.current === requestController) {
          activeRequestRef.current = null;
        }
        setIsLoading(false);
      }
    },
    [providerKey, isLoading, messages, activeProvider, config.systemPrompt, anthropicModel, openaiModel, currentCode, assets]
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
    chatContextVersionRef.current += 1;
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setMessages([]);
    setPreviewError(null);
  }, []);

  const loadSampleSketch = useCallback(() => {
    setCurrentCode(DEFAULT_SKETCH);
    setActiveSketchId(null);
    setSessionCount(prev => prev + 1);
  }, []);

  const handleAddFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const readAsDataUrl = (file: File) =>
      new Promise<UploadedAsset>((resolve, reject) => {
        const finalize = (dataUrl: string, size: number) => {
          resolve({
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            size,
            dataUrl,
            addedAt: Date.now(),
          });
        };

        if (file.type.startsWith('image/')) {
          compressImageFile(file)
            .then(dataUrl => finalize(dataUrl, file.size))
            .catch(() => {
              const reader = new FileReader();
              reader.onload = () => finalize(String(reader.result || ''), file.size);
              reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
              reader.readAsDataURL(file);
            });
          return;
        }

        if ((file.type.startsWith('audio/') || file.type.startsWith('video/')) && file.size > MAX_NON_IMAGE_UPLOAD_BYTES) {
          reject(new Error(`${file.name} is too large. Audio and video uploads must be 100 MB or smaller.`));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => finalize(String(reader.result || ''), file.size);
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
                  includeMl5={effectiveIncludeMl5}
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
                  assets={assets}
                  htmlTemplate={htmlTemplate}
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
