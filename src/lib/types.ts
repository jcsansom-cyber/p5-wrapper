export type Provider = 'anthropic' | 'openai';

export interface AppConfig {
  anthropicKey: string;
  openaiKey: string;
  anthropicModel: string;
  openaiModel: string;
  systemPrompt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ProviderMessage {
  role: 'user' | 'assistant';
  content: ProviderMessageContent;
}

export interface PromptTextPart {
  type: 'text';
  text: string;
}

export interface PromptImagePart {
  type: 'image';
  mediaType: string;
  dataUrl: string;
}

export type PromptContentPart = PromptTextPart | PromptImagePart;

export type ProviderMessageContent = string | PromptContentPart[];

export interface GenerateRequestBody {
  provider: Provider;
  apiKey: string;
  model: string;
  messages: ProviderMessage[];
  systemPrompt: string;
  maxTokens?: number;
}

export interface UploadedAsset {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  addedAt: number;
}

export interface SavedSketch {
  id: string;
  name: string;
  code: string;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Permissions-Policy" content="camera=(self), microphone=(self), autoplay=(self), fullscreen=(self)">
  <title>p5.js Sketch</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/addons/p5.dom.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/addons/p5.sound.min.js"></script>
  <script src="https://unpkg.com/ml5@1/dist/ml5.min.js"></script>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #ffffff;
    }
    canvas {
      display: block;
    }
  </style>
</head>
<body>
{{ASSET_SCRIPT_TAG}}
  <script id="p5-source">
{{SKETCH_SOURCE}}
  </script>
{{RUNTIME_SCRIPT}}
</body>
</html>`;

export const DEFAULT_SYSTEM_PROMPT = `You are a helpful p5.js assistant.

You create complete, runnable sketches for the browser.

Rules:
- Return complete code in a single markdown code block labeled \`javascript\` or \`p5js\`.
- Include the full sketch, including \`setup()\` and \`draw()\` when appropriate.
- Write code that runs directly in the browser with p5.js.
- If the user asks for ml5.js features, include the ml5.js CDN script and use it correctly.
- For live webcam tracking models such as FaceMesh, BodyPose, and HandPose, use the exact p5 editor pattern: create the model in \`preload()\` when appropriate, create the webcam with \`createCapture(VIDEO)\` in \`setup()\`, hide the video element, and call \`detectStart(video, callback)\` in the p5.js 1.x style.
- For FaceMesh, mirror the p5 editor example exactly: \`faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true })\` in \`preload()\`, \`video = createCapture(VIDEO, { flipped: true })\` or \`video = createCapture(VIDEO)\` plus canvas mirroring, then \`faceMesh.detectStart(video, gotFaces)\` in \`setup()\`.
- For BodyPose, mirror the p5 editor example exactly: \`bodyPose = ml5.bodyPose()\` in \`preload()\`, \`video = createCapture(VIDEO)\`, then \`bodyPose.detectStart(video, gotPoses)\` in \`setup()\`.
- For HandPose, mirror the p5 editor example exactly: \`handPose = ml5.handPose()\` in \`preload()\`, \`video = createCapture(VIDEO)\`, then \`handPose.detectStart(video, gotHands)\` in \`setup()\`.
- Never use \`ml5.handPose({ flipped: true })\`, \`ml5.bodyPose("...")\`, or any older async constructor pattern for these webcam trackers.
- Do not use the older async constructor pattern in this app; the runtime is p5.js 1.x style, so stick to preload/setup plus detectStart.
- When a sketch needs webcam input, request it immediately by creating the capture in setup and hiding it. Do not wait for a button click or a separate loading callback.
- If the sketch uses image classification or Teachable Machine, use the appropriate ml5 classifier API and keep the model and sketch logic separated.
- If the user uploaded an image and wants it used in the sketch, load it from the local asset registry with \`p5AssetURL("exact-file-name")\` and \`loadImage(...)\`. Do not invent remote URLs like Wikimedia, Unsplash, or placeholder image links.
- Do not use the old ml5.faceApi API.
- If the sketch needs the camera, make it interactive and explain that it requires HTTPS or localhost.
- If the sketch needs extra script tags, iframe permissions, or other wrapper changes, return a full HTML document in a fenced \`html\` code block as well as any sketch code.
- Treat the wrapper HTML and sketch JavaScript as separate files, like p5's index.html and sketch.js.
- If you return HTML, keep the runnable sketch code in a separate fenced \`javascript\` block or in the \`<script id="p5-source">\` tag so the app can split the files cleanly.
- Do not merge wrapper HTML and sketch JavaScript into one unlabeled block.
- Prefer clean, beginner-friendly code with light comments.
- When modifying existing sketches, return the full updated sketch instead of a diff.
- Do not tell the user to install packages locally; everything runs in the browser.
- If the request is ambiguous, make the smallest useful assumption and keep the sketch interactive.
`;

export const DEFAULT_CONFIG: AppConfig = {
  anthropicKey: '',
  openaiKey: '',
  anthropicModel: 'claude-opus-5',
  openaiModel: 'gpt-5.6-terra',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

export const ANTHROPIC_MODEL_OPTIONS = [
  { value: 'claude-opus-5', label: 'Claude Opus 5' },
] as const;

export const OPENAI_MODEL_OPTIONS = [
  { value: 'gpt-5.6-sol', label: 'GPT-5.6 Sol' },
  { value: 'gpt-5.6-terra', label: 'GPT-5.6 Terra' },
  { value: 'gpt-5.6-luna', label: 'GPT-5.6 Luna' },
] as const;

export function normalizeAnthropicModel(model: string | undefined | null): string {
  const trimmed = (model ?? '').trim();
  return trimmed || DEFAULT_CONFIG.anthropicModel;
}

export const DEFAULT_SKETCH = `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(255);

  noStroke();
  fill(92, 141, 249);
  circle(mouseX, mouseY, 48);

  fill(232);
  textAlign(CENTER, CENTER);
  textSize(16);
  text('Move your mouse!', width / 2, 32);
}`;

export function extractCodeBlock(text: string): string {
  const fenced = extractFencedBlock(text, ['p5js', 'javascript', 'js']);
  if (looksLikeSketchCode(fenced)) return fenced;

  const unlabeled = extractFencedBlock(text, []);
  if (looksLikeSketchCode(unlabeled)) return unlabeled;

  const trimmed = text.trim();
  if (looksLikeSketchCode(trimmed)) return trimmed;

  return '';
}

export function extractHtmlTemplate(text: string): string {
  const labeled = extractFencedBlock(text, ['html']);
  if (looksLikeHtmlTemplate(labeled)) return labeled;

  const unlabeled = extractFencedBlock(text, []);
  if (looksLikeHtmlTemplate(unlabeled)) return unlabeled;

  const trimmed = text.trim();
  return looksLikeHtmlTemplate(trimmed) ? trimmed : '';
}

export function usesMl5Features(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('ml5.') ||
    normalized.includes('facemesh') ||
    normalized.includes('bodypose') ||
    normalized.includes('handpose') ||
    normalized.includes('imageclassifier') ||
    normalized.includes('soundclassifier') ||
    normalized.includes('teachable machine') ||
    normalized.includes('mobilenet')
  );
}

export function extractFencedBlock(text: string, languages: string[]): string {
  const fencedBlockRegex = /```([^\n`]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = fencedBlockRegex.exec(text)) !== null) {
    const label = match[1].trim().toLowerCase();
    const body = match[2].trim();

    const normalizedLabel = label.split(/\s+/)[0];
    if (!normalizedLabel) {
      if (languages.length === 0) return body;
      continue;
    }

    if (languages.some(language => language.toLowerCase() === normalizedLabel)) {
      return body;
    }
  }

  return '';
}

