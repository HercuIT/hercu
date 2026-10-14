import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import semver from 'semver';

const require = createRequire(import.meta.url);

function enginesOf(pkgJsonPath: string): string | undefined {
  return JSON.parse(readFileSync(pkgJsonPath, 'utf8')).engines?.node;
}

const ours = enginesOf(new URL('../package.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

// Tools that run during dev/CI/build. Our declared range must not promise a Node version they reject.
const tools = ['astro', 'vite', 'vitest', 'wrangler'];

describe('package.json engines.node', () => {
  it('is a valid semver range', () => {
    expect(ours).toBeDefined();
    expect(semver.validRange(ours!)).not.toBeNull();
  });

  it.each(tools)('stays within the Node range declared by %s', (tool) => {
    const theirs = enginesOf(require.resolve(`${tool}/package.json`));
    expect(theirs, `${tool} declares no engines.node`).toBeDefined();
    expect(semver.subset(ours!, theirs!), `ours "${ours}" vs ${tool} "${theirs}"`).toBe(true);
  });

  it.each(['22.12.0', '22.18.0', '24.0.0', '24.18.0', '26.0.0'])('accepts supported Node %s', (version) => {
    expect(semver.satisfies(version, ours!)).toBe(true);
  });

  it.each([
    ['below the minimum', '22.11.0'],
    ['an older LTS', '20.19.0'],
    ['odd release 23', '23.5.0'],
    ['odd release 25', '25.0.0'],
  ])('rejects %s (%s)', (_label, version) => {
    expect(semver.satisfies(version, ours!)).toBe(false);
  });

  it('covers both Node versions the CI matrix runs (22.x and 24.x)', () => {
    expect(semver.intersects('22.x', ours!)).toBe(true);
    expect(semver.intersects('24.x', ours!)).toBe(true);
  });
});
