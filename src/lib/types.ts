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

export const MONA_LISA_STARTER_SKETCH = `let video;
let faceMesh;
let faces = [];

function preload() {
  faceMesh = ml5.faceMesh({ detectionConfidence: 0.85 });
}

function setup() {
  createCanvas(900, 900);
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  faceMesh.detectStart(video, gotFaces);
}

function gotFaces(results) {
  faces = results || [];
}

function draw() {
  background(232, 214, 190);

  drawPortrait();

  const gaze = getGazeVector();
  drawEyes(gaze.x, gaze.y);

  fill(80, 50, 30);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(14);
  text(faces.length > 0 ? 'Webcam face detected' : 'Allow webcam access to animate the eyes', width / 2, height - 34);
}

function drawPortrait() {
  noStroke();

  fill(78, 54, 34);
  rect(0, 0, width, 130);

  fill(74, 58, 42);
  beginShape();
  vertex(200, 120);
  bezierVertex(140, 220, 120, 420, 170, 600);
  bezierVertex(220, 760, 360, 850, 450, 850);
  bezierVertex(540, 850, 680, 760, 730, 600);
  bezierVertex(780, 420, 760, 220, 700, 120);
  endShape(CLOSE);

  fill(221, 194, 162);
  ellipse(450, 430, 420, 560);

  fill(180, 124, 93);
  arc(450, 330, 320, 180, PI, TWO_PI);
  rect(290, 300, 320, 40, 20);

  fill(188, 145, 103);
  ellipse(450, 540, 220, 300);

  fill(88, 62, 42);
  rect(265, 620, 370, 130, 40);

  fill(116, 78, 44);
  beginShape();
  vertex(180, 760);
  bezierVertex(280, 680, 620, 680, 720, 760);
  vertex(720, 900);
  vertex(180, 900);
  endShape(CLOSE);
}

function drawEyes(offsetX, offsetY) {
  const leftEye = { x: 390, y: 395 };
  const rightEye = { x: 510, y: 395 };
  const pupilSize = 20;
  const maxOffset = 14;
  const px = constrain(offsetX, -maxOffset, maxOffset);
  const py = constrain(offsetY, -maxOffset, maxOffset);

  fill(250);
  ellipse(leftEye.x, leftEye.y, 72, 36);
  ellipse(rightEye.x, rightEye.y, 72, 36);

  fill(60, 40, 28);
  ellipse(leftEye.x + px, leftEye.y + py, pupilSize, pupilSize);
  ellipse(rightEye.x + px, rightEye.y + py, pupilSize, pupilSize);

  fill(40, 26, 18);
  ellipse(leftEye.x + px + 3, leftEye.y + py - 3, 6, 6);
  ellipse(rightEye.x + px + 3, rightEye.y + py - 3, 6, 6);

  stroke(110, 72, 50);
  strokeWeight(3);
  noFill();
  arc(leftEye.x, leftEye.y - 2, 80, 50, PI + 0.15, TWO_PI - 0.2);
  arc(rightEye.x, rightEye.y - 2, 80, 50, PI + 0.15, TWO_PI - 0.2);
}

function getGazeVector() {
  if (!faces.length || !faces[0]?.keypoints?.length) {
    return {
      x: map(mouseX, 0, width, -12, 12),
      y: map(mouseY, 0, height, -8, 8),
    };
  }

  const keypoints = faces[0].keypoints;
  const center = keypoints.reduce(
    (acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      return acc;
    },
    { x: 0, y: 0 }
  );

  center.x /= keypoints.length;
  center.y /= keypoints.length;

  return {
    x: map(center.x, 0, video.width || width, -16, 16),
    y: map(center.y, 0, video.height || height, -10, 10),
  };
}`;

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

  return `\n\nUploaded assets available to the sketch:\n${lines}\n\nUse p5AssetURL("filename") to load an uploaded asset by name. For example: loadImage(p5AssetURL("image.png")) or loadSound(p5AssetURL("music.mp3")).`;
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
