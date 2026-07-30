import type { SavedSketch } from './types';

const STORAGE_KEY = 'p5-ai-sketch-library';

function readStorage(): SavedSketch[] {
  if (typeof window === 'undefined') return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as SavedSketch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(sketches: SavedSketch[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sketches));
}

export function loadSketches(): SavedSketch[] {
  return readStorage();
}

export function saveSketches(sketches: SavedSketch[]): void {
  writeStorage(sketches);
}

export function upsertSketch(input: { id?: string; name?: string; code: string; existing?: SavedSketch[] }): SavedSketch[] {
  const sketches = input.existing ? [...input.existing] : readStorage();
  const now = Date.now();
  const normalizedName = (input.name || `Sketch ${new Date(now).toLocaleString()}`).trim();

  if (input.id) {
    const index = sketches.findIndex(sketch => sketch.id === input.id);
    if (index >= 0) {
      sketches[index] = {
        ...sketches[index],
        name: normalizedName || sketches[index].name,
        code: input.code,
        updatedAt: now,
      };
    } else {
      sketches.unshift({
        id: input.id,
        name: normalizedName,
        code: input.code,
        createdAt: now,
        updatedAt: now,
      });
    }
  } else {
    sketches.unshift({
      id: crypto.randomUUID(),
      name: normalizedName,
      code: input.code,
      createdAt: now,
      updatedAt: now,
    });
  }

  writeStorage(sketches);
  return sketches;
}

export function removeSketch(id: string, existing?: SavedSketch[]): SavedSketch[] {
  const sketches = existing ? [...existing] : readStorage();
  const next = sketches.filter(sketch => sketch.id !== id);
  writeStorage(next);
  return next;
}

