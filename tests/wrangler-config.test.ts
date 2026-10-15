import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Removes // and /* *\/ comments from JSONC, leaving string contents (e.g. "https://…") untouched.
 * A block comment becomes a space, so it still separates tokens (`1/**\/2` stays invalid), and an
 * unterminated one throws, so an invalid file can't parse here while Wrangler rejects it.
 * wrangler.jsonc has no trailing commas, so JSON.parse handles the rest.
 */
function stripJsonComments(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j;
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end === -1) throw new SyntaxError(`Unterminated block comment at offset ${i}`);
      out += ' ';
      i = end + 1;
    } else {
      out += c;
    }
  }
  return out;
}

/** Cloudflare's send_email binding rejects any recipient other than its pinned destination_address. */
function sameAddress(a: string | undefined, b: string | undefined): boolean {
  return typeof a === 'string' && typeof b === 'string' && a.trim() !== '' && a.trim() === b.trim();
}

type WranglerConfig = {
  vars: Record<string, string>;
  send_email: { name: string; destination_address?: string }[];
};

const config: WranglerConfig = JSON.parse(
  stripJsonComments(readFileSync(fileURLToPath(new URL('../wrangler.jsonc', import.meta.url)), 'utf8')),
);

describe('stripJsonComments', () => {
  it('removes line and block comments', () => {
    expect(JSON.parse(stripJsonComments('{\n// note\n"a": 1, /* b */ "c": 2\n}'))).toEqual({ a: 1, c: 2 });
  });

  it('keeps comment-like text inside strings, including escaped quotes', () => {
    expect(JSON.parse(stripJsonComments('{"url": "https://hercuit.com", "q": "say \\"//hi\\" /* x */"}'))).toEqual({
      url: 'https://hercuit.com',
      q: 'say "//hi" /* x */',
    });
  });

  it('keeps accents and emoji', () => {
    expect(JSON.parse(stripJsonComments('{"n": "Hércules 🚀"} // ñ'))).toEqual({ n: 'Hércules 🚀' });
  });

  it('rejects an unterminated block comment instead of dropping the rest of the file', () => {
    expect(() => stripJsonComments('{"a": 1} /* never closed')).toThrow(/Unterminated block comment/);
    expect(() => stripJsonComments('{"a": 1 /* never closed\n}')).toThrow(/Unterminated block comment/);
    expect(() => stripJsonComments('/*')).toThrow(/Unterminated block comment/);
  });

  it('replaces a block comment with whitespace, so it still separates tokens', () => {
    expect(stripJsonComments('1/**/2')).toBe('1 2');
    expect(() => JSON.parse(stripJsonComments('{"a": 1/**/2}'))).toThrow(SyntaxError);
  });

  it('accepts a closed comment that contains * and /', () => {
    expect(JSON.parse(stripJsonComments('{"a": /* 2 * 3 / 4 **/ 1}'))).toEqual({ a: 1 });
  });

  it('accepts a line comment on the last line without a newline', () => {
    expect(JSON.parse(stripJsonComments('{"a": 1} // end'))).toEqual({ a: 1 });
  });

  it('keeps an unterminated string for JSON.parse to reject', () => {
    expect(() => JSON.parse(stripJsonComments('{"a": "open /* x */'))).toThrow(SyntaxError);
  });

  it('returns empty input unchanged', () => {
    expect(stripJsonComments('')).toBe('');
  });
});

describe('sameAddress', () => {
  it('matches identical addresses', () => {
    expect(sameAddress('hercuitmx@gmail.com', 'hercuitmx@gmail.com')).toBe(true);
  });

  it.each([
    ['different addresses', 'hercuitmx@gmail.com', 'info@hercuit.com'],
    ['a different-case variant', 'HercuitMX@gmail.com', 'hercuitmx@gmail.com'],
    ['an empty address', '', ''],
    ['a blank address', '  ', '  '],
    ['a missing address', undefined, 'hercuitmx@gmail.com'],
  ])('reports a mismatch for %s', (_label, a, b) => {
    expect(sameAddress(a, b)).toBe(false);
  });
});

describe('lead email routing in wrangler.jsonc', () => {
  const binding = config.send_email.find((b) => b.name === 'LEADS_EMAIL');

  it('has exactly one LEADS_EMAIL binding, pinned to a single destination', () => {
    expect(config.send_email.filter((b) => b.name === 'LEADS_EMAIL')).toHaveLength(1);
    expect(binding?.destination_address).toBeTruthy();
  });

  it('sends leads to hercuitmx@gmail.com, the address the binding is pinned to', () => {
    expect(config.vars.LEAD_TO).toBe('hercuitmx@gmail.com');
    expect(sameAddress(config.vars.LEAD_TO, binding?.destination_address)).toBe(true);
  });

  it('sends from info@hercuit.com, an address on the Email Routing domain', () => {
    expect(config.vars.LEAD_FROM).toBe('info@hercuit.com');
    expect(config.vars.LEAD_FROM.endsWith('@hercuit.com')).toBe(true);
  });

  it('never sends from the recipient address', () => {
    expect(config.vars.LEAD_FROM).not.toBe(config.vars.LEAD_TO);
  });
});
