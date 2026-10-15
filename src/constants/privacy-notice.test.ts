import { describe, expect, it } from 'vitest';
import { strings } from './strings';

/** Paragraph blocks (strings) and list items (from string[] blocks) of a privacy section. */
type Section = { heading: string; blocks: (string | string[])[] };
const paragraphsOf = (s: Section) => s.blocks.filter((b): b is string => typeof b === 'string');
const itemsOf = (s: Section) => s.blocks.filter((b): b is string[] => Array.isArray(b)).flat();

const locales = ['es', 'en'] as const;

/**
 * Heuristic guard for the formal "usted" register. Flags unambiguous informal (tú) markers:
 * tú pronouns/possessives anywhere, -nos imperatives, and tú imperatives opening a string.
 */
const TU_MARKERS = /(?<![\p{L}])(tú|tu|tus|te|ti|contigo|cuéntanos|escríbenos|llámanos|contáctanos|platícanos)(?![\p{L}])/iu;
const TU_IMPERATIVE_OPENING = /^(agenda|indica|reserva|visita|descubre|elige|solicita|escribe|cuenta|llama)\s/iu;
const usesTu = (text: string) => TU_MARKERS.test(text) || TU_IMPERATIVE_OPENING.test(text);

describe('Privacy Notice (LFPDPPP Compliance)', () => {
  describe.each(locales)('locale "%s"', (locale) => {
    const p = strings[locale].privacy;

    it('has non-empty title, law reference, and update date', () => {
      expect(p.title.trim()).not.toBe('');
      expect(p.lawReference.trim()).not.toBe('');
      expect(p.updated.trim()).not.toBe('');
      expect(p.introduction.trim()).not.toBe('');
    });

    it('contains all 9 comprehensive sections', () => {
      expect(p.sections).toHaveLength(9);
      for (const [index, section] of p.sections.entries()) {
        expect(section.heading.trim()).not.toBe('');
        expect(section.heading).toMatch(new RegExp(`^${index + 1}\\.`));
        expect(paragraphsOf(section).length).toBeGreaterThan(0);
        for (const para of paragraphsOf(section)) {
          expect(para.trim()).not.toBe('');
        }
        expect(itemsOf(section).length).toBeGreaterThan(0);
        for (const item of itemsOf(section)) {
          expect(item.trim()).not.toBe('');
        }
      }
    });

    it('identifies HércuIT and physical address in Torreón, Coahuila', () => {
      const section1 = p.sections[0];
      const fullText = [section1.heading, ...paragraphsOf(section1), ...itemsOf(section1)].join(' ');
      expect(fullText).toContain('HércuIT, S. de R.L. de C.V.');
      expect(fullText).toContain('Torreón, Coahuila');
      expect(fullText).toContain('info@hercuit.com');
    });

    it('identifies categories of data and explicitly disclaims sensitive data', () => {
      const section2 = p.sections[1];
      const fullText = [section2.heading, ...paragraphsOf(section2), ...itemsOf(section2)].join(' ');
      if (locale === 'es') {
        expect(fullText).toMatch(/datos personales sensibles/i);
        expect(fullText).toMatch(/NO solicita, no recaba/i);
      } else {
        expect(fullText).toMatch(/sensitive/i);
        expect(fullText).toMatch(/does NOT request, collect/i);
      }
    });

    it('distinguishes primary and secondary purposes with opt-out mechanism', () => {
      const section3 = p.sections[2];
      const fullText = [section3.heading, ...paragraphsOf(section3), ...itemsOf(section3)].join(' ');
      if (locale === 'es') {
        expect(fullText).toMatch(/primarias o necesarias/i);
        expect(fullText).toMatch(/secundarias o voluntarias/i);
        expect(fullText).toMatch(/negativa para finalidades secundarias/i);
      } else {
        expect(fullText).toMatch(/primary or necessary/i);
        expect(fullText).toMatch(/secondary or voluntary/i);
        expect(fullText).toMatch(/refusal of secondary purposes/i);
      }
    });

    it('describes bot capture, no server database, and direct email reporting', () => {
      const section4 = p.sections[3];
      const fullText = [section4.heading, ...paragraphsOf(section4), ...itemsOf(section4)].join(' ');
      expect(fullText).toContain(locale === 'es' ? 'Hércules' : 'Hercules');
      expect(fullText).toContain('sessionStorage');
      expect(fullText).toContain('info@hercuit.com');
      if (locale === 'es') {
        expect(fullText).toMatch(/bases de datos/i);
        expect(fullText).toMatch(/correo electrónico/i);
      } else {
        expect(fullText).toMatch(/database/i);
        expect(fullText).toMatch(/email/i);
      }
    });

    it('provides options to limit use: internal exclusion list and REPEP', () => {
      const section5 = p.sections[4];
      const fullText = [section5.heading, ...paragraphsOf(section5), ...itemsOf(section5)].join(' ');
      expect(fullText).toContain('REPEP');
      expect(fullText).toContain('info@hercuit.com');
      if (locale === 'es') {
        expect(fullText).toMatch(/lista de exclusión/i);
      } else {
        expect(fullText).toMatch(/exclusion list/i);
      }
    });

    it('specifies ARCO rights, consent revocation, and 20/15 business day statutory timeframes', () => {
      const section6 = p.sections[5];
      const fullText = [section6.heading, ...paragraphsOf(section6), ...itemsOf(section6)].join(' ');
      expect(fullText).toContain('ARCO');
      expect(fullText).toContain('info@hercuit.com');
      expect(fullText).toMatch(/20/);
      expect(fullText).toMatch(/15/);
      if (locale === 'es') {
        expect(fullText).toMatch(/días hábiles/i);
        expect(fullText).toMatch(/revoc/i);
        expect(fullText).toMatch(/gratuito/i);
      } else {
        expect(fullText).toMatch(/business days/i);
        expect(fullText).toMatch(/revocation/i);
        expect(fullText).toMatch(/free of charge/i);
      }
    });

    it('discloses Cloudflare and Anthropic processors under LFPDPPP Article 37', () => {
      const section7 = p.sections[6];
      const fullText = [section7.heading, ...paragraphsOf(section7), ...itemsOf(section7)].join(' ');
      expect(fullText).toContain('Cloudflare');
      expect(fullText).toContain('Anthropic');
      expect(fullText).toMatch(/37/);
      if (locale === 'es') {
        expect(fullText).toMatch(/NO vende/i);
      } else {
        expect(fullText).toMatch(/does NOT sell/i);
      }
    });

    it('provides permanent URLs for privacy notice updates', () => {
      const section9 = p.sections[8];
      const fullText = [section9.heading, ...paragraphsOf(section9), ...itemsOf(section9)].join(' ');
      expect(fullText).toContain('https://hercuit.com/aviso-de-privacidad');
      expect(fullText).toContain('https://hercuit.com/en/privacy-notice');
    });

    it('includes alternative formats (simplified notice and short notice)', () => {
      const s = p.simplifiedNotice;
      expect(s.heading.trim()).not.toBe('');
      expect(s.subheading.trim()).not.toBe('');
      expect(s.paragraphs).toHaveLength(4);
      for (const para of s.paragraphs) {
        expect(para.trim()).not.toBe('');
      }
      const fullText = s.paragraphs.join(' ');
      expect(fullText).toContain('HércuIT, S. de R.L. de C.V.');
      expect(fullText).toContain('info@hercuit.com');
      expect(fullText).toContain('hercuit.com');
    });
  });

  describe('bilingual structural parity', () => {
    it('has exactly the same number of sections in Spanish and English', () => {
      expect(strings.en.privacy.sections.length).toBe(strings.es.privacy.sections.length);
    });

    it('has matching paragraph and item counts for each corresponding section', () => {
      for (let i = 0; i < strings.es.privacy.sections.length; i++) {
        const esSec = strings.es.privacy.sections[i];
        const enSec = strings.en.privacy.sections[i];
        expect(paragraphsOf(enSec).length).toBe(paragraphsOf(esSec).length);
        expect(itemsOf(enSec).length).toBe(itemsOf(esSec).length);
      }
    });

    it('has matching paragraph count in simplifiedNotice', () => {
      expect(strings.en.privacy.simplifiedNotice.paragraphs.length).toBe(strings.es.privacy.simplifiedNotice.paragraphs.length);
    });
  });

  describe('Spanish register and terminology', () => {
    it('strictly maintains formal "usted" register with no informal "tú" markers', () => {
      const p = strings.es.privacy;
      const allText = [
        p.title,
        p.lawReference,
        p.updated,
        p.introduction,
        ...p.sections.flatMap((s) => [s.heading, ...s.blocks.flat()]),
        p.simplifiedNotice.heading,
        p.simplifiedNotice.subheading,
        ...p.simplifiedNotice.paragraphs,
      ];

      const offenders = allText.filter(usesTu);
      expect(offenders).toEqual([]);
    });

    it('never mentions e-commerce or comercio electrónico', () => {
      const p = strings.es.privacy;
      const allText = [
        p.title,
        p.introduction,
        ...p.sections.flatMap((s) => [s.heading, ...s.blocks.flat()]),
        ...p.simplifiedNotice.paragraphs,
      ].join(' ');
      expect(allText).not.toMatch(/e-?commerce|comercio electr[oó]nico/i);
    });
  });
});

