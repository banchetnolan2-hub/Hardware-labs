import { describe, expect, it } from 'vitest'
import { classifyUpdateError } from './updater'

describe('classifyUpdateError', () => {
  it('reconnaît une absence de connexion', () => {
    expect(classifyUpdateError(new Error('net::ERR_INTERNET_DISCONNECTED')).kind).toBe('network')
    expect(classifyUpdateError(new Error('getaddrinfo ENOTFOUND github.com')).kind).toBe('network')
    expect(classifyUpdateError(new Error('connect ETIMEDOUT 140.82.121.4:443')).kind).toBe('network')
  })

  it('reconnaît une version indisponible sur le serveur de publication', () => {
    expect(classifyUpdateError(new Error('HttpError: 404 Not Found')).kind).toBe('unavailable')
    expect(classifyUpdateError(new Error('No published versions on GitHub')).kind).toBe('unavailable')
    expect(classifyUpdateError(new Error('Cannot find latest.yml in the latest release artifacts')).kind).toBe('unavailable')
  })

  it('conserve le message des autres erreurs', () => {
    const result = classifyUpdateError('sha512 checksum mismatch')
    expect(result).toEqual({ state: 'error', kind: 'other', message: 'sha512 checksum mismatch' })
  })
})
