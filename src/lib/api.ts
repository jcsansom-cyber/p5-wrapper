import type { ProviderMessage } from './types';

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const DEFAULT_ANTHROPIC_FALLBACK_MODEL = 'claude-haiku-4-5';

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
    content: [{ type: 'text', text: message.content }],
  }));
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
        temperature: 0.7,
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
        ...messages,
      ],
      max_tokens: maxTokens,
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
