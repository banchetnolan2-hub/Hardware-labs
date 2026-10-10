import { create } from 'zustand'
import {
  abandonContract,
  acceptContract,
  buyAndInstall,
  buyComponent,
  buyTool,
  deliver,
  installPart,
  newCareer,
  performService,
  removePart,
  runTest,
  sellComponent,
  type ActionError,
  type ActionResult,
  type DeliveryReport
} from '@career/career'
import type { Career, Service } from '@career/schema'
import type { BenchResult, BenchTestId, ToolId } from '@simulation/bench'
import type { Slot } from '@simulation/types'

type Notice = { kind: 'error'; error: ActionError } | null

type GameState = {
  status: 'idle' | 'loading' | 'ready'
  career: Career | null
  /** La sauvegarde principale était illisible et a été restaurée depuis la copie de secours. */
  recovered: boolean
  saveError: string | null
  notice: Notice
  lastBench: BenchResult | null
  report: DeliveryReport | null
  load: () => Promise<void>
  startNewCareer: () => Promise<void>
  dismissNotice: () => void
  dismissReport: () => void
  accept: (contractId: string) => boolean
  abandon: () => boolean
  buy: (componentId: string) => boolean
  sell: (componentId: string) => boolean
  buyTool: (tool: ToolId) => boolean
  install: (slot: Slot, componentId: string) => boolean
  buyAndInstall: (slot: Slot, componentId: string) => boolean
  remove: (slot: Slot) => boolean
  service: (service: Service) => boolean
  test: (test: BenchTestId) => BenchResult | null
  deliver: () => DeliveryReport | null
}

let saveChain: Promise<void> = Promise.resolve()

export const useGameStore = create<GameState>((set, get) => {
  /** Enregistre chaque état dans l'ordre des actions. */
  const persist = (career: Career) => {
    saveChain = saveChain.then(async () => {
      const result = await window.hardwareLab.saveCareer(career)
      set({ saveError: result.ok ? null : result.error })
    })
  }

  /** Applique une action pure du moteur ; en cas de refus, l'état reste inchangé. */
  const apply = <Extra extends object>(action: (career: Career) => ActionResult<Extra>): (Extra & { career: Career }) | null => {
    const current = get().career
    if (!current) return null
    const result = action(current)
    if (!result.ok) {
      set({ notice: { kind: 'error', error: result.error } })
      return null
    }
    set({ career: result.career, notice: null })
    persist(result.career)
    return result as unknown as Extra & { career: Career }
  }

  return {
    status: 'idle',
    career: null,
    recovered: false,
    saveError: null,
    notice: null,
    lastBench: null,
    report: null,

    load: async () => {
      if (get().status !== 'idle') return
      set({ status: 'loading' })
      const result = await window.hardwareLab.loadCareer()
      set({
        status: 'ready',
        career: result.status === 'none' ? null : result.career,
        recovered: result.status === 'recovered'
      })
    },

    startNewCareer: async () => {
      await saveChain
      await window.hardwareLab.archiveCareer()
      const career = newCareer(Math.floor(Math.random() * 2 ** 31))
      set({ career, lastBench: null, report: null, notice: null, recovered: false })
      persist(career)
      await saveChain
    },

    dismissNotice: () => set({ notice: null }),
    dismissReport: () => set({ report: null }),

    accept: (id) => !!apply((career) => acceptContract(career, id)),
    abandon: () => {
      const done = !!apply((career) => abandonContract(career))
      if (done) set({ lastBench: null })
      return done
    },
    buy: (id) => !!apply((career) => buyComponent(career, id)),
    sell: (id) => !!apply((career) => sellComponent(career, id)),
    buyTool: (tool) => !!apply((career) => buyTool(career, tool)),
    install: (slot, id) => !!apply((career) => installPart(career, slot, id)),
    buyAndInstall: (slot, id) => !!apply((career) => buyAndInstall(career, slot, id)),
    remove: (slot) => !!apply((career) => removePart(career, slot)),
    service: (service) => !!apply((career) => performService(career, service)),
    test: (test) => {
      const result = apply((career) => runTest(career, test))
      if (!result) return null
      set({ lastBench: result.result })
      return result.result
    },
    deliver: () => {
      const result = apply((career) => deliver(career))
      if (!result) return null
      set({ report: result.report, lastBench: null })
      return result.report
    }
  }
})
