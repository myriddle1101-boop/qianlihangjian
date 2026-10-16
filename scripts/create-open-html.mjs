import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const dist = resolve('dist')
await copyFile(resolve(dist, 'index.html'), resolve(dist, '签里行间.html'))
