import { describe, expect, it } from 'vitest';
import { chatToPlainText, parseChatText, parseInline, type Block } from './chat-format';

const plain = (text: string) => ({ text, bold: false });
const bold = (text: string) => ({ text, bold: true });
/** Every character the visitor would see, in order. */
const visible = (blocks: Block[]) =>
  blocks.flatMap((b) => (b.kind === 'list' ? b.items : b.lines)).flatMap((line) => line.map((p) => p.text)).join('|');

// The reply from the bug report (specs/hercules-chat-formatting).
const REPORTED = [
  '- **Inteligencia artificial:** consultoría en IA, arquitectura de soluciones con IA, bots con IA y automatización de WhatsApp Business con IA.',
  '- **Calidad de software (QA), nuestra especialidad:** pruebas y automatización para apps web, móviles y generadas con IA, para que lleguen a producción sin sorpresas.',
  '- **Desarrollo:** creamos su aplicación desde cero o adaptamos a su negocio una plataforma de reservas probada, como BinKleaner o Nopalito Limpio.',
  '- **Capacitación y equipos:** capacitación práctica en IA y QA, y team building para equipos remotos.',
].join('\n');

describe('parseChatText: happy path', () => {
  it('turns the reported reply into one list of 4 items, each with a bold label and no asterisks left', () => {
    const blocks = parseChatText(REPORTED);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe('list');
    const items = (blocks[0] as Extract<Block, { kind: 'list' }>).items;
    expect(items).toHaveLength(4);
    expect(items.map((item) => item[0])).toEqual([
      bold('Inteligencia artificial:'),
      bold('Calidad de software (QA), nuestra especialidad:'),
      bold('Desarrollo:'),
      bold('Capacitación y equipos:'),
    ]);
    expect(items[3][1]).toEqual(plain(' capacitación práctica en IA y QA, y team building para equipos remotos.'));
    expect(visible(blocks)).not.toContain('*');
  });

  it.each([
    ['**', 'Ofrecemos **QA** y más'],
    ['__', 'Ofrecemos __QA__ y más'],
  ])('reads %s as bold mid-sentence', (_d, text) => {
    expect(parseInline(text)).toEqual([plain('Ofrecemos '), bold('QA'), plain(' y más')]);
  });

  it.each(['- ', '* ', '• ', '1. ', '1) ', '12. '])('reads "%s" items as one bullet list', (marker) => {
    const blocks = parseChatText(`${marker}uno\n${marker}dos`);
    expect(blocks).toEqual([{ kind: 'list', items: [[plain('uno')], [plain('dos')]] }]);
  });

  it('keeps paragraph, list, paragraph in order, split by blank lines', () => {
    expect(parseChatText('Hola.\n\n- a\n- b\n\nAdiós.')).toEqual([
      { kind: 'paragraph', lines: [[plain('Hola.')]] },
      { kind: 'list', items: [[plain('a')], [plain('b')]] },
      { kind: 'paragraph', lines: [[plain('Adiós.')]] },
    ]);
  });

  it('starts a list right after a paragraph line, without a blank line', () => {
    expect(parseChatText('Servicios:\n- QA')).toEqual([
      { kind: 'paragraph', lines: [[plain('Servicios:')]] },
      { kind: 'list', items: [[plain('QA')]] },
    ]);
  });

  it('keeps a single line break as two lines of the same paragraph', () => {
    expect(parseChatText('Línea uno\nLínea dos')).toEqual([{ kind: 'paragraph', lines: [[plain('Línea uno')], [plain('Línea dos')]] }]);
  });
});

