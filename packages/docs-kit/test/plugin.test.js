import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import docsKit, { VIRTUAL_ID } from '../src/index.js'
import { remarkTerms } from '../src/glossary/remark.js'

const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url))

async function setup(options, config = { customCss: ['./src/site.css'] }, processor = satteriProcessor()) {
  const calls = { updates: [], integrations: [], warnings: [], astro: [], scripts: [] }
  const plugin = docsKit(options)
  await plugin.hooks['config:setup']({
    config,
    updateConfig: (c) => calls.updates.push(c),
    addIntegration: (i) => calls.integrations.push(i),
    logger: { warn: (m) => calls.warnings.push(m), info() {} },
  })
  for (const i of calls.integrations)
    await i.hooks['astro:config:setup']({ config: { markdown: { processor } }, updateConfig: (c) => calls.astro.push(c), injectScript: (stage, s) => calls.scripts.push([stage, s]) })
  return { ...calls, processor }
}

const satteriProcessor = () => ({ name: 'satteri', options: { mdastPlugins: [], hastPlugins: [], features: {} } })

const base = { world: 'rltp', scheme: `${fixtures}rltp.skos.jsonld`, glossary: { en: '/reference/glossary/' } }

test('adds the CSS before the site CSS', async () => {
  const { updates } = await setup({ ...base, mappings: `${fixtures}rltp.json` })
  assert.deepEqual(updates[0].customCss, ['@real-life/docs-kit/glossary.css', './src/site.css'])
})

test('registers the term plugin with Sätteri, Astro 7\'s default processor for .md and .mdx', async () => {
  const { processor } = await setup({ ...base, mappings: false })
  assert.equal(processor.options.mdastPlugins.length, 1)
  const plugin = processor.options.mdastPlugins[0]({ fileURL: new URL('file:///x.md') })
  assert.equal(plugin.name, 'real-life-terms')
  assert.equal(typeof plugin.link, 'function')
})

test('registers the remark plugin with a unified processor, with concepts and glossary URLs', async () => {
  const unified = { name: 'unified', options: { remarkPlugins: [], rehypePlugins: [] } }
  await setup({ ...base, mappings: false }, undefined, unified)
  const [[plugin, opts]] = unified.options.remarkPlugins
  assert.equal(plugin, remarkTerms)
  assert.ok(opts.concepts.Member)
  assert.deepEqual(opts.glossaryUrl, { en: '/reference/glossary/' })
})

test('without a processor (older Astro) it falls back to markdown.remarkPlugins', async () => {
  const { astro } = await setup({ ...base, mappings: false }, undefined, null)
  assert.equal(astro[0].markdown.remarkPlugins[0][0], remarkTerms)
})

test('an unknown processor fails instead of silently leaving term links', async () => {
  await assert.rejects(setup({ ...base, mappings: false }, undefined, { name: 'other', options: {} }), /"other" is not supported/)
})

test('injects the hover script on every page', async () => {
  const { scripts } = await setup({ ...base, mappings: false })
  assert.deepEqual(scripts, [['page', "import '@real-life/docs-kit/hover.js';"]])
})

test('serves concepts and mappings to Glossary.astro through a virtual module', async () => {
  const { astro } = await setup({ ...base, mappings: `${fixtures}rltp.json` })
  const vite = astro.at(-1).vite.plugins[0]
  const id = vite.resolveId(VIRTUAL_ID)
  assert.ok(id)
  const data = JSON.parse(vite.load(id).replace(/^export default /, '').replace(/;\s*$/, ''))
  assert.equal(data.world, 'rltp')
  assert.ok(data.concepts.Member)
  assert.equal(data.mappings.concepts.Member[0].id, 'rls:member')
  assert.deepEqual(data.glossary, { en: '/reference/glossary/' })
  assert.equal(vite.resolveId('something-else'), undefined)
})

test('a missing mappings file is a warning, the build goes on without cross-world links', async () => {
  const { warnings, astro } = await setup({ ...base, mappings: '/nonexistent.json' })
  assert.equal(warnings.length, 1)
  const vite = astro.at(-1).vite.plugins[0]
  assert.equal(JSON.parse(vite.load(vite.resolveId(VIRTUAL_ID)).replace(/^export default /, '').replace(/;\s*$/, '')).mappings, null)
})

test('the default mappings come from meta main for the world', async () => {
  const urls = []
  const saved = globalThis.fetch
  globalThis.fetch = async (u) => { urls.push(u); return { ok: false, status: 404, statusText: 'x' } }
  try { await setup(base) } finally { globalThis.fetch = saved }
  assert.deepEqual(urls, ['https://raw.githubusercontent.com/real-life-org/meta/main/views/rltp.json'])
})

test('a relative scheme path is read from the build directory', async () => {
  const cwd = process.cwd()
  process.chdir(fixtures)
  try { await setup({ ...base, scheme: 'rls.skos.jsonld', world: 'rls', mappings: false }) } finally { process.chdir(cwd) }
})

test('missing options and a broken register fail at config time', async () => {
  await assert.rejects(setup({ ...base, world: undefined }), /world/)
  await assert.rejects(setup({ ...base, glossary: {} }), /glossary/)
  await assert.rejects(setup({ ...base, scheme: '/nonexistent.jsonld' }), /nonexistent/)
  await assert.rejects(setup({ ...base, world: 'rls' }), /scheme .* is rltp, not rls/)
})

test('Glossary.astro resolves by package name also from content outside the site package', async () => {
  const { astro } = await setup({ ...base, mappings: false })
  const [alias] = astro.at(-1).vite.resolve.alias
  assert.equal(alias.find, '@real-life/docs-kit/Glossary.astro')
  assert.equal(alias.replacement, fileURLToPath(new URL('../src/glossary/Glossary.astro', import.meta.url)))
})
