import { describe, expect, it } from 'vitest';
import { buildServiceOptions, serviceGroups, type ServiceLabels } from './contact-services';
import { strings } from './strings';

const allServiceIds = serviceGroups.flatMap((group) => [...group.services]);
const locales = ['es', 'en'] as const;

describe('serviceGroups catalogue', () => {
  it('has the 4 groups in display order', () => {
    expect(serviceGroups.map((g) => g.id)).toEqual(['ai', 'qa', 'development', 'training']);
  });

  it('contains exactly the 13 requested services', () => {
    expect(allServiceIds).toHaveLength(13);
  });

  it('never repeats a service slug across groups', () => {
    expect(new Set(allServiceIds).size).toBe(allServiceIds.length);
  });

  it('uses lowercase ASCII kebab-case slugs (stable form values)', () => {
    for (const id of allServiceIds) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('has no empty group', () => {
    for (const group of serviceGroups) {
      expect(group.services.length).toBeGreaterThan(0);
    }
  });
});

describe.each(locales)('buildServiceOptions with the "%s" dictionary', (locale) => {
  const groups = buildServiceOptions(strings[locale].contact.service);

  it('preserves catalogue order for groups and options', () => {
    expect(groups.map((g) => g.id)).toEqual(serviceGroups.map((g) => g.id));
    expect(groups.flatMap((g) => g.options.map((o) => o.value))).toEqual(allServiceIds);
  });

  it('gives every group and option a non-blank label', () => {
    for (const group of groups) {
      expect(group.label.trim()).not.toBe('');
      for (const option of group.options) {
        expect(option.label.trim()).not.toBe('');
      }
    }
  });

  it('never falls back to showing the raw slug as a label', () => {
    for (const option of groups.flatMap((g) => g.options)) {
      expect(option.label).not.toBe(option.value);
    }
  });

  it('keeps product names untranslated', () => {
    const label = groups.flatMap((g) => g.options).find((o) => o.value === 'app-like-binkleaner')?.label;
    expect(label).toContain('BinKleaner');
    expect(label).toContain('Nopalito Limpio');
  });

  it('has unique option labels (no two services read the same)', () => {
    const labels = groups.flatMap((g) => g.options.map((o) => o.label));
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('buildServiceOptions across locales', () => {
  it('produces identical submitted values in Spanish and English', () => {
    const values = (locale: (typeof locales)[number]) =>
      buildServiceOptions(strings[locale].contact.service).flatMap((g) => g.options.map((o) => o.value));
    expect(values('es')).toEqual(values('en'));
  });

  it('actually translates the labels (Spanish differs from English)', () => {
    expect(strings.es.contact.service.options['ai-training']).not.toBe(strings.en.contact.service.options['ai-training']);
  });

  it('preserves accented characters in Spanish labels', () => {
    const es = buildServiceOptions(strings.es.contact.service);
    const all = es.flatMap((g) => [g.label, ...g.options.map((o) => o.label)]).join(' ');
    expect(all).toContain('Capacitación');
    expect(all).toContain('móviles');
  });
});

describe('buildServiceOptions with broken labels (negative cases)', () => {
  const valid = (): ServiceLabels => structuredClone(strings.en.contact.service);

  it('throws when a service label is missing', () => {
    const labels = valid();
    delete (labels.options as Partial<ServiceLabels['options']>)['ai-bot'];
    expect(() => buildServiceOptions(labels)).toThrow('Missing service label for "ai-bot"');
  });

  it('throws when a group label is missing', () => {
    const labels = valid();
    delete (labels.groups as Partial<ServiceLabels['groups']>).qa;
    expect(() => buildServiceOptions(labels)).toThrow('Missing group label for "qa"');
  });

  it('throws on an empty-string label', () => {
    const labels = valid();
    labels.options['new-app'] = '';
    expect(() => buildServiceOptions(labels)).toThrow('Missing service label for "new-app"');
  });

  it('throws on a whitespace-only label', () => {
    const labels = valid();
    labels.groups.training = '   ';
    expect(() => buildServiceOptions(labels)).toThrow('Missing group label for "training"');
  });

  it('ignores labels for unknown slugs instead of rendering them', () => {
    const labels = valid() as ServiceLabels & { options: Record<string, string> };
    labels.options['not-a-service'] = 'Ghost';
    const rendered = buildServiceOptions(labels).flatMap((g) => g.options.map((o) => o.value));
    expect(rendered).not.toContain('not-a-service');
    expect(rendered).toHaveLength(13);
  });

  it('accepts very long labels unchanged', () => {
    const labels = valid();
    const long = 'A'.repeat(500);
    labels.options['ai-bot'] = long;
    const option = buildServiceOptions(labels).flatMap((g) => g.options).find((o) => o.value === 'ai-bot');
    expect(option?.label).toBe(long);
  });
});
