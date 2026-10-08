import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loadScheme, localName } from '../src/glossary/load.js'

const fixture = (f) => new URL(`./fixtures/${f}`, import.meta.url)

test('localName takes the part after the prefix', () => {
  assert.equal(localName('rltp:AnchorMapping'), 'AnchorMapping')
  assert.equal(localName('rls:member'), 'member')
})

test('the RLTP register loads, keyed by local name, with both languages', () => {
  const { world, concepts } = loadScheme(fixture('rltp.skos.jsonld'))
  assert.equal(world, 'rltp')
  const member = concepts.Member
  assert.equal(member.id, 'rltp:Member')
  assert.equal(member.local, 'Member')
  assert.equal(member.label.en, 'Member')
  assert.ok(member.label.de)
  assert.ok(member.definition.en.length > 10)
  assert.ok(member.definition.de.length > 10)
  assert.ok(member.sources[0].startsWith('https://'))
  assert.equal(concepts['rltp:'], undefined, 'the scheme node is not a concept')
  assert.deepEqual(concepts.PairAnchor.broader, ['Anchor'])
  assert.deepEqual(concepts.AdmissionEvidence.related, ['Invite', 'Accept'])
  assert.equal(concepts.Attestation.status, 'proposed')
  assert.equal(concepts.Group.status, undefined)
})

test('the RLS register loads altLabels per language and symbols', () => {
  const { world, concepts } = loadScheme(fixture('rls.skos.jsonld'))
  assert.equal(world, 'rls')
  assert.deepEqual(concepts.space.altLabels, { de: ['Gruppe'], en: ['Group'] })
  assert.deepEqual(concepts.space.symbols, ['Group'])
  assert.equal(concepts.member.status, 'proposed')
  assert.ok(concepts.member.label.de)
})

test('a parsed document works as well as a path', () => {
  const doc = JSON.parse(readFileSync(fixture('rls.skos.jsonld'), 'utf8'))
  assert.ok(loadScheme(doc).concepts.space)
})

const concept = (extra) => ({
  '@id': 'x:a', '@type': 'skos:Concept',
  'skos:prefLabel': [{ '@value': 'A', '@language': 'de' }, { '@value': 'A', '@language': 'en' }],
  'skos:definition': [{ '@value': 'Ein A.', '@language': 'de' }, { '@value': 'An A.', '@language': 'en' }],
  'dct:source': 'https://example.org/a',
  ...extra,
})

test('a missing language is an error naming concept and field', () => {
  const doc = { '@graph': [concept({ 'skos:definition': [{ '@value': 'An A.', '@language': 'en' }] })] }
  assert.throws(() => loadScheme(doc), /x:a: skos:definition missing in de/)
})

test('all problems are reported at once', () => {
  const doc = { '@graph': [concept({ 'skos:prefLabel': [] }), concept({ '@id': 'x:b', 'skos:broader': { '@id': 'x:nowhere' } })] }
  assert.throws(() => loadScheme(doc), (e) =>
    /x:a: skos:prefLabel missing in de/.test(e.message) &&
    /x:a: skos:prefLabel missing in en/.test(e.message) &&
    /x:b: skos:broader names unknown concept x:nowhere/.test(e.message))
})

test('a single source string becomes a list', () => {
  assert.deepEqual(loadScheme({ '@graph': [concept()] }).concepts.a.sources, ['https://example.org/a'])
})
