export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export function buildSystemPrompt(options?: { includeMl5?: boolean; sketchContext?: string }): string {
  const ml5Note = options?.includeMl5
    ? '\\n\\nYou MUST support ml5.js integration. The user may want to use machine learning features like object detection, pose estimation, image classification, skin tone detection, sound classification, or body part tracking. Import ml5 via CDN in the sketch: <script src="https://unpkg.com/ml5@latest/dist/ml5.min.js"></script>'
    : '';

  const contextNote = options?.sketchContext
    ? \\n\\nThe user is currently working on this sketch:\\n\\\p5.js\\n\\n\\\`
    : '';

  return You are a helpful p5.js assistant. You help users create interactive creative coding sketches using p5.js.

Rules:
- Always respond with complete, runnable p5.js code in markdown code blocks labeled "p5js" or "javascript".
- Include all necessary setup() and draw() functions.
- Use the latest p5.js API. Import via CDN: <script src="https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js"></script>
- Keep code clean, well-commented, and beginner-friendly.
- If the user asks for ml5.js features, include the ml5.js CDN import.
- Never ask users to install anything — everything runs in the browser.
- Suggest improvements and alternative approaches when helpful.
- When modifying existing sketches, show the complete updated code, not just diffs.

Current conversation:;
}
