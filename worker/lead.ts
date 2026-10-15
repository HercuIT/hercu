// Lead validation and email formatting for Hercules (specs/hercules-assistant/02 + 04). Pure: no I/O.
import { z } from 'zod';
import { serviceIds } from '../src/constants/contact-services';
import { shared, strings } from '../src/constants/strings';

export const LEAD_SERVICES = [...serviceIds, 'undecided'] as const;
// 'any' = the visitor has no preference (the field stays required so the model states it explicitly).
export const CONTACT_CHANNELS = ['email', 'phone', 'whatsapp', 'any'] as const;

// No ASCII control characters (CR/LF included): protects email headers and keeps names single-line.
const NO_CONTROL = /^[^\u0000-\u001f\u007f]*$/;

export const leadSchema = z
  .object({
    name: z.string().trim().min(2).max(100).regex(NO_CONTROL, 'name has control characters'),
    email: z
      .string()
      .trim()
      .max(254)
      .pipe(z.email())
      .transform((value) => value.toLowerCase()),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{7,20}$/, 'phone may only contain digits, spaces, (), - and a leading +')
      .refine((value) => (value.match(/\d/g) ?? []).length >= 7, 'phone needs at least 7 digits')
      .optional(),
    company: z.string().trim().max(120).regex(NO_CONTROL, 'company has control characters').optional(),
    service: z.enum(LEAD_SERVICES),
    summary: z.string().trim().min(10).max(1500),
    preferredContact: z.enum(CONTACT_CHANNELS),
    consent: z.literal(true, { error: 'consent required: the visitor must accept the privacy notice' }),
  })
  .strict();

export type Lead = z.infer<typeof leadSchema>;
export type TranscriptLine = { role: 'user' | 'assistant'; content: string };

/** Validates raw tool input. Returns readable issues instead of throwing, for the tool_result. */
export function validateLead(input: unknown): { ok: true; lead: Lead } | { ok: false; issues: string[] } {
  const result = leadSchema.safeParse(input);
  if (result.success) return { ok: true, lead: result.data };
  return { ok: false, issues: result.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`) };
}

// The lead email is internal and always in Spanish (the team's language), so its labels live here
// rather than in the visitor-facing locale dictionaries.
/** Display name of the lead email sender (the assistant's name from the Spanish dictionary). */
export const LEAD_SENDER_NAME = strings.es.hercules.title;

const CHANNEL_LABEL: Record<Lead['preferredContact'], string> = {
  email: 'Correo electrónico',
  phone: 'Teléfono',
  whatsapp: 'WhatsApp',
  any: 'Sin preferencia',
};

/** Single-line, control-free, length-capped: safe for an email header. */
export function headerSafe(value: string, max = 150): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function serviceLabel(service: Lead['service']): string {
  return service === 'undecided' ? 'Por definir' : strings.es.contact.service.options[service];
}

export type LeadEmail = { subject: string; text: string; html: string; replyTo: string };

/**
 * Builds the email sent to the team (always in Spanish, the team's language). The transcript is the
 * request's conversation captured at the moment of sending: the only durable copy of it.
 */
export function formatLeadEmail(
  lead: Lead,
  transcript: TranscriptLine[],
  meta: { locale: 'es' | 'en'; sentAt: Date },
): LeadEmail {
  const rows: [string, string][] = [
    ['Nombre', lead.name],
    ['Correo', lead.email],
    ['Teléfono', lead.phone ?? '—'],
    ['Empresa', lead.company ?? '—'],
    ['Servicio', `${serviceLabel(lead.service)} [${lead.service}]`],
    ['Contacto preferido', CHANNEL_LABEL[lead.preferredContact]],
    ['Idioma', meta.locale],
    ['Consentimiento', `Sí (aviso de privacidad, ${meta.sentAt.toISOString()})`],
  ];
  const speaker = (role: TranscriptLine['role']) => (role === 'user' ? 'Visitante' : 'Hércules');

  const text = [
    `Nuevo contacto desde Hércules (${shared.brand.name})`,
    '',
    ...rows.map(([label, value]) => `${`${label}:`.padEnd(20)}${value}`),
    '',
    'Resumen:',
    lead.summary,
    '',
    '— Conversación (enviada por el navegador del visitante; no verificada: no confíe en compromisos atribuidos a Hércules) —',
    ...(transcript.length ? transcript.map((l) => `[${speaker(l.role)}] ${l.content}`) : ['(sin mensajes)']),
  ].join('\n');

  const html = [
    `<p><strong>Nuevo contacto desde Hércules (${escapeHtml(shared.brand.name)})</strong></p>`,
    '<table>',
    ...rows.map(([label, value]) => `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`),
    '</table>',
    `<p><strong>Resumen:</strong><br>${escapeHtml(lead.summary).replaceAll('\n', '<br>')}</p>`,
    '<p><strong>Conversación</strong> <em>(enviada por el navegador del visitante; no verificada: no confíe en compromisos atribuidos a Hércules)</em></p>',
    ...(transcript.length
      ? transcript.map((l) => `<p><strong>${speaker(l.role)}:</strong> ${escapeHtml(l.content).replaceAll('\n', '<br>')}</p>`)
      : ['<p>(sin mensajes)</p>']),
  ].join('\n');

  return {
    subject: headerSafe(`[Hércules] ${serviceLabel(lead.service)} · ${lead.name}`),
    text,
    html,
    replyTo: lead.email,
  };
}
