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
  content: string;
}

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
      background: #0f0f14;
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
- For live webcam tracking models such as FaceMesh, BodyPose, and HandPose, use createCapture(VIDEO), hide the video element, and call detectStart(video, callback) in the p5.js 1.x style.
- If the sketch uses image classification or Teachable Machine, use the appropriate ml5 classifier API and keep the model and sketch logic separated.
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
  anthropicModel: 'claude-haiku-4-5',
  openaiModel: 'gpt-4.1-nano-2025-04-14',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

export const ANTHROPIC_MODEL_OPTIONS = [
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
] as const;

export const OPENAI_MODEL_OPTIONS = [
  { value: 'gpt-4.1-nano-2025-04-14', label: 'GPT-4.1 nano' },
  { value: 'gpt-4.1-mini-2025-04-14', label: 'GPT-4.1 mini' },
] as const;

export function normalizeAnthropicModel(model: string | undefined | null): string {
  const trimmed = (model ?? '').trim();
  return trimmed || DEFAULT_CONFIG.anthropicModel;
}

export const DEFAULT_SKETCH = `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(18, 18, 24);

  noStroke();
  fill(92, 141, 249);
  circle(mouseX, mouseY, 48);

  fill(232);
  textAlign(CENTER, CENTER);
  textSize(16);
  text('Move your mouse!', width / 2, 32);
}`;

export function extractCodeBlock(text: string): string {
  return extractFencedBlock(text, ['p5js', 'javascript', 'js']) || text.trim();
}

export function extractHtmlTemplate(text: string): string {
  const candidate = extractFencedBlock(text, ['html']) || text.trim();

  if (!candidate) return '';

  const normalized = candidate.toLowerCase();
  const looksLikeHtml =
    normalized.includes('<!doctype html') ||
    normalized.includes('<html') ||
    normalized.includes('<head') ||
    normalized.includes('<body');

  return looksLikeHtml ? candidate : '';
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


export function buildSystemPrompt(options?: { includeMl5?: boolean; sketchContext?: string }): string {
  const ml5Note = options?.includeMl5
    ? `\n- Include ml5.js when the sketch needs machine learning features.\n- Use this CDN script when needed: <script src="https://unpkg.com/ml5@1/dist/ml5.min.js"></script>\n- For webcam models such as FaceMesh, BodyPose, and HandPose, use createCapture(VIDEO), hide the video element, and call detectStart(video, callback).\n- For image classification or Teachable Machine, choose the matching classifier API and keep the sketch logic separate from the HTML wrapper.`
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

  return `\n\nUploaded assets available to the sketch:\n${lines}\n\nUse p5AssetURL("filename") to load an uploaded asset by name. For example: loadImage(p5AssetURL("image.png")) or loadSound(p5AssetURL("music.mp3")). Text files, JSON, and other assets are also available as data URLs.`;
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
  const runtimeScript = `<script>
    const sketch = document.getElementById('p5-source')?.textContent || '';
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

    try {
      window.eval(sketch);
      window.parent?.postMessage({ type: 'p5-ready' }, '*');
    } catch (error) {
      reportError(error && error.message ? error.message : String(error));
    }
  </script>`;
  return template
    .replaceAll(ml5ScriptTag, options.includeMl5 === false ? '' : ml5ScriptTag)
    .replaceAll('{{ASSET_SCRIPT_TAG}}', `<script>${assetScript.trim()}</script>`)
    .replaceAll('{{ASSET_SCRIPT}}', assetScript.trim())
    .replaceAll('{{SKETCH_SOURCE}}', options.sketchSource)
    .replaceAll('{{RUNTIME_SCRIPT}}', runtimeScript);
}
