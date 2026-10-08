import { test } from 'node:test'
import assert from 'node:assert/strict'
import { markdownToHtml, mdxToJs } from 'satteri'
import { loadScheme } from '../src/glossary/load.js'
import { satteriTerms } from '../src/glossary/satteri.js'

// Astro 7 renders Markdown and MDX with Sätteri; the same markup as the remark plugin must come out.
const { concepts } = loadScheme(new URL('./fixtures/rls.skos.jsonld', import.meta.url))
const options = { concepts, glossaryUrl: { de: '/handbuch/glossar/', en: '/en/handbuch/glossar/' } }
const at = (p) => new URL(`file:///site/${p}`)
const html = async (src, p = 'page.md') => (await markdownToHtml(src, { mdastPlugins: [satteriTerms(options)], fileURL: at(p) })).html

test('Markdown: a term link becomes a button with a popover in both languages', async () => {
  const out = await html('Bin ich [Mitglied](term:member) des Space?')
  assert.match(out, /^<p>Bin ich <span class="rl-term-wrap"><button type="button" class="rl-term" popovertarget="rl-term-member-1"[^>]*>Mitglied<\/button>/)
  assert.match(out, /<span popover="" id="rl-term-member-1" class="rl-term-pop" role="tooltip"/)
  assert.match(out, /<span lang="de" class="rl-term-lang"><strong>Mitglied<\/strong>/)
  assert.match(out, /<span lang="en" class="rl-term-lang"><strong>Member<\/strong>/)
  assert.match(out, /<a href="\/handbuch\/glossar\/#member" class="rl-term-more">Glossar<\/a>/)
  assert.match(out, /<a href="\/en\/handbuch\/glossar\/#member" class="rl-term-more">Glossary<\/a>/)
})

test('Markdown: ids are unique per page and start again on the next page', async () => {
  const plugin = satteriTerms(options)
  const run = async () => (await markdownToHtml('[a](term:member) [b](term:space) [c](term:member)', { mdastPlugins: [plugin], fileURL: at('p.md') })).html
  const first = await run()
  assert.deepEqual([...first.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]), ['rl-term-member-1', 'rl-term-space-2', 'rl-term-member-3'])
  assert.equal(await run(), first)
})

test('Markdown: plain links stay, unknown terms fail with file, line and term', async () => {
  assert.match(await html('[here](/handbuch/) [Mitglied](term:member)'), /<a href="\/handbuch\/">here<\/a>/)
  await assert.rejects(html('\nEin [Ding](term:nothing).', 'docs/x.md'), (e) =>
    e.message.includes('/site/docs/x.md:2:5') && e.message.includes('"nothing"'))
})

test('MDX: the same markup as JSX, also inside a component', async () => {
  const { code } = await mdxToJs('Bin ich [Mitglied](term:member)?\n\n<div>\n\n[Space](term:space)\n\n</div>', { mdastPlugins: [satteriTerms(options)], fileURL: at('p.mdx') })
  assert.match(code, /popovertarget: "rl-term-member-1"/)
  assert.match(code, /popover: ""/)
  assert.match(code, /popovertarget: "rl-term-space-2"/)
  assert.doesNotMatch(code, /term:/)
})

test('the popover stays out of the search index of the page that uses the term', async () => {
  assert.match(await html('[Mitglied](term:member)'), /<span popover=""[^>]* data-pagefind-ignore=""/)
})

test('text glued to the term moves into the wrapper; two terms in a row each keep their own', async () => {
  const out = await html('Bin ich [Mitglied](term:member), oder [Space](term:space)s/[Space](term:space). Ende')
  assert.match(out, /<\/span><\/span>,<\/span> oder <span class="rl-term-wrap">/)
  assert.match(out, /<\/span><\/span>s\/<\/span><span class="rl-term-wrap">/)
  assert.match(out, /<\/span><\/span>.<\/span> Ende<\/p>/)
})
