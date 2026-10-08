import { test } from 'node:test'
import assert from 'node:assert/strict'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { compile } from '@mdx-js/mdx'
import { VFile } from 'vfile'
import { loadScheme } from '../src/glossary/load.js'
import { remarkTerms } from '../src/glossary/remark.js'

const { concepts } = loadScheme(new URL('./fixtures/rls.skos.jsonld', import.meta.url))
const options = { concepts, glossaryUrl: { de: '/handbuch/glossar/', en: '/en/handbuch/glossar/' } }

async function md(text, opts = options, path = 'docs/page.md') {
  const file = new VFile({ value: text, path })
  return String(await unified().use(remarkParse).use(remarkTerms, opts).use(remarkRehype).use(rehypeStringify).process(file))
}

test('a term link becomes a button with a popover in both languages', async () => {
  const html = await md('Bin ich [Mitglied](term:member) des Space?')
  assert.match(html, /<button type="button" class="rl-term" popovertarget="rl-term-member-1"[^>]*>Mitglied<\/button>/)
  assert.match(html, /<span popover="" id="rl-term-member-1" class="rl-term-pop" role="tooltip"[^>]*>/)
  assert.match(html, new RegExp(`<span lang="de"[^>]*>.*${concepts.member.label.de}.*${escape(concepts.member.definition.de)}`))
  assert.match(html, new RegExp(`<span lang="en"[^>]*>.*${concepts.member.label.en}.*${escape(concepts.member.definition.en)}`))
  assert.match(html, /<a href="\/handbuch\/glossar\/#member"[^>]*>Glossar<\/a>/)
  assert.match(html, /<a href="\/en\/handbuch\/glossar\/#member"[^>]*>Glossary<\/a>/)
  assert.doesNotMatch(html, /term:/)
  assert.match(html, /^<p>Bin ich <span class="rl-term-wrap">/, 'stays inline inside the paragraph')
})

function escape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/"/g, '(?:"|&#x22;|&quot;)') }

test('ids are unique per page, also for the same term twice', async () => {
  const html = await md('[Mitglied](term:member), [Space](term:space), [Mitglieder](term:member).')
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
  assert.deepEqual(ids, ['rl-term-member-1', 'rl-term-space-2', 'rl-term-member-3'])
  const targets = [...html.matchAll(/popovertarget="([^"]+)"/g)].map((m) => m[1])
  assert.deepEqual(targets, ids)
})

test('the numbering starts again for every file', async () => {
  const proc = unified().use(remarkParse).use(remarkTerms, options).use(remarkRehype).use(rehypeStringify).freeze()
  const a = String(await proc.process('[Space](term:space)'))
  const b = String(await proc.process('[Space](term:space)'))
  assert.equal(a, b)
})

test('the button anchors its popover for CSS anchor positioning', async () => {
  const html = await md('[Space](term:space)')
  assert.match(html, /<button[^>]*style="anchor-name: --rl-term-space-1"/)
  assert.match(html, /<span popover[^>]*style="position-anchor: --rl-term-space-1"/)
})

test('an unknown term fails with file and term', async () => {
  await assert.rejects(md('Ein [Ding](term:nothing).', options, 'docs/handbook/de/x.mdx'), (e) =>
    e.message.includes('docs/handbook/de/x.mdx') && e.message.includes('"nothing"'))
})

test('plain links stay untouched', async () => {
  const html = await md('[Spec](https://example.org/term:space) and [here](/handbuch/) and [Mitglied](term:member)')
  assert.match(html, /<a href="https:\/\/example.org\/term:space">Spec<\/a>/)
  assert.match(html, /<a href="\/handbuch\/">here<\/a>/)
})

test('formatting inside the link text keeps only its text', async () => {
  const html = await md('[**Mitglied**](term:member)')
  assert.match(html, />Mitglied<\/button>/)
})

test('empty link text shows the label in each language', async () => {
  const html = await md('[](term:member)')
  assert.match(html, /<button[^>]*><span lang="de">[^<]+<\/span><span lang="en">[^<]+<\/span><\/button>/)
})

test('one glossary URL serves both languages; link texts can be changed', async () => {
  const html = await md('[Space](term:space)', { concepts, glossaryUrl: { en: '/reference/glossary/' }, links: { en: 'Terms', de: 'Begriffe' } })
  assert.match(html, /<a href="\/reference\/glossary\/#space"[^>]*>Begriffe<\/a>/)
  assert.match(html, /<a href="\/reference\/glossary\/#space"[^>]*>Terms<\/a>/)
})

test('special characters in definitions are escaped', async () => {
  const c = { x: { ...concepts.space, local: 'x', definition: { de: '<b>&</b>', en: 'a < b' } } }
  const html = await md('[X](term:x)', { concepts: c, glossaryUrl: options.glossaryUrl })
  assert.match(html, /&#x3C;b>&#x26;&#x3C;\/b>/)
  assert.doesNotMatch(html, /<b>/)
})

test('MDX compiles the same markup', async () => {
  const out = String(await compile(new VFile({ value: 'Bin ich [Mitglied](term:member)?\n\n<div>[Space](term:space)</div>', path: 'x.mdx' }), {
    remarkPlugins: [[remarkTerms, options]],
    elementAttributeNameCase: 'html',
  }))
  assert.match(out, /popovertarget: "rl-term-member-1"/)
  assert.match(out, /popover: ""/)
  assert.match(out, /"rl-term-pop"/)
  assert.match(out, /popovertarget: "rl-term-space-2"/)
})

test('text glued to the term moves into the wrapper; two terms in a row each keep their own', async () => {
  const out = await md('Bin ich [Mitglied](term:member), oder [Space](term:space)s/[Space](term:space). Ende')
  assert.match(out, /<\/span><\/span>,<\/span> oder <span class="rl-term-wrap">/)
  assert.match(out, /<\/span><\/span>s\/<\/span><span class="rl-term-wrap">/)
  assert.match(out, /<\/span><\/span>.<\/span> Ende<\/p>/)
})
