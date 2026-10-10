import type { Slot } from '@simulation/types'
import type { GameRoute } from '../store/app-store'

type IconName = GameRoute | Slot | 'menu' | 'settings' | 'check' | 'cross' | 'warning' | 'lock' | 'clock' | 'bolt' | 'thermo' | 'star'

const PATHS: Record<IconName, string> = {
  workshop: 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6',
  contracts: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
  configurator: 'M4 4h16v16H4zM8 8h3v3H8zM13 8h3v8h-3zM8 13h3v3H8z',
  bench: 'M3 17l5-6 4 3 4-7 5 6M3 21h18',
  library: 'M4 5h4v15H4zM10 5h4v15h-4zM16 6l3.5-1 3 14-3.5 1z',
  finances: 'M12 3v18M16.5 7.5c0-2-2-3-4.5-3s-4.5 1.2-4.5 3.3S9.5 11 12 11.5s4.5 1.3 4.5 3.5-2 3.5-4.5 3.5-4.5-1-4.5-3',
  progress: 'M4 20V14M10 20V9M16 20V4M2 20h20',
  menu: 'M4 6h16M4 12h16M4 18h16',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00-1.2-2.9H3a2 2 0 110-4h.1a1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 002.9-1.2V3a2 2 0 114 0v.1a1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 001.2 2.9H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  cpu: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4',
  motherboard: 'M4 3h16v18H4zM8 7h5v5H8zM15 7h2v10h-2zM8 15h5v2H8z',
  ram: 'M3 8h18v8H3zM6 11h2v2H6zM10 11h2v2h-2zM14 11h2v2h-2zM6 16v3M10 16v3M14 16v3M18 16v3',
  gpu: 'M2 7h18v10H2zM20 10h2v4h-2zM8 12a3 3 0 106 0 3 3 0 00-6 0zM4 17v3h6v-3',
  storage: 'M4 4h16v16H4zM8 15h8M8 18h3M12 9a1 1 0 100-.01',
  psu: 'M3 6h18v12H3zM13 9l-3 4h4l-3 4M6 9h1M6 15h1',
  cooler: 'M12 12m-8 0a8 8 0 1016 0 8 8 0 10-16 0M12 12l0-6M12 12l5 3M12 12l-5 3',
  case: 'M6 2h12v20H6zM9 6h6M9 9h6M12 17a1 1 0 100-.01',
  check: 'M5 12l5 5 9-10',
  cross: 'M6 6l12 12M18 6L6 18',
  warning: 'M12 3l10 18H2zM12 10v5M12 18v.01',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 118 0v4',
  clock: 'M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0M12 7v5l3 2',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  thermo: 'M14 14.8V4a2 2 0 10-4 0v10.8a4 4 0 104 0zM12 9v7',
  star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 3 1-6.2L3 9.7l6.2-.9z'
}

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  )
}