describe('parseChatText: left as plain text (negative)', () => {
  it.each(['2*3*4', 'C*', 'a * b', '**', '****', 'snake_case_name', 'precio: 5 * 3 = 15'])('shows %j exactly as written', (text) => {
    expect(parseChatText(text)).toEqual([{ kind: 'paragraph', lines: [[plain(text)]] }]);
  });

  it.each(['<b>hola</b>', '<script>alert(1)</script>', '&amp; &lt;', '<img src=x onerror=alert(1)>'])('keeps HTML %j as literal text', (text) => {
    expect(visible(parseChatText(text))).toBe(text);
  });

  it('keeps only the label of a link, never the URL', () => {
    const blocks = parseChatText('Pague en [Pague aquí](https://evil.example/pay?x=(1)) hoy');
    expect(visible(blocks)).toBe('Pague en Pague aquí hoy');
    expect(JSON.stringify(blocks)).not.toContain('evil.example');
  });

  it('turns a heading into a bold line without "#"', () => {
    expect(parseChatText('## Nuestros servicios')).toEqual([{ kind: 'paragraph', lines: [[bold('Nuestros servicios')]] }]);
  });

  it.each([
    ['inline code', 'Use `npm test` aquí', 'Use npm test aquí'],
    ['*italics*', 'Es *muy* rápido', 'Es muy rápido'],
    ['_italics_', 'Es _muy_ rápido', 'Es muy rápido'],
    ['a quote', '> Una cita', 'Una cita'],
  ])('removes the markers of %s', (_label, text, expected) => {
    expect(visible(parseChatText(text))).toBe(expected);
  });

  it('reads a table as plain rows, without pipes or the separator row', () => {
    expect(visible(parseChatText('| Servicio | Área |\n|---|---|\n| QA | Calidad |'))).toBe('Servicio · Área|QA · Calidad');
  });

  it.each(['-', '- ', '*', '1.'])('does not make an empty list item from %j', (text) => {
    expect(parseChatText(text).some((b) => b.kind === 'list')).toBe(false);
  });

  it('reads "---" as a paragraph break, not text', () => {
    expect(parseChatText('Uno\n---\nDos')).toEqual([
      { kind: 'paragraph', lines: [[plain('Uno')]] },
      { kind: 'paragraph', lines: [[plain('Dos')]] },
    ]);
  });
});

describe('parseChatText: edge cases', () => {
  it('shows an unclosed ** literally mid-stream, and bold once it closes', () => {
    expect(parseInline('- **Capacita')).toEqual([plain('- **Capacita')]);
    expect(parseChatText('- **Capacita')).toEqual([{ kind: 'list', items: [[plain('**Capacita')]] }]);
    expect(parseChatText('- **Capacitación:** sí')).toEqual([{ kind: 'list', items: [[bold('Capacitación:'), plain(' sí')]] }]);
  });

  it('does not bold when the markers touch spaces (** a ** stays literal)', () => {
    expect(parseInline('a ** b ** c')).toEqual([plain('a ** b ** c')]);
  });

  it('keeps accents, ñ, ¿¡ and emoji inside and next to bold', () => {
    expect(parseInline('¡Listo! **¿Qué sigue? 🚀** Señal')).toEqual([plain('¡Listo! '), bold('¿Qué sigue? 🚀'), plain(' Señal')]);
  });

  it.each(['', '   ', '\n\n', '\r\n \r\n'])('gives no blocks for %j', (text) => {
    expect(parseChatText(text)).toEqual([]);
  });

  it('treats \\r\\n like \\n', () => {
    expect(parseChatText('- a\r\n- b')).toEqual(parseChatText('- a\n- b'));
  });

  it('parses a very long reply and 10,000 asterisks in linear time', () => {
    const long = Array.from({ length: 400 }, (_, i) => `- **Punto ${i}:** texto de prueba con acentos y ñ.`).join('\n');
    const stars = '*'.repeat(10_000);
    const start = performance.now();
    expect((parseChatText(long)[0] as Extract<Block, { kind: 'list' }>).items).toHaveLength(400);
    expect(visible(parseChatText(stars))).toBe(stars);
    expect(visible(parseChatText(`a${'_'.repeat(10_000)}b`))).toBe(`a${'_'.repeat(10_000)}b`);
    expect(performance.now() - start).toBeLessThan(50);
  });

  it('gives the same structure for the same layout in Spanish and English', () => {
    const shape = (blocks: Block[]) => blocks.map((b) => (b.kind === 'list' ? `ul${b.items.length}` : `p${b.lines.length}`));
    const es = parseChatText('Ofrecemos:\n- **QA:** pruebas\n- **IA:** bots\n\n¿Le interesa?');
    const en = parseChatText('We offer:\n- **QA:** testing\n- **AI:** bots\n\nInterested?');
    expect(shape(en)).toEqual(shape(es));
  });
});

describe('chatToPlainText', () => {
  it('drops markers, keeps "- " list lines and blank lines between blocks', () => {
    expect(chatToPlainText(parseChatText('Hola **Juana**.\n\n- **QA:** pruebas\n1. IA'))).toBe('Hola Juana.\n\n- QA: pruebas\n- IA');
  });

  it('turns the reported reply into readable plain text without asterisks', () => {
    const text = chatToPlainText(parseChatText(REPORTED));
    expect(text).not.toContain('*');
    expect(text.split('\n')).toHaveLength(4);
    expect(text.startsWith('- Inteligencia artificial: consultoría')).toBe(true);
  });

  it('gives an empty string for no blocks', () => {
    expect(chatToPlainText([])).toBe('');
  });
});
