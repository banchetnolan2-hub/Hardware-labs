import type { Messages } from './fr'

import { gameEn } from './game-en'

export const en: Messages = {
  game: gameEn,
  intro: {
    skip: 'Skip',
    skipKey: 'Esc',
    signature: 'SYSTEM INITIALIZED',
    bootLabel: 'BOOT SEQUENCE',
    checks: ['CPU', 'MEMORY', 'GPU', 'POWER', 'STORAGE']
  },
  menu: {
    title: 'Main menu',
    items: {
      continue: { label: 'Continue', hint: 'Resume your latest career' },
      newCareer: { label: 'New career', hint: 'Open your own lab' },
      sandbox: { label: 'Sandbox mode', hint: 'Experiment freely' },
      configurations: { label: 'My builds', hint: 'Saved configurations' },
      library: { label: 'Component library', hint: 'Hardware catalogue' },
      settings: { label: 'Settings', hint: 'Display, motion, language' },
      releaseNotes: { label: 'Release notes', hint: 'What’s new in this version' },
      quit: { label: 'Quit', hint: 'Close HARDWARE LAB' }
    },
    upcoming: 'Coming soon',
    upcomingIn: (phase: number) => `Available in development phase ${phase}`,
    lab: {
      title: 'Lab',
      empty: 'No career in progress',
      emptyHint: 'Start a new career: your first client is waiting with a gaming PC order.',
      delivered: 'Orders delivered',
      contractsWaiting: (count: number) => `${count} contract(s) waiting on the board.`
    },
    noCareer: 'No career in progress',
    newCareerConfirm: 'A career is already in progress. It will be archived (not deleted) and a new game will start. Continue?',
    roadmap: {
      title: 'Roadmap',
      done: 'Done',
      next: 'Up next',
      planned: 'Planned',
      phases: [
        'Identity & foundations',
        'Configurator & compatibility',
        'Career, diagnostics & repair',
        'Sandbox & saves',
        'Installer & updates',
        'Polish'
      ]
    },
    system: {
      title: 'System',
      version: 'Installed version',
      build: 'Build type',
      packaged: 'Installed application',
      development: 'Development',
      engine: 'Engine',
      updates: 'Updates'
    },
    keyboard: '↑ ↓ to navigate · Enter to select'
  },
  common: { back: 'Back', saved: 'Saved', saveError: 'Could not save' },
  settings: {
    title: 'Settings',
    display: {
      title: 'Display',
      mode: 'Display mode',
      windowed: 'Windowed',
      fullscreen: 'Fullscreen',
      remember: 'Remember window size and position',
      rememberHint: 'Applied on next launch.'
    },
    motion: {
      title: 'Motion',
      intro: 'Launch sequence',
      introHint: 'Animated sequence shown when the game starts.',
      reduced: 'Reduced motion',
      reducedHint: '“System” follows the Windows accessibility setting.',
      system: 'System',
      reduce: 'Reduced',
      full: 'Full'
    },
    updates: {
      title: 'Updates',
      autoCheck: 'Check automatically on launch',
      autoCheckHint: 'Downloads never start without your consent.',
      status: 'Status',
      check: 'Check for updates',
      download: 'Download',
      install: 'Restart and install',
      later: 'Later',
      laterHint: 'The update will be installed when you quit the game.',
      states: {
        unsupported: 'Unavailable in development builds',
        idle: 'Not checked yet',
        checking: 'Checking…',
        notAvailable: 'HARDWARE LAB is up to date',
        available: (v: string) => `Version ${v} available`,
        downloading: (v: string, p: number) => `Downloading version ${v} — ${p}%`,
        downloaded: (v: string) => `Version ${v} ready to install`,
        network: 'Could not reach the update server. Check your connection.',
        unavailable: 'No published version is available yet.',
        other: 'Checking for updates failed.'
      }
    },
    language: { title: 'Language', label: 'Interface language' },
    about: {
      title: 'About',
      version: 'Installed version',
      dataFolder: 'Data folder',
      openFolder: 'Open folder'
    },
    on: 'On',
    off: 'Off'
  },
  releaseNotes: { title: 'Release notes', installed: 'Installed' }
}
