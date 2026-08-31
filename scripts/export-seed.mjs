import { writeFile } from 'node:fs/promises'
import { SEED_DOCUMENT } from '../src/seed.ts'

await writeFile(
  new URL('../public/data/theory.json', import.meta.url),
  `${JSON.stringify(SEED_DOCUMENT, null, 2)}\n`,
  'utf8',
)
