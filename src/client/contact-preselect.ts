// Preselects a service in the contact form from the page address, e.g.
// /?servicio=weekend-holiday-monitoring#contacto (specs/weekend-monitoring). The link works without
// JS (it still lands on the form); with JS, the dropdown also shows the service.
import type { ServiceId } from '../constants/contact-services';

/**
 * The first value of `param` in `search` that is an exact, known service slug, or null.
 * Unknown, empty, differently-cased or hostile values select nothing; nothing here throws.
 */
export function preselectedService(search: string, param: string, allowed: readonly string[]): string | null {
  if (!param) return null;
  const values = new URLSearchParams(search).getAll(param);
  return values.find((value) => allowed.includes(value)) ?? null;
}

/**
 * Link that opens the contact form with `service` preselected (locale home + query + anchor).
 * `service` is a ServiceId, so renaming a catalogue slug is a type error here, not a link that
 * silently preselects nothing.
 */
export function contactLinkFor(home: string, param: string, service: ServiceId, contactId: string): string {
  return `${home}?${encodeURIComponent(param)}=${encodeURIComponent(service)}#${contactId}`;
}
