// DOM rendering of a formatted Hércules reply (specs/hercules-chat-formatting). The document is
// injected so tests can pass a fake one; the widget uses the real one.
import { parseChatText, type Line } from './chat-format';

export type DomLike = Pick<Document, 'createElement' | 'createTextNode'>;

/**
 * Renders a reply as paragraphs, bullet lists and bold text. Elements and text nodes only, never
 * innerHTML: "<b>" in a reply stays the literal text "<b>". Called again on every streamed delta;
 * an unclosed "**" shows literally until it closes.
 */
export function renderReply(node: HTMLElement, text: string, doc: DomLike = document): void {
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', content?: string) => {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  };
  const fill = (target: HTMLElement, line: Line) => {
    for (const piece of line) target.append(piece.bold ? make('strong', 'font-semibold', piece.text) : doc.createTextNode(piece.text));
  };
  node.replaceChildren(
    ...parseChatText(text).map((block, index) => {
      const spacing = index > 0 ? 'mt-2' : '';
      if (block.kind === 'list') {
        const list = make('ul', `list-disc space-y-1 pl-5 ${spacing}`.trim());
        for (const item of block.items) {
          const li = make('li');
          fill(li, item);
          list.append(li);
        }
        return list;
      }
      const paragraph = make('p', spacing);
      block.lines.forEach((line, i) => {
        if (i > 0) paragraph.append(make('br'));
        fill(paragraph, line);
      });
      return paragraph;
    }),
  );
}