describe('privacy notice structure: lists follow their lead-ins, in order', () => {
  it.each(['es', 'en'] as const)('"%s": every paragraph ending in ":" is followed by its list (or by a nested lead-in)', (locale) => {
    const isLeadIn = (b: unknown): b is string => typeof b === 'string' && b.trimEnd().endsWith(':');
    for (const s of strings[locale].privacy.sections) {
      s.blocks.forEach((block, i) => {
        if (isLeadIn(block)) {
          // e.g. §3: "…distinguiendo…:" introduces two categories, each with its own lead-in and list.
          const next = s.blocks[i + 1];
          expect(Array.isArray(next) || isLeadIn(next), `${s.heading}: "${block.slice(-40)}" needs a list right after it`).toBe(true);
        }
      });
    }
  });

  it.each(['es', 'en'] as const)('"%s": every list comes right after a lead-in paragraph ending in ":"', (locale) => {
    for (const s of strings[locale].privacy.sections) {
      s.blocks.forEach((block, i) => {
        if (Array.isArray(block)) {
          const previous = s.blocks[i - 1];
          expect(typeof previous === 'string' && previous.trimEnd().endsWith(':'), `${s.heading}: list #${i} has no lead-in`).toBe(true);
          expect(block.length).toBeGreaterThan(0);
        }
      });
    }
  });

  it.each(['es', 'en'] as const)('"%s": §3 keeps primary and secondary purposes in two separate lists (LFPDPPP)', (locale) => {
    const s3 = strings[locale].privacy.sections[2];
    const lists = s3.blocks.filter((b): b is string[] => Array.isArray(b));
    expect(lists).toHaveLength(2);
    const [primaryLeadIn, secondaryLeadIn] = s3.blocks.filter((b, i) => typeof b === 'string' && Array.isArray(s3.blocks[i + 1])) as string[];
    expect(primaryLeadIn).toMatch(locale === 'es' ? /primarias o necesarias/i : /primary or necessary/i);
    expect(secondaryLeadIn).toMatch(locale === 'es' ? /secundarias o voluntarias/i : /secondary or voluntary/i);
  });

  it('has the same block layout (paragraph vs list, list sizes) in both languages', () => {
    const shape = (l: 'es' | 'en') =>
      strings[l].privacy.sections.map((s) => s.blocks.map((b) => (typeof b === 'string' ? 'p' : `ul${b.length}`)).join(' '));
    expect(shape('en')).toEqual(shape('es'));
  });
});

