import { describe, expect, it } from 'vitest'
import { CATALOG, componentsOfSlot, getComponent } from './catalog'
import { SLOTS } from './types'

describe('catalogue des composants', () => {
  it('contient au moins 30 composants avec des identifiants uniques et stables', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(30)
    const ids = CATALOG.map((component) => component.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const component of CATALOG) {
      expect(component.id).toMatch(/^[a-z0-9-]+$/)
      expect(getComponent(component.id)).toBe(component)
    }
  })

  it('propose au moins trois choix par catégorie, dont un dès le niveau 1', () => {
    for (const slot of SLOTS) {
      const items = componentsOfSlot(slot)
      expect(items.length, slot).toBeGreaterThanOrEqual(3)
      expect(items.some((item) => item.unlockLevel === 1), slot).toBe(true)
    }
  })

  it('a des caractéristiques positives et cohérentes', () => {
    for (const c of CATALOG) {
      expect(c.price, c.id).toBeGreaterThan(0)
      expect(c.unlockLevel, c.id).toBeGreaterThanOrEqual(1)
      expect(c.unlockLevel, c.id).toBeLessThanOrEqual(5)
      expect(c.summary.fr.length, c.id).toBeGreaterThan(5)
      expect(c.summary.en.length, c.id).toBeGreaterThan(5)
      switch (c.slot) {
        case 'cpu':
          expect(c.threads).toBeGreaterThanOrEqual(c.cores)
          expect(c.multiScore).toBeGreaterThan(0)
          expect(c.loadPower).toBeGreaterThan(30)
          break
        case 'ram':
          expect(c.capacityGb % c.modules).toBe(0)
          break
        case 'cooler':
          expect(c.kind === 'air' ? c.heightMm > 0 && c.radiatorMm === 0 : c.radiatorMm > 0 && c.heightMm === 0).toBe(true)
          break
        case 'psu':
          expect(c.efficiency).toBeGreaterThan(0.8)
          expect(c.efficiency).toBeLessThan(1)
          break
      }
    }
  })

  it('les gammes supérieures sont plus performantes', () => {
    const gpus = componentsOfSlot('gpu').sort((a, b) => a.price - b.price)
    for (let i = 1; i < gpus.length; i++) expect(gpus[i]!.perfScore).toBeGreaterThanOrEqual(gpus[i - 1]!.perfScore)
  })
})
