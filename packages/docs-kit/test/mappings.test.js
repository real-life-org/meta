import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { crossLinks, RELATIONS, WORLDS, readMappings } from '../src/glossary/mappings.js'

const json = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'))

test('the RLTP view links Member to RLS member, in the page language', () => {
  const m = json('rltp.json')
  assert.deepEqual(crossLinks(m, 'Member', 'en'), [
    { relation: 'exactMatch', phrase: 'corresponds to', world: 'rls', worldName: 'RLS', label: 'Member', url: 'https://real-life-stack.de/en/handbuch/glossar/#member' },
  ])
  assert.deepEqual(crossLinks(m, 'Member', 'de')[0], { relation: 'exactMatch', phrase: 'entspricht', world: 'rls', worldName: 'RLS', label: 'Mitglied', url: 'https://real-life-stack.de/handbuch/glossar/#member' })
})

test('the RLS view links member back to RLTP', () => {
  const [link] = crossLinks(json('rls.json'), 'member', 'de')
  assert.equal(link.worldName, 'RLTP')
  assert.equal(link.url, 'https://trust-protocol.real-life.org/reference/glossary/#Member')
})

test('every relation in the views has a phrase in both languages', () => {
  for (const f of ['rltp.json', 'rls.json'])
    for (const entries of Object.values(json(f).concepts))
      for (const e of entries) {
        assert.ok(RELATIONS[e.relation], `relation ${e.relation}`)
        assert.ok(WORLDS[e.world], `world ${e.world}`)
      }
  for (const r of ['exactMatch', 'closeMatch', 'relatedMatch', 'broadMatch', 'narrowMatch', 'convergesWith', 'falseFriend'])
    assert.ok(RELATIONS[r].de && RELATIONS[r].en, r)
})

test('no view, unknown concept, or unknown relation: no links, no error', () => {
  assert.deepEqual(crossLinks(null, 'Member', 'en'), [])
  assert.deepEqual(crossLinks(json('rltp.json'), 'Nothing', 'en'), [])
  const odd = { world: 'rltp', concepts: { X: [{ relation: 'sameAsMaybe', world: 'zz', id: 'zz:y', label: { en: 'Y' }, url: { en: 'https://y' } }] } }
  assert.deepEqual(crossLinks(odd, 'X', 'de'), [{ relation: 'sameAsMaybe', phrase: 'sameAsMaybe', world: 'zz', worldName: 'zz', label: 'Y', url: 'https://y' }])
})

test('readMappings reads a file, and a missing one gives null and a warning', async () => {
  const warnings = []
  const warn = (m) => warnings.push(m)
  const m = await readMappings(new URL('./fixtures/rltp.json', import.meta.url).pathname, { warn })
  assert.equal(m.world, 'rltp')
  assert.equal(await readMappings('/nonexistent/views.json', { warn }), null)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /nonexistent/)
})

test('readMappings fetches a URL; a failing fetch gives null and a warning', async () => {
  const warnings = []
  const ok = await readMappings('https://x.example/views/rltp.json', {
    warn: (m) => warnings.push(m),
    fetch: async () => ({ ok: true, json: async () => json('rltp.json') }),
  })
  assert.equal(ok.world, 'rltp')
  const bad = await readMappings('https://x.example/views/rltp.json', {
    warn: (m) => warnings.push(m),
    fetch: async () => ({ ok: false, status: 404, statusText: 'Not Found' }),
  })
  assert.equal(bad, null)
  assert.match(warnings[0], /404/)
})

test('a file of the wrong shape is a warning, not a crash', async () => {
  const warnings = []
  const r = await readMappings('https://x.example/v.json', { warn: (m) => warnings.push(m), fetch: async () => ({ ok: true, json: async () => ({ hello: 1 }) }) })
  assert.equal(r, null)
  assert.equal(warnings.length, 1)
})

test('a mapping within the same world links into the page', () => {
  const [link] = crossLinks(json('rls.json'), 'multi-space-item', 'de').filter((l) => l.world === 'rls')
  assert.equal(link.url, '#mirror')
})
