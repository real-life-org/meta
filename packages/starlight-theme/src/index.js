import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadScheme } from './glossary/load.js'
import { remarkTerms } from './glossary/remark.js'
import { satteriTerms } from './glossary/satteri.js'
import { readMappings } from './glossary/mappings.js'

export { loadScheme } from './glossary/load.js'
export { remarkTerms } from './glossary/remark.js'
export { satteriTerms } from './glossary/satteri.js'
export { crossLinks, readMappings } from './glossary/mappings.js'

export const VIRTUAL_ID = 'virtual:real-life-theme/glossary'
const RESOLVED_ID = `\0${VIRTUAL_ID}`
const GLOSSARY_COMPONENT = '@real-life/starlight-theme/Glossary.astro'
const META_VIEWS = 'https://raw.githubusercontent.com/real-life-org/meta/main/views'

/**
 * Starlight plugin of the Real Life family.
 *
 * @param {object} options
 * @param {string} options.world      the site's world: 'rltp', 'rls', 'rlnp'
 * @param {string} options.scheme     the site's SKOS register, absolute or relative to the build directory
 * @param {{en: string, de?: string}} options.glossary  glossary page per language (de falls back to en)
 * @param {string | false} [options.mappings]  views/<world>.json from meta (path or URL); false: none
 * @param {{en?: string, de?: string}} [options.links]  text of the popover's link to the glossary
 */
/**
 * The term plugin goes into the Markdown processor Astro and Starlight share for .md and .mdx:
 * Sätteri (Astro 7's default) or unified (`@astrojs/markdown-remark`).
 */
function registerTerms(processor, options, updateAstro) {
  if (processor?.name === 'satteri' && Array.isArray(processor.options?.mdastPlugins)) processor.options.mdastPlugins.push(satteriTerms(options))
  else if (Array.isArray(processor?.options?.remarkPlugins)) processor.options.remarkPlugins.push([remarkTerms, options])
  else if (!processor) updateAstro({ markdown: { remarkPlugins: [[remarkTerms, options]] } })
  else throw new Error(`@real-life/starlight-theme: the Markdown processor "${processor.name}" is not supported; use satteri() or unified()`)
}

export default function realLifeTheme(options = {}) {
  return {
    name: '@real-life/starlight-theme',
    hooks: {
      async 'config:setup'({ config, updateConfig, addIntegration, logger }) {
        const { world, scheme, glossary, links } = options
        if (!world) throw new Error('@real-life/starlight-theme: option `world` is required (rltp, rls, rlnp)')
        if (!scheme) throw new Error('@real-life/starlight-theme: option `scheme` is required (path to the SKOS register)')
        if (!glossary?.en) throw new Error('@real-life/starlight-theme: option `glossary` needs at least `en` (URL of the glossary page)')
        const file = isAbsolute(scheme) ? scheme : resolve(process.cwd(), scheme)
        const loaded = loadScheme(file)
        if (loaded.world !== world) throw new Error(`@real-life/starlight-theme: scheme ${file} is ${loaded.world}, not ${world}`)
        const { concepts } = loaded
        const source = options.mappings ?? `${META_VIEWS}/${world}.json`
        const mappings = source === false ? null
          : await readMappings(/^https?:\/\//.test(source) || isAbsolute(source) ? source : resolve(process.cwd(), source), { warn: (m) => logger.warn(m) })

        updateConfig({ customCss: ['@real-life/starlight-theme/glossary.css', ...(config.customCss ?? [])] })

        const data = { world, concepts, mappings, glossary }
        addIntegration({
          name: '@real-life/starlight-theme/glossary',
          hooks: {
            'astro:config:setup'({ config: astroConfig, updateConfig: updateAstro, injectScript }) {
              registerTerms(astroConfig.markdown?.processor, { concepts, glossaryUrl: glossary, links }, updateAstro)
              updateAstro({
                vite: {
                  // Content outside the site package (RLS keeps its handbook in docs/handbook) cannot
                  // resolve the package by name under pnpm; the alias makes the import work from anywhere.
                  resolve: { alias: [{ find: GLOSSARY_COMPONENT, replacement: fileURLToPath(new URL('./glossary/Glossary.astro', import.meta.url)) }] },
                  plugins: [{
                    name: 'real-life-theme-glossary',
                    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
                    load: (id) => (id === RESOLVED_ID ? `export default ${JSON.stringify(data)};` : undefined),
                  }],
                },
              })
              injectScript('page', "import '@real-life/starlight-theme/hover.js';")
            },
          },
        })
      },
    },
  }
}
