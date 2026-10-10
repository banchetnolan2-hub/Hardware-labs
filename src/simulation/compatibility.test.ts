import { describe, expect, it } from 'vitest'
import { checkCompatibility } from './compatibility'
import { resolveBuild } from './simulate'
import { GAMING_BUILD, HIGH_END_BUILD } from './test-builds'
import { EMPTY_BUILD, HEALTHY, type BuildIds } from './types'

const codes = (ids: BuildIds) => checkCompatibility(resolveBuild(ids)).issues.map((issue) => issue.code)
const status = (ids: BuildIds) => checkCompatibility(resolveBuild(ids)).status

describe('moteur de compatibilité', () => {
  it('valide des configurations correctes', () => {
    expect(status(GAMING_BUILD)).toBe('compatible')
    expect(status(HIGH_END_BUILD)).toBe('compatible')
  })

  it('signale chaque composant manquant', () => {
    const report = checkCompatibility(resolveBuild(EMPTY_BUILD))
    expect(report.status).toBe('incompatible')
    expect(report.issues.filter((issue) => issue.code === 'missing')).toHaveLength(7)
  })

  it('refuse un socket différent', () => {
    expect(codes({ ...GAMING_BUILD, motherboard: 'mb-forge-h610m' })).toContain('socket')
  })

  it('refuse une mémoire du mauvais type', () => {
    expect(codes({ ...GAMING_BUILD, ram: 'ram-kinetik-16-ddr5' })).toContain('memory-type')
  })

  it('accepte de la mémoire trop rapide avec un avertissement', () => {
    const ids = { ...GAMING_BUILD, ram: 'ram-kinetik-32-ddr4' }
    expect(codes(ids)).toEqual(['memory-speed'])
    expect(status(ids)).toBe('conditional')
  })

  it('refuse une carte mère trop grande pour le boîtier', () => {
    expect(codes({ ...GAMING_BUILD, motherboard: 'mb-strata-b550' })).toContain('form-factor')
  })

  it('refuse une carte graphique trop longue', () => {
    expect(codes({ ...GAMING_BUILD, gpu: 'gpu-vektor-rtx-4070', psu: 'psu-voltis-650g' })).toContain('gpu-length')
  })

  it('refuse un ventirad trop haut et un radiateur sans emplacement', () => {
    const mini = { ...HIGH_END_BUILD, motherboard: 'mb-strata-x670i', case: 'case-monolith-mini', psu: 'psu-voltis-sfx-600g', gpu: 'gpu-nebula-rx-6600' }
    expect(codes({ ...mini, cooler: 'cool-glacier-t120' })).toContain('cooler-height')
    expect(codes({ ...mini, cooler: 'cool-frostline-aio360' })).toContain('radiator')
  })

  it('refuse une alimentation ATX dans un boîtier SFX', () => {
    const ids = { ...HIGH_END_BUILD, motherboard: 'mb-strata-x670i', case: 'case-monolith-mini', cooler: 'cool-glacier-lp47', gpu: 'gpu-nebula-rx-6600' }
    expect(codes(ids)).toContain('psu-form-factor')
  })

  it('refuse une alimentation sans assez de connecteurs PCIe', () => {
    expect(codes({ ...GAMING_BUILD, psu: 'psu-voltis-450b', gpu: 'gpu-nebula-rx-7700', case: 'case-atrium-a' })).toContain('pcie-power')
  })

  it('refuse une alimentation trop faible et avertit d’une marge insuffisante', () => {
    expect(codes({ ...HIGH_END_BUILD, psu: 'psu-voltis-650g', gpu: 'gpu-nebula-rx-7900' })).toEqual(expect.arrayContaining(['psu-transient']))
    expect(codes({ ...HIGH_END_BUILD, psu: 'psu-voltis-850g', gpu: 'gpu-vektor-rtx-4070' })).toEqual([])
  })

  it('détecte une alimentation incapable de fournir la charge continue', () => {
    const report = checkCompatibility(resolveBuild({ ...HIGH_END_BUILD, psu: 'psu-voltis-450b', gpu: 'gpu-vektor-rtx-3060' }), HEALTHY)
    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['psu-capacity']))
    expect(report.status).toBe('incompatible')
  })

  it('exige une sortie vidéo', () => {
    expect(codes({ ...GAMING_BUILD, gpu: null })).toContain('no-display')
    expect(codes({ ...GAMING_BUILD, cpu: 'cpu-axion-a3-3400', gpu: null })).not.toContain('no-display')
  })

  it('avertit d’un refroidissement et d’étages d’alimentation insuffisants', () => {
    const ids = { ...GAMING_BUILD, cpu: 'cpu-corvex-c7-13700', motherboard: 'mb-forge-h610m', cooler: 'cool-glacier-box' }
    expect(codes(ids)).toEqual(expect.arrayContaining(['cooler-capacity', 'vrm']))
  })

  it('explique chaque problème en français et en anglais', () => {
    const report = checkCompatibility(resolveBuild({ ...GAMING_BUILD, motherboard: 'mb-forge-h610m', ram: 'ram-kinetik-16-ddr5' }))
    for (const issue of report.issues) {
      expect(issue.message.fr.length).toBeGreaterThan(10)
      expect(issue.message.en.length).toBeGreaterThan(10)
    }
  })
})
