// Service catalogue for the contact form dropdown. IDs and grouping are configuration, not copy:
// labels live in the locale dictionaries (`contact.service.groups` / `contact.service.options`).
// Values are stable, locale-independent slugs so submissions are identical in every language.
export const serviceGroups = [
  { id: 'ai', services: ['ai-consultancy', 'ai-architecture', 'ai-bot'] },
  { id: 'qa', services: ['qa-web-app', 'qa-mobile-app', 'qa-ai-automation', 'qa-ai-generated-app'] },
  { id: 'development', services: ['new-app', 'app-like-binkleaner'] },
  { id: 'training', services: ['ai-training', 'qa-training', 'other-training', 'remote-team-building'] },
] as const;

export type ServiceGroupId = (typeof serviceGroups)[number]['id'];
export type ServiceId = (typeof serviceGroups)[number]['services'][number];

export type ServiceLabels = {
  groups: Record<ServiceGroupId, string>;
  options: Record<ServiceId, string>;
};

export type ServiceOptionGroup = {
  id: ServiceGroupId;
  label: string;
  options: { value: ServiceId; label: string }[];
};

function requireLabel(label: string | undefined, kind: 'group' | 'service', id: string): string {
  if (typeof label !== 'string' || label.trim() === '') {
    throw new Error(`Missing ${kind} label for "${id}"`);
  }
  return label;
}

/**
 * Resolves the catalogue against a locale's labels, preserving catalogue order.
 * Throws on a missing or blank label so a broken dictionary fails the build
 * instead of rendering an empty option.
 */
export function buildServiceOptions(labels: ServiceLabels): ServiceOptionGroup[] {
  return serviceGroups.map((group) => ({
    id: group.id,
    label: requireLabel(labels.groups[group.id], 'group', group.id),
    options: group.services.map((value) => ({
      value,
      label: requireLabel(labels.options[value], 'service', value),
    })),
  }));
}
