// Fails unless the tarball holds exactly what consumers need: the README,
// the LICENSE, package.json and the sources. Tests, fixtures and scripts never ship.
import { execFileSync } from 'node:child_process'

const [{ files }] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }))
const allowed = (p) => p === 'README.md' || p === 'LICENSE' || p === 'package.json' || p.startsWith('src/')
const stray = files.map((f) => f.path).filter((p) => !allowed(p))
if (stray.length) {
  console.error(`not for the tarball:\n  ${stray.join('\n  ')}`)
  process.exit(1)
}
for (const required of ['LICENSE', 'src/index.js']) {
  if (!files.some((f) => f.path === required)) {
    console.error(`${required} is missing from the tarball`)
    process.exit(1)
  }
}
console.log(`tarball: ${files.length} files, all of them README, LICENSE, package.json or src/`)
