import { mkdtemp, readdir, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { acceptContract, buyAndInstall, newCareer } from '@career/career'
import { TUTORIAL_CONTRACT } from '@career/contracts'
import { CareerStore, parseCareer } from './career-store'

let dir: string
const NOW = new Date('2026-10-10T10:00:00Z')

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'hardware-lab-career-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

function playedCareer() {
  const accepted = acceptContract(newCareer(99, NOW), TUTORIAL_CONTRACT.id, NOW)
  if (!accepted.ok) throw new Error()
  const bought = buyAndInstall(accepted.career, 'gpu', 'gpu-nebula-rx-6600', NOW)
  if (!bought.ok) throw new Error()
  return bought.career
}

describe('sauvegarde de carrière', () => {
  it('ne trouve rien au premier lancement', async () => {
    expect(await new CareerStore(dir).load()).toEqual({ status: 'none' })
  })

  it('restaure exactement la partie après redémarrage (argent, contrat, achats)', async () => {
    const career = playedCareer()
    await new CareerStore(dir).save(career)
    const loaded = await new CareerStore(dir).load()
    expect(loaded.status).toBe('ok')
    if (loaded.status === 'none') return
    expect(loaded.career).toEqual(career)
    expect(loaded.career.money).toBe(1000 - 209)
    expect(loaded.career.active!.build.gpu).toBe('gpu-nebula-rx-6600')
  })

  it('refuse d’écrire une sauvegarde invalide', async () => {
    const store = new CareerStore(dir)
    expect(() => store.save({ ...playedCareer(), money: 'beaucoup' })).toThrow()
    expect(() => store.save({ ...playedCareer(), reputation: 500 })).toThrow()
    expect(await store.load()).toEqual({ status: 'none' })
  })

  it('restaure la copie de secours si le fichier principal est corrompu', async () => {
    const store = new CareerStore(dir)
    const first = playedCareer()
    await store.save(first)
    await store.save({ ...first, money: 500 })
    await writeFile(store.path, '{ "corrompu', 'utf8')
    const loaded = await new CareerStore(dir).load()
    expect(loaded.status).toBe('recovered')
    if (loaded.status === 'none') return
    expect(loaded.career.money).toBe(first.money)
  })

  it('met de côté une sauvegarde au contenu invalide', async () => {
    await mkdir(join(dir, 'saves'), { recursive: true })
    await writeFile(join(dir, 'saves', 'career.json'), JSON.stringify({ schemaVersion: 1, money: -5 }), 'utf8')
    expect(await new CareerStore(dir).load()).toEqual({ status: 'none' })
    expect((await readdir(join(dir, 'saves'))).some((name) => name.includes('.invalid-'))).toBe(true)
  })

  it('archive l’ancienne carrière au lieu de la supprimer', async () => {
    const store = new CareerStore(dir)
    await store.save(playedCareer())
    await store.archive()
    expect(await store.load()).toEqual({ status: 'none' })
    const files = await readdir(join(dir, 'saves'))
    const archive = files.find((name) => name.startsWith('career.archive-'))!
    expect(parseCareer(JSON.parse(await readFile(join(dir, 'saves', archive), 'utf8')))).not.toBeNull()
  })

  it('refuse une version de format inconnue', () => {
    expect(parseCareer({ ...playedCareer(), schemaVersion: 99 })).toBeNull()
    expect(parseCareer(null)).toBeNull()
  })
})
