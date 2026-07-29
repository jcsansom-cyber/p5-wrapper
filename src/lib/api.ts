// Extract code block from markdown response text
export function extractCode(text: string): string {
  // Try to find p5js or javascript code block
  const p5Regex = /`(?:p5js|javascript)\s*([\s\S]*?)`/;
  const jsMatch = text.match(p5Regex);
  if (jsMatch) return jsMatch[1].trim();

  // Try to find any code block
  const codeRegex = /`([\s\S]*?)`/;
  const codeMatch = text.match(codeRegex);
  if (codeMatch) return codeMatch[1].trim();

  // Return trimmed response if no code block found
  return text.trim();
}

// Anthropic messages format
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{ text: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

// OpenAI response format
interface OpenAIResponse {
  choices: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: AnthropicMessage[],
  maxTokens = 4096
): Promise<{ text: string; usage?: { inputTokens: number; outputTokens: number } }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      system: systemPrompt,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error (): ${error}`);
  }

  const data: AnthropicResponse = await response.json();
  const contentBlock = data.content?.[0]?.text || '';

  return {
    text: contentBlock,
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
  };
}

export async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens = 4096
): Promise<{ text: string; usage?: { inputTokens: number; outputTokens: number } }> {
  const allMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages,
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.4-nano',
      messages: allMessages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error (): ${error}`);
  }

  const data: OpenAIResponse = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  return {
    text,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
  };
}
