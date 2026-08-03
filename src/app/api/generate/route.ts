import { callAnthropic, callOpenAI } from '../../../lib/api';
import type { GenerateRequestBody } from '../../../lib/types';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<GenerateRequestBody>;
    const provider = body.provider;
    const browserApiKey = body.apiKey?.trim();
    const model = body.model?.trim();
    const messages = body.messages;
    const systemPrompt = body.systemPrompt?.trim();
    const maxTokens = body.maxTokens ?? 4096;

    if (!provider || !model || !systemPrompt || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = browserApiKey || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY);
    if (!apiKey) {
      return Response.json({ error: `The ${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key is not configured on this server.` }, { status: 503 });
    }

    const result =
      provider === 'anthropic'
        ? await callAnthropic(apiKey, model, systemPrompt, messages, maxTokens)
        : provider === 'openai'
          ? await callOpenAI(apiKey, model, systemPrompt, messages, maxTokens)
          : null;

    if (!result) {
      return Response.json({ error: 'Invalid provider' }, { status: 400 });
    }

    return Response.json({
      success: true,
      text: result.text,
      usage: result.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate code';
    console.error('API generation error:', message);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