function looksLikeSketchCode(candidate: string): boolean {
  if (!candidate) return false;

  const normalized = candidate.toLowerCase();
  return (
    /function\s+setup\s*\(/.test(normalized) ||
    /function\s+draw\s*\(/.test(normalized) ||
    /createcanvas\s*\(/.test(normalized) ||
    /createcapture\s*\(/.test(normalized) ||
    /new\s+ml5\./.test(normalized) ||
    /ml5\./.test(normalized) ||
    /setup\(\)\s*\{/.test(normalized)
  );
}

function looksLikeHtmlTemplate(candidate: string): boolean {
  if (!candidate) return false;

  const normalized = candidate.toLowerCase();
  return (
    normalized.includes('<!doctype html') ||
    normalized.includes('<html') ||
    normalized.includes('<head') ||
    normalized.includes('<body') ||
    normalized.includes('<script id="p5-source"') ||
    normalized.includes('{{sketch_source}}')
  );
}


export function buildSystemPrompt(options?: { includeMl5?: boolean; sketchContext?: string }): string {
  const ml5Note = options?.includeMl5
    ? `\n- Include ml5.js when the sketch needs machine learning features.\n- Use this CDN script when needed: <script src="https://unpkg.com/ml5@1/dist/ml5.min.js"></script>\n- For webcam models such as FaceMesh, BodyPose, and HandPose, use createCapture(VIDEO), hide the video element, and call detectStart(video, callback).\n- For FaceMesh, initialize with \`faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true })\` in \`preload()\`, create the webcam with \`video = createCapture(VIDEO, { flipped: true })\` or \`video = createCapture(VIDEO)\` plus canvas mirroring, hide it, and call \`faceMesh.detectStart(video, gotFaces)\` in \`setup()\`.\n- For BodyPose, initialize with \`bodyPose = ml5.bodyPose()\` in \`preload()\`, create the webcam with \`video = createCapture(VIDEO)\`, hide it, and call \`bodyPose.detectStart(video, gotPoses)\` in \`setup()\`.\n- For HandPose, initialize with \`handPose = ml5.handPose()\` in \`preload()\`, create the webcam with \`video = createCapture(VIDEO)\`, hide it, and call \`handPose.detectStart(video, gotHands)\` in \`setup()\`.\n- For image classification or Teachable Machine, choose the matching classifier API and keep the model and sketch logic separate from the HTML wrapper.`
    : '';

  const sketchContext = options?.sketchContext?.trim()
    ? `\n\nCurrent sketch context:\n\`\`\`javascript\n${options.sketchContext.trim()}\n\`\`\``
    : '';

  return `${DEFAULT_SYSTEM_PROMPT.trim()}${ml5Note}${sketchContext}`;
}

export function buildAssetContext(assets: UploadedAsset[]): string {
  if (!assets.length) return '';

  const lines = assets
    .map(asset => `- ${asset.name} (${asset.type || 'unknown type'})`)
    .join('\n');

  const imageAssets = assets.filter(asset => asset.type.startsWith('image/'));
  const hasLocalOnlyMedia = assets.some(asset => asset.type.startsWith('audio/') || asset.type.startsWith('video/'));
  const imageNames = imageAssets.map(asset => `- ${asset.name}`).join('\n');
  const mostRecentImage = imageAssets.slice().sort((a, b) => b.addedAt - a.addedAt)[0];

  return `\n\nUploaded assets available to the sketch:\n${lines}\n\nExact image filenames available:\n${imageNames || '- None'}\n\nUse \`p5AssetURL("exact-file-name")\` to load an uploaded asset by exact name. Example: \`loadImage(p5AssetURL("image.png"))\` or \`loadSound(p5AssetURL("music.mp3"))\`. Do not invent filenames or ask the user to rename files. If the user asks you to use an uploaded image, prefer the most recent uploaded image asset${mostRecentImage ? `: \`${mostRecentImage.name}\`` : ''}. If you reference an uploaded image in code, load it with \`loadImage(p5AssetURL("the-exact-name"))\` rather than a remote URL. Never substitute an internet image URL for an uploaded file. Text files, JSON, and other assets are also available as data URLs.${imageAssets.length ? '\nIf the user uploaded a photo or image, inspect it directly and use it as visual context for the request.' : ''}${hasLocalOnlyMedia ? '\nAudio and video uploads stay local to the browser and are not attached to the AI request as media input.' : ''}`;
}

export function buildAssetRegistryScript(assets: UploadedAsset[]): string {
  const registry = Object.fromEntries(
    assets.map(asset => [
      asset.name,
      {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        size: asset.size,
        dataUrl: asset.dataUrl,
      },
    ])
  );

  return `
    window.__P5_ASSETS__ = ${JSON.stringify(registry)};
    window.p5Assets = window.__P5_ASSETS__;
    window.p5AssetURL = function(name) {
      return window.__P5_ASSETS__ && window.__P5_ASSETS__[name] ? window.__P5_ASSETS__[name].dataUrl : '';
    };
    window.p5AssetNames = function() {
      return Object.keys(window.__P5_ASSETS__ || {});
    };
  `;
}

export function buildHtmlFromTemplate(
  template: string,
  options: { sketchSource: string; assets: UploadedAsset[]; includeMl5?: boolean }
): string {
  const assetScript = buildAssetRegistryScript(options.assets);
  const ml5ScriptTag = '<script src="https://unpkg.com/ml5@1/dist/ml5.min.js"></script>';
  const injectMl5Script = (html: string): string => {
    if (options.includeMl5 === false) {
      return html.replaceAll(ml5ScriptTag, '');
    }

    if (html.includes(ml5ScriptTag)) {
      return html;
    }

    if (html.includes('</head>')) {
      return html.replace('</head>', `  ${ml5ScriptTag}\n</head>`);
    }

    return `${ml5ScriptTag}\n${html}`;
  };
  const runtimeScript = `<script>
    const sketch = document.getElementById('p5-source')?.textContent || '';
    const sketchLower = sketch.toLowerCase();
    const errorBox = document.createElement('pre');
    errorBox.id = 'p5-error';
    errorBox.style.cssText = 'display:none;position:fixed;left:12px;right:12px;bottom:12px;padding:12px;border-radius:8px;background:rgba(248,113,113,0.12);color:#fda4af;font-family:monospace;font-size:12px;white-space:pre-wrap;border:1px solid rgba(248,113,113,0.24);z-index:9999;';
    document.body.appendChild(errorBox);

    function reportError(message) {
      errorBox.textContent = message;
      errorBox.style.display = 'block';
      window.parent?.postMessage({ type: 'p5-error', message }, '*');
    }

    window.addEventListener('error', function(event) {
      reportError(event.message || 'Unknown preview error');
    });

    window.addEventListener('unhandledrejection', function(event) {
      const reason = event.reason && event.reason.message ? event.reason.message : String(event.reason || 'Unknown promise rejection');
      reportError(reason);
    });

    window.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        window.parent?.postMessage({ type: 'p5-exit-fullscreen' }, '*');
      }
    });

    const needsWebcamBootstrap =
      /facemesh|bodypose|handpose/.test(sketchLower) && !/createcapture\s*\(/.test(sketchLower);

    if (needsWebcamBootstrap) {
      try {
        const bootstrapVideo = createCapture(VIDEO);
        bootstrapVideo.hide();
        window.__P5_BOOTSTRAP_VIDEO__ = bootstrapVideo;
      } catch (error) {
        reportError(error && error.message ? error.message : String(error));
      }
    }

    try {
      window.eval(sketch);
      window.parent?.postMessage({ type: 'p5-ready' }, '*');
    } catch (error) {
      reportError(error && error.message ? error.message : String(error));
    }
  </script>`;
  return injectMl5Script(template)
    .replaceAll('{{ASSET_SCRIPT_TAG}}', `<script>${assetScript.trim()}</script>`)
    .replaceAll('{{ASSET_SCRIPT}}', assetScript.trim())
    .replaceAll('{{SKETCH_SOURCE}}', options.sketchSource)
    .replaceAll('{{RUNTIME_SCRIPT}}', runtimeScript);
}
