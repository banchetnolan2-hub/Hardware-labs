/** État du système de mise à jour, diffusé du processus principal vers l'interface. */
export type UpdateStatus =
  | { state: 'unsupported'; reason: 'development' }
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'not-available'; checkedAt: number }
  | { state: 'available'; version: string; releaseDate?: string }
  | { state: 'downloading'; version: string; percent: number; transferred: number; total: number; bytesPerSecond: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; kind: 'network' | 'unavailable' | 'other'; message: string }

/** Classe une erreur d'electron-updater pour afficher un message compréhensible. */
export function classifyUpdateError(error: unknown): Extract<UpdateStatus, { state: 'error' }> {
  const message = error instanceof Error ? error.message : String(error)
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ERR_INTERNET_DISCONNECTED|ERR_NETWORK|ERR_NAME_NOT_RESOLVED|net::/i.test(message)) {
    return { state: 'error', kind: 'network', message }
  }
  if (/\b404\b|No published versions|Cannot find latest|latest\.yml/i.test(message)) {
    return { state: 'error', kind: 'unavailable', message }
  }
  return { state: 'error', kind: 'other', message }
}
