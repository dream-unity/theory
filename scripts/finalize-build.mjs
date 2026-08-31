import { rename } from 'node:fs/promises'

const outputDirectory = new URL('../dist/', import.meta.url)

await rename(new URL('app.html', outputDirectory), new URL('index.html', outputDirectory))
