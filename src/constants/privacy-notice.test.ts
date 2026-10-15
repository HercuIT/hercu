import { describe, expect, it } from 'vitest';
import { strings } from './strings';

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
        expect(section.paragraphs.length).toBeGreaterThan(0);
        for (const para of section.paragraphs) {
          expect(para.trim()).not.toBe('');
        }
        expect(section.items.length).toBeGreaterThan(0);
        for (const item of section.items) {
          expect(item.trim()).not.toBe('');
        }
      }
    });

    it('identifies HércuIT and physical address in Torreón, Coahuila', () => {
      const section1 = p.sections[0];
      const fullText = [section1.heading, ...section1.paragraphs, ...section1.items].join(' ');
      expect(fullText).toContain('HércuIT, S. de R.L. de C.V.');
      expect(fullText).toContain('Torreón, Coahuila');
      expect(fullText).toContain('info@hercuit.com');
    });

    it('identifies categories of data and explicitly disclaims sensitive data', () => {
      const section2 = p.sections[1];
      const fullText = [section2.heading, ...section2.paragraphs, ...section2.items].join(' ');
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
      const fullText = [section3.heading, ...section3.paragraphs, ...section3.items].join(' ');
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
      const fullText = [section4.heading, ...section4.paragraphs, ...section4.items].join(' ');
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
      const fullText = [section5.heading, ...section5.paragraphs, ...section5.items].join(' ');
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
      const fullText = [section6.heading, ...section6.paragraphs, ...section6.items].join(' ');
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
      const fullText = [section7.heading, ...section7.paragraphs, ...section7.items].join(' ');
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
      const fullText = [section9.heading, ...section9.paragraphs, ...section9.items].join(' ');
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
        expect(enSec.paragraphs.length).toBe(esSec.paragraphs.length);
        expect(enSec.items.length).toBe(esSec.items.length);
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
        ...p.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...s.items]),
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
        ...p.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...s.items]),
        ...p.simplifiedNotice.paragraphs,
      ].join(' ');
      expect(allText).not.toMatch(/e-?commerce|comercio electr[oó]nico/i);
    });
  });
});