describe('privacy notice: leads are sent from info@hercuit.com to a Gmail inbox (specs/lead-email-routing)', () => {
  const textOf = (s: Section) => [s.heading, ...s.blocks.flat()].join(' ');

  it.each(locales)('"%s": §4 says the lead is sent from info@hercuit.com to the Gmail inbox', (locale) => {
    const s4 = textOf(strings[locale].privacy.sections[3]);
    expect(s4).toMatch(locale === 'es' ? /desde la dirección institucional info@hercuit\.com/ : /from the corporate address info@hercuit\.com/);
    expect(s4).toContain('Gmail (Google LLC)');
    // The old wording named info@hercuit.com as the destination.
    expect(s4).not.toMatch(locale === 'es' ? /hacia info@hercuit\.com/ : /to info@hercuit\.com upon/);
  });

  it.each(locales)('"%s": §7 lists Google LLC (Gmail) as a processor, next to Cloudflare and Anthropic', (locale) => {
    const items = itemsOf(strings[locale].privacy.sections[6]);
    expect(items).toHaveLength(3);
    const providers = items.map((i) => i.match(/\((Cloudflare|Anthropic|Google)[^)]*\)/)?.[1]);
    expect([...providers].sort()).toEqual(['Anthropic', 'Cloudflare', 'Google']);
    expect(items[providers.indexOf('Google')]).toMatch(/Gmail/);
  });

  it.each(locales)('"%s": the simplified notice names the Gmail inbox, and info@hercuit.com stays the ARCO channel', (locale) => {
    const notice = strings[locale].privacy.simplifiedNotice.paragraphs.join(' ');
    expect(notice).toContain('Gmail (Google LLC)');
    expect(notice).toMatch(locale === 'es' ? /derechos ARCO enviando un correo a info@hercuit\.com/ : /ARCO rights by emailing info@hercuit\.com/);
  });

  it.each(locales)('"%s": never mentions the Gmail address itself (contact stays info@hercuit.com)', (locale) => {
    const p = strings[locale].privacy;
    const all = [p.introduction, ...p.sections.map(textOf), ...p.simplifiedNotice.paragraphs].join(' ');
    expect(all).not.toContain('hercuitmx@gmail.com');
  });
});

