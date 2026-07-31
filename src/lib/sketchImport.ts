function decodeJsonString(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function extractFromWindowSource(text: string): string | null {
  const match = text.match(/window\.__P5_SOURCE__\s*=\s*([\s\S]*?);(?:\s*window\.|\s*try\b|\s*$)/);
  if (!match?.[1]) return null;
  return decodeJsonString(match[1].trim());
}

function extractFromLegacySketchConst(text: string): string | null {
  const match = text.match(/const\s+sketch\s*=\s*([\s\S]*?);(?:\s*try\b|\s*$)/);
  if (!match?.[1]) return null;
  return decodeJsonString(match[1].trim());
}

function extractFromScriptTag(text: string): string | null {
  const match = text.match(/<script[^>]*id=["']p5-source["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]) return null;
  return match[1].trim();
}

function looksLikeSketchCode(candidate: string): boolean {
  if (!candidate) return false;

  const normalized = candidate.toLowerCase();
  return (
    /function\s+setup\s*\(/.test(normalized) ||
    /function\s+draw\s*\(/.test(normalized) ||
    /createcanvas\s*\(/.test(normalized) ||
    /createcapture\s*\(/.test(normalized) ||
    /ml5\./.test(normalized) ||
    /setup\(\)\s*\{/.test(normalized)
  );
}

export function extractSketchFromImportedText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const windowSource = extractFromWindowSource(trimmed);
  if (windowSource) return windowSource.trim();

  const legacyConst = extractFromLegacySketchConst(trimmed);
  if (legacyConst) return legacyConst.trim();

  const scriptTag = extractFromScriptTag(trimmed);
  if (scriptTag) return scriptTag.trim();

  if (looksLikeSketchCode(trimmed)) {
    return trimmed;
  }

  return '';
}
