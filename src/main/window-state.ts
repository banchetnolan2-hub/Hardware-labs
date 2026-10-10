import { join } from 'node:path'
import { z } from 'zod'
import { readJsonFile, writeJsonFileAtomic } from './storage/json-file'

const WindowStateSchema = z.object({
  width: z.number().int().min(640).max(10000),
  height: z.number().int().min(400).max(10000),
  x: z.number().int().optional(),
  y: z.number().int().optional(),
  maximized: z.boolean()
})

export type WindowState = z.infer<typeof WindowStateSchema>

export const DEFAULT_WINDOW_STATE: WindowState = { width: 1440, height: 900, maximized: false }

export async function loadWindowState(directory: string): Promise<WindowState> {
  const result = await readJsonFile(join(directory, 'window-state.json'))
  if (result.status !== 'ok') return DEFAULT_WINDOW_STATE
  const parsed = WindowStateSchema.safeParse(result.data)
  return parsed.success ? parsed.data : DEFAULT_WINDOW_STATE
}

export async function saveWindowState(directory: string, state: WindowState): Promise<void> {
  await writeJsonFileAtomic(join(directory, 'window-state.json'), WindowStateSchema.parse(state))
}