const MONTHS = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** Reads "Última actualización: 15 de octubre de 2026" / "Last updated: October 15, 2026" as YYYY-MM-DD, or null. */
function parseUpdated(locale: 'es' | 'en', text: string): string | null {
  const m =
    locale === 'es'
      ? /^Última actualización: (\d{1,2}) de (\p{L}+) de (\d{4})$/u.exec(text)
      : /^Last updated: (\p{L}+) (\d{1,2}), (\d{4})$/u.exec(text);
  if (!m) return null;
  const [day, month, year] = locale === 'es' ? [m[1], m[2], m[3]] : [m[2], m[1], m[3]];
  const monthIndex = MONTHS[locale].indexOf(month);
  const d = Number(day);
  if (monthIndex === -1 || d < 1) return null;
  const date = new Date(Date.UTC(Number(year), monthIndex, d));
  if (date.getUTCMonth() !== monthIndex) return null; // e.g. 31 de febrero
  return date.toISOString().slice(0, 10);
}

describe('parseUpdated', () => {
  it.each([
    ['es', 'Última actualización: 15 de octubre de 2026', '2026-10-15'],
    ['en', 'Last updated: October 15, 2026', '2026-10-15'],
    ['es', 'Última actualización: 1 de enero de 2027', '2027-01-01'],
    ['en', 'Last updated: December 31, 2026', '2026-12-31'],
  ] as const)('reads %s "%s"', (locale, text, expected) => {
    expect(parseUpdated(locale, text)).toBe(expected);
  });

  it.each([
    ['es', ''],
    ['es', 'Última actualización: 31 de febrero de 2026'],
    ['es', 'Última actualización: 15 de octobre de 2026'],
    ['es', 'Ultima actualizacion: 15 de octubre de 2026'],
    ['en', 'Last updated: 15 October 2026'],
    ['en', 'Last updated: Octember 15, 2026'],
    ['en', 'Last updated: October 0, 2026'],
  ] as const)('rejects %s %j', (locale, text) => {
    expect(parseUpdated(locale, text)).toBeNull();
  });
});

describe('privacy notice "last updated" date', () => {
  it('is a valid date in both locales, and the same date', () => {
    const es = parseUpdated('es', strings.es.privacy.updated);
    const en = parseUpdated('en', strings.en.privacy.updated);
    expect(es).not.toBeNull();
    expect(en).toBe(es);
  });

  it('reflects the Gmail delivery and Google processor change (15 October 2026 or later)', () => {
    expect(parseUpdated('es', strings.es.privacy.updated)! >= '2026-10-15').toBe(true);
  });
});
