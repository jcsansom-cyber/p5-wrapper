# p5.js AI Studio

An AI wrapper for p5.js and ml5.js. Users can generate sketches with Claude or OpenAI, run them in the browser, edit the code, download a standalone HTML file, and save sketches locally so they can return later.

## Features

- AI-assisted p5.js and ml5.js sketch generation
- Browser-based live preview
- Inline code editing
- Downloadable standalone HTML sketches
- Local sketch persistence in the browser
- Session-only browser API keys, with optional server-managed keys
- Vercel deployment support

## Supported models

- Claude Sonnet 5
- Claude Haiku 4.5
- GPT-5.4

Model IDs are editable in the Settings panel in case your account uses a different snapshot string.

## Privacy

- API keys entered by a user are stored only in that browser session; server keys are optional deployment fallbacks
- Generated sketches, chat history, and uploads are stored in the browser unless the user clears them
- The backend does not persist requests, but prompts and up to two image thumbnails are sent to the selected AI provider
- Sketches run in a separately hosted preview origin so generated code cannot read the app's browser storage

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` in your browser. The default local preview origin is `http://127.0.0.1:3000`, which is intentionally a different browser origin from `localhost`.

## Deployment

Deploy to Vercel with the standard Next.js build:

- `npm run build`
- `npm run start`

Set `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY` as server environment variables.

Set `NEXT_PUBLIC_PREVIEW_ORIGIN` to a dedicated HTTPS preview subdomain that serves this same deployment, for example `https://preview.example.com`. It must be a different origin from the main app domain; otherwise generated sketches could access the app's browser storage.
