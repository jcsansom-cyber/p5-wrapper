import type { PromptContentPart, ProviderMessage } from './types';

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const DEFAULT_ANTHROPIC_FALLBACK_MODEL = 'claude-opus-5';

async function readErrorMessage(response: Response): Promise<string> {
  const rawText = await response.text().catch(() => '');
  if (!rawText) {
    return `HTTP ${response.status} ${response.statusText}`;
  }

  try {
    const parsed = JSON.parse(rawText) as {
      error?: { message?: string; type?: string };
      message?: string;
      type?: string;
    };
    return parsed.error?.message || parsed.message || rawText;
  } catch {
    return rawText;
  }
}

function isAnthropicModelNotFound(errorText: string, model: string): boolean {
  const lower = errorText.toLowerCase();
  return lower.includes('not_found_error') && lower.includes(model.toLowerCase());
}

function normalizeAnthropicMessages(messages: ProviderMessage[]) {
  return messages.map(message => ({
    role: message.role,
    content: normalizeAnthropicContent(message.content),
  }));
}

function normalizeAnthropicContent(content: ProviderMessage['content']) {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }];
  }

  const normalized: Array<
    | { type: 'text'; text: string }
    | {
        type: 'image';
        source: {
          type: 'base64';
          media_type: string;
          data: string;
        };
      }
  > = [];

  for (const part of content) {
    if (part.type === 'text') {
      normalized.push({ type: 'text', text: part.text });
      continue;
    }

    const [prefix, base64 = ''] = part.dataUrl.split(',');
    const mediaTypeMatch = prefix.match(/^data:([^;]+);base64$/i);
    const mediaType = mediaTypeMatch?.[1] || part.mediaType || 'image/png';

    normalized.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64,
      },
    });
  }

  return normalized;
}

function normalizeOpenAIContent(content: ProviderMessage['content']) {
  if (typeof content === 'string') {
    return content;
  }

  return content.map(part => {
    if (part.type === 'text') {
      return { type: 'text', text: part.text };
    }

    return {
      type: 'image_url',
      image_url: {
        url: part.dataUrl,
      },
    };
  });
}

export async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ProviderMessage[],
  maxTokens = 4096
): Promise<{ text: string; usage?: { inputTokens: number; outputTokens: number } }> {
  async function run(selectedModel: string) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: selectedModel,
        system: systemPrompt,
        messages: normalizeAnthropicMessages(messages),
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await readErrorMessage(response);
      throw new Error(errorText);
    }

    const data: AnthropicResponse = await response.json();
    const text = (data.content ?? [])
      .filter(block => block.type === 'text')
      .map(block => block.text ?? '')
      .join('\n')
      .trim();

    return {
      text,
      usage: {
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
      },
    };
  }

  try {
    return await run(model);
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);
    if (model !== DEFAULT_ANTHROPIC_FALLBACK_MODEL && isAnthropicModelNotFound(errorText, model)) {
      return await run(DEFAULT_ANTHROPIC_FALLBACK_MODEL);
    }

    throw new Error(`Anthropic API error: ${errorText}`);
  }
}

export async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ProviderMessage[],
  maxTokens = 4096
): Promise<{ text: string; usage?: { inputTokens: number; outputTokens: number } }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(message => ({
          role: message.role,
          content: normalizeOpenAIContent(message.content),
        })),
      ],
      // GPT-5-family Chat Completions models reject the legacy max_tokens field.
      max_completion_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await readErrorMessage(response);
    throw new Error(`OpenAI API error: ${errorText}`);
  }

  const data: OpenAIChatResponse = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() ?? '';

  return {
    text,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}
