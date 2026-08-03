# p5.js AI Studio

An AI wrapper for p5.js and ml5.js. Users can generate sketches with Claude or OpenAI, run them in the browser, edit the code, download a standalone HTML file, and save sketches locally so they can return later.

## Features

- AI-assisted p5.js and ml5.js sketch generation
- Browser-based live preview
- Inline code editing
- Downloadable standalone HTML sketches
- Local sketch persistence in the browser
- Session-only API key storage
- Vercel deployment support

## Supported models

- Claude Sonnet 5
- Claude Haiku 4.5
- GPT-5.4

Model IDs are editable in the Settings panel in case your account uses a different snapshot string.

## Privacy

- API keys are stored only in sessionStorage
- Generated sketches, chat history, and uploads are stored in the browser unless the user clears them
- The backend does not persist requests, but prompts and up to two image thumbnails are sent to the selected AI provider

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Deployment

Deploy to Vercel with the standard Next.js build:

- `npm run build`
- `npm run start`

If you use the Vercel import flow, no backend secrets are required because users provide their own API keys in the app.
