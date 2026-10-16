import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Source checks for the weekend-monitoring entry points (specs/weekend-monitoring): Astro markup that
// unit tests can't render. The copy itself is tested in src/constants/site-copy.test.ts.
const read = (path: string) => readFileSync(fileURLToPath(new URL(`../src/components/${path}`, import.meta.url)), 'utf8');
const header = read('Header.astro');
const hero = read('Hero.astro');
const footer = read('Footer.astro');
const services = read('Services.astro');
const section = read('Monitoring.astro');
const home = read('HomePage.astro');
const contact = read('Contact.astro');

describe('monitoring entry points', () => {
  it('desktop header: a nav item to the section, between Services and Projects', () => {
    const services = header.indexOf('t.nav.services.label');
    const monitoring = header.indexOf('t.nav.monitoring.label');
    const projects = header.indexOf('t.nav.projects.label');
    expect(header).toContain('href={`${home}#${t.nav.monitoring.id}`}');
    expect(monitoring).toBeGreaterThan(services);
    expect(projects).toBeGreaterThan(monitoring);
  });

  it('hero: a link to the section (how phones reach it, with no header menu)', () => {
    expect(hero).toMatch(/<a href=\{`#\$\{t\.nav\.monitoring\.id\}`\}[^>]*>\s*\{t\.hero\.monitoringLink\}/);
    expect(hero).not.toMatch(/monitoringLink[^<]*<\/a>[\s\S]*hidden md:/);
  });

  it('footer: a link to the section that works from any page', () => {
    expect(footer).toContain("getRelativeLocaleUrl(locale, '/')}#${t.nav.monitoring.id}");
    expect(footer).toContain('{t.footer.monitoring}');
  });

  it('services: the monitoring card spans both columns and links to the section', () => {
    expect(services).toContain("group.id === 'monitoring' && 'md:col-span-2'");
    expect(services).toContain("group.id === 'monitoring' ? `#${t.nav.monitoring.id}` : `#${t.nav.contact.id}`");
    expect(services).toMatch(/monitoring:\s*\n?\s*'M14\.857/);
  });

  it('home page: the section comes right after Services', () => {
    expect(home.indexOf('<Monitoring />')).toBeGreaterThan(home.indexOf('<Services />'));
    expect(home.indexOf('<Projects />')).toBeGreaterThan(home.indexOf('<Monitoring />'));
  });
});

describe('monitoring section markup', () => {
  it('uses the nav id, so every link above lands on it', () => {
    expect(section).toContain('id={t.nav.monitoring.id}');
  });

  it('builds its FAQ from <details>/<summary>, readable without JS', () => {
    expect(section).toMatch(/<details[\s\S]*<summary[\s\S]*\{item\.question\}[\s\S]*\{item\.answer\}[\s\S]*<\/details>/);
  });

  it('lists the steps as an ordered list (announced with their numbers)', () => {
    expect(section).toMatch(/<ol[\s\S]*m\.steps\.map/);
  });

  it('links "Request a proposal" to the contact form with the service preselected, and offers Hércules', () => {
    expect(section).toContain("contactLinkFor(getRelativeLocaleUrl(locale, '/'), t.contact.service.param, 'weekend-holiday-monitoring', t.nav.contact.id)");
    expect(section).toContain('href={proposalHref}');
    expect(section).toMatch(/data-hercules-open hidden[\s\S]*\{m\.askHercules\}/);
  });

  it('has no hardcoded copy: every text node comes from the dictionary', () => {
    const markup = section.slice(section.indexOf('---', 3) + 3);
    // Only text with letters counts: "=> (" in .map() callbacks and the "+" toggle glyph are not copy.
    const textNodes = [...markup.matchAll(/>([^<>{}]+)</g)].map((m) => m[1].trim()).filter((s) => /\p{L}/u.test(s));
    expect(textNodes).toEqual([]);
  });
});

describe('contact form preselection', () => {
  it('passes the locale parameter to the select and applies preselectedService', () => {
    expect(contact).toContain('data-preselect-param={t.contact.service.param}');
    expect(contact).toContain('preselectedService(window.location.search');
  });
});
