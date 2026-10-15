// WhatsApp click-to-chat links (specs/whatsapp-contact).

/** E.164: "+" then 8 to 15 digits, nothing else. */
const E164 = /^\+(\d{8,15})$/;

/**
 * Click-to-chat link: https://wa.me/<digits>?text=<encoded message>.
 * Throws on a number that isn't E.164, so a bad number fails the build instead of shipping a
 * broken link. A blank message adds no `?text=`.
 */
export function whatsappHref(e164: string, message?: string): string {
  const digits = E164.exec(e164)?.[1];
  if (!digits) throw new Error(`Not an E.164 phone number: "${e164}"`);
  const base = `https://wa.me/${digits}`;
  return message?.trim() ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Screen-reader label for a WhatsApp link: "<prefix> <number> <suffix>", e.g. "Escríbanos por
 * WhatsApp al +52 33 1713 3469 (se abre en una pestaña nueva)". Blank parts are left out, so a
 * missing suffix never leaves a trailing space.
 */
export function whatsappAriaLabel(aria: { prefix: string; suffix: string }, phoneDisplay: string): string {
  return [aria.prefix, phoneDisplay, aria.suffix].map((part) => part.trim()).filter(Boolean).join(' ');
}
