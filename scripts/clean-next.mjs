import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

try {
  rmSync(resolve('.next'), { recursive: true, force: true });
} catch {
  // Ignore cleanup failures; Next can still try to start.
}

