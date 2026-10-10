import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'

export type JsonReadResult =
  | { status: 'missing' }
  | { status: 'ok'; data: unknown }
  | { status: 'corrupt'; backupPath: string | null; error: string }

/**
 * Lit un fichier JSON. Un fichier illisible est mis de côté (`*.corrupt-<horodatage>.json`)
 * afin de ne jamais être écrasé silencieusement : le joueur ou le support peut le récupérer.
 */
export async function readJsonFile(path: string): Promise<JsonReadResult> {
  let text: string
  try {
    text = await fs.readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { status: 'missing' }
    throw error
  }
  try {
    return { status: 'ok', data: JSON.parse(text) as unknown }
  } catch (error) {
    const backupPath = `${path}.corrupt-${Date.now()}.json`
    try {
      await fs.rename(path, backupPath)
      return { status: 'corrupt', backupPath, error: String(error) }
    } catch {
      return { status: 'corrupt', backupPath: null, error: String(error) }
    }
  }
}

/**
 * Écriture atomique : le contenu est écrit dans un fichier temporaire puis renommé,
 * pour qu'une coupure en cours d'écriture ne laisse jamais un fichier tronqué.
 */
export async function writeJsonFileAtomic(path: string, data: unknown): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  await fs.rename(tmp, path)
}
