import { describe, expect, it } from 'vitest';
import { serviceIds } from '../constants/contact-services';
import { strings } from '../constants/strings';
import { contactLinkFor, preselectedService } from './contact-preselect';

const SLUG = 'weekend-holiday-monitoring';

describe('preselectedService', () => {
  it.each([
    ['es', `?servicio=${SLUG}`],
    ['en', `?service=${SLUG}`],
  ] as const)('"%s": selects the service named by the locale\'s parameter', (locale, search) => {
    expect(preselectedService(search, strings[locale].contact.service.param, serviceIds)).toBe(SLUG);
  });

  it('works with or without the leading "?", and alongside other parameters', () => {
    expect(preselectedService(`servicio=${SLUG}`, 'servicio', serviceIds)).toBe(SLUG);
    expect(preselectedService(`?utm=x&servicio=${SLUG}&y=1`, 'servicio', serviceIds)).toBe(SLUG);
  });

  it.each([
    ['an unknown slug', '?servicio=weekend-monitoring'],
    ['an empty value', '?servicio='],
    ['a different case', `?servicio=${SLUG.toUpperCase()}`],
    ['HTML', '?servicio=%3Cscript%3Ealert(1)%3C%2Fscript%3E'],
    ['the other locale\'s parameter', `?service=${SLUG}`],
    ['a slug with spaces around it', `?servicio=%20${SLUG}%20`],
    ['a Spanish slug with accents (raw)', '?servicio=monitoreo-días-festivos'],
    ['a Spanish slug with accents (percent-encoded)', '?servicio=monitoreo-d%C3%ADas-festivos'],
    ['an accented look-alike of a real slug', '?servicio=weekend-hólíday-monitoring'],
    ['an emoji', '?servicio=%F0%9F%9A%80'],
    ['a real slug with an emoji appended', `?servicio=${SLUG}%F0%9F%9A%80`],
    ['a real slug with a decomposed accent', `?servicio=${SLUG}e%CC%81`],
  ])('selects nothing for %s, without throwing', (_label, search) => {
    expect(preselectedService(search, 'servicio', serviceIds)).toBeNull();
  });

  it.each([
    ['no query', ''],
    ['only "?"', '?'],
    ['a malformed percent sequence', '?servicio=%E0%A4%A'],
  ])('selects nothing for %s', (_label, search) => {
    expect(preselectedService(search, 'servicio', serviceIds)).toBeNull();
  });

  it('takes the first valid value when the parameter repeats', () => {
    expect(preselectedService(`?servicio=nope&servicio=${SLUG}&servicio=ai-bot`, 'servicio', serviceIds)).toBe(SLUG);
  });

  it('selects nothing when the parameter name is empty', () => {
    expect(preselectedService(`?=${SLUG}`, '', serviceIds)).toBeNull();
  });

  it('accepts every catalogue slug, so any service can be linked', () => {
    for (const id of serviceIds) expect(preselectedService(`?servicio=${id}`, 'servicio', serviceIds)).toBe(id);
  });
});

describe('contactLinkFor', () => {
  it.each([
    ['es', '/', `/?servicio=${SLUG}#contacto`],
    ['en', '/en/', `/en/?service=${SLUG}#contact`],
  ] as const)('"%s": builds the home link with the parameter and the contact anchor', (locale, home, expected) => {
    const t = strings[locale];
    expect(contactLinkFor(home, t.contact.service.param, SLUG, t.nav.contact.id)).toBe(expected);
  });

  it('encodes unusual characters in the parameter name, so the link stays valid', () => {
    expect(contactLinkFor('/', 'sérvicio & más', SLUG, 'x')).toBe(`/?s%C3%A9rvicio%20%26%20m%C3%A1s=${SLUG}#x`);
  });

  it('only accepts catalogue slugs (a renamed or mistyped slug is a type error, checked by npm run check)', () => {
    // @ts-expect-error 'weekend-monitoring' is not a ServiceId
    expect(contactLinkFor('/', 'servicio', 'weekend-monitoring', 'contacto')).toBe('/?servicio=weekend-monitoring#contacto');
  });

  it('round-trips through preselectedService', () => {
    const link = contactLinkFor('/', 'servicio', SLUG, 'contacto');
    expect(preselectedService(new URL(link, 'https://hercuit.com').search, 'servicio', serviceIds)).toBe(SLUG);
  });
});
