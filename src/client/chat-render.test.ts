import { describe, expect, it } from 'vitest';
import { renderReply, type DomLike } from './chat-render';

/** A minimal fake DOM: enough for renderReply, and it refuses innerHTML outright. */
class FakeText {
  constructor(readonly data: string) {}
  toString() {
    return this.data;
  }
}

class FakeElement {
  className = '';
  children: (FakeElement | FakeText)[] = [];
  constructor(readonly tag: string) {}
  set textContent(value: string) {
    this.children = [new FakeText(value)];
  }
  set innerHTML(_value: string) {
    throw new Error('renderReply must never set innerHTML');
  }
  append(...nodes: (FakeElement | FakeText)[]) {
    this.children.push(...nodes);
  }
  replaceChildren(...nodes: (FakeElement | FakeText)[]) {
    this.children = nodes;
  }
  /** Serialized with the text escaped, so "<b>" text is distinguishable from a <b> element. */
  toString(): string {
    const inner = this.children
      .map((child) => (child instanceof FakeText ? child.data.replaceAll('<', '&lt;') : child.toString()))
      .join('');
    return `<${this.tag}${this.className ? ` class="${this.className}"` : ''}>${inner}</${this.tag}>`;
  }
}

const fakeDoc = {
  createElement: (tag: string) => new FakeElement(tag),
  createTextNode: (data: string) => new FakeText(data),
} as unknown as DomLike;

function render(text: string): string {
  const bubble = new FakeElement('div');
  renderReply(bubble as unknown as HTMLElement, text, fakeDoc);
  return bubble.children.join('');
}

describe('renderReply', () => {
  it('renders the reported reply as a bulleted list with bold labels', () => {
    const html = render('- **Inteligencia artificial:** bots con IA.\n- **Capacitación y equipos:** team building.');
    expect(html).toBe(
      '<ul class="list-disc space-y-1 pl-5"><li><strong class="font-semibold">Inteligencia artificial:</strong> bots con IA.</li>' +
        '<li><strong class="font-semibold">Capacitación y equipos:</strong> team building.</li></ul>',
    );
    expect(html).not.toContain('*');
  });

  it('spaces blocks after the first, and joins lines of a paragraph with <br>', () => {
    expect(render('Hola.\nSegunda línea.\n\n- QA')).toBe(
      '<p>Hola.<br></br>Segunda línea.</p><ul class="list-disc space-y-1 pl-5 mt-2"><li>QA</li></ul>',
    );
  });

  it('puts HTML from the model into text nodes, never into elements (and never uses innerHTML)', () => {
    expect(render('<img src=x onerror=alert(1)> **<b>hola</b>**')).toBe(
      '<p>&lt;img src=x onerror=alert(1)> <strong class="font-semibold">&lt;b>hola&lt;/b></strong></p>',
    );
  });

  it('shows an unclosed ** literally mid-stream, then bold once it closes (re-render replaces children)', () => {
    const bubble = new FakeElement('div');
    renderReply(bubble as unknown as HTMLElement, '**Capacita', fakeDoc);
    expect(bubble.children.join('')).toBe('<p>**Capacita</p>');
    renderReply(bubble as unknown as HTMLElement, '**Capacitación:** sí', fakeDoc);
    expect(bubble.children.join('')).toBe('<p><strong class="font-semibold">Capacitación:</strong> sí</p>');
  });

  it('renders an empty or blank reply (the first streamed moment) as an empty bubble', () => {
    expect(render('')).toBe('');
    expect(render('  \n ')).toBe('');
  });

  it('keeps accents, ñ and emoji intact in both locales', () => {
    expect(render('¿Le interesa **QA**? 🚀 Señal')).toBe('<p>¿Le interesa <strong class="font-semibold">QA</strong>? 🚀 Señal</p>');
    expect(render('Interested in **QA**? 🚀')).toBe('<p>Interested in <strong class="font-semibold">QA</strong>? 🚀</p>');
  });
});
