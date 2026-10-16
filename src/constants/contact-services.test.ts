import { describe, expect, it } from 'vitest';
import { buildServiceOptions, serviceGroups, serviceIds, type ServiceLabels } from './contact-services';
import { strings } from './strings';

const allServiceIds = serviceGroups.flatMap((group) => [...group.services]);
const locales = ['es', 'en'] as const;

describe('serviceGroups catalogue', () => {
  it('has the 5 groups in display order', () => {
    expect(serviceGroups.map((g) => g.id)).toEqual(['ai', 'qa', 'development', 'training', 'monitoring']);
  });

  // Slugs are the values the form submits, so they are a contract with any backend or report.
  // Renaming, removing or adding one must be a deliberate change to this list.
  it('submits exactly these service values, grouped and ordered', () => {
    expect(Object.fromEntries(serviceGroups.map((g) => [g.id, [...g.services]]))).toEqual({
      ai: ['ai-consultancy', 'ai-architecture', 'ai-bot', 'ai-whatsapp-automation', 'ai-data-reports'],
      qa: ['qa-web-app', 'qa-mobile-app', 'qa-ai-automation', 'qa-ai-generated-app'],
      development: ['new-app', 'app-like-binkleaner'],
      training: ['ai-training', 'qa-training', 'other-training', 'remote-team-building'],
      monitoring: ['weekend-holiday-monitoring'],
    });
  });

  it('contains exactly the 16 offered services', () => {
    expect(allServiceIds).toHaveLength(16);
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

  it('keeps the "WhatsApp Business" brand name untranslated', () => {
    const label = groups.flatMap((g) => g.options).find((o) => o.value === 'ai-whatsapp-automation')?.label;
    expect(label).toContain('WhatsApp Business');
  });

  it('lists WhatsApp automation in the AI area, right after the AI bot', () => {
    const ai = groups.find((g) => g.id === 'ai')?.options.map((o) => o.value) ?? [];
    expect(ai.indexOf('ai-whatsapp-automation')).toBe(ai.indexOf('ai-bot') + 1);
  });

  it('offers AI data extraction with automated Excel/CSV reports and dashboards, last in the AI area', () => {
    const ai = groups.find((g) => g.id === 'ai')?.options ?? [];
    expect(ai.at(-1)?.value).toBe('ai-data-reports');
    const label = ai.at(-1)?.label ?? '';
    expect(label).toContain('Excel');
    expect(label).toContain('CSV');
    expect(label).toMatch(/dashboards/i);
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
    expect(rendered).toHaveLength(allServiceIds.length);
  });

  it('accepts very long labels unchanged', () => {
    const labels = valid();
    const long = 'A'.repeat(500);
    labels.options['ai-bot'] = long;
    const option = buildServiceOptions(labels).flatMap((g) => g.options).find((o) => o.value === 'ai-bot');
    expect(option?.label).toBe(long);
  });
});

describe('serviceIds', () => {
  it('lists every catalogue slug in order', () => {
    expect([...serviceIds]).toEqual(serviceGroups.flatMap((g) => [...g.services]));
  });

  it('is frozen, so no consumer can mutate the shared list', () => {
    expect(Object.isFrozen(serviceIds)).toBe(true);
    expect(() => (serviceIds as string[]).push('ecommerce')).toThrow(TypeError);
  });
});

describe('weekend and holiday monitoring (specs/weekend-monitoring)', () => {
  it.each(locales)('"%s": labels the area and the service', (locale) => {
    const groups = buildServiceOptions(strings[locale].contact.service);
    const monitoring = groups.find((g) => g.id === 'monitoring');
    expect(monitoring?.label).toBe(locale === 'es' ? 'Monitoreo y soporte' : 'Monitoring and support');
    expect(monitoring?.options).toEqual([
      {
        value: 'weekend-holiday-monitoring',
        label: locale === 'es' ? 'Monitoreo de sistemas en fines de semana y días festivos' : 'Weekend and Holiday System Monitoring',
      },
    ]);
  });

  it('throws when the new area or service label is missing or blank', () => {
    const base = strings.es.contact.service;
    expect(() => buildServiceOptions({ ...base, groups: { ...base.groups, monitoring: '' } })).toThrow(/group label for "monitoring"/);
    expect(() => buildServiceOptions({ ...base, options: { ...base.options, 'weekend-holiday-monitoring': '  ' } })).toThrow(
      /service label for "weekend-holiday-monitoring"/,
    );
  });

  it('lists the new slug last, after the training services', () => {
    expect(serviceIds.at(-1)).toBe('weekend-holiday-monitoring');
  });
});
