// Safe formatting subset for Hércules' replies (specs/hercules-chat-formatting). Pure: no DOM and no
// HTML, so the widget (DOM nodes + textContent) and the lead email (escaped HTML) both build on it.
// Bold, bullet lists and paragraphs are kept; any other Markdown is reduced to clean text.

export type Inline = { text: string; bold: boolean };
export type Line = Inline[];
export type Block = { kind: 'paragraph'; lines: Line[] } | { kind: 'list'; items: Line[] };

/** "- ", "* ", "• ", "1. " or "1) " followed by content. Numbered items become bullets (decided). */
const LIST_ITEM = /^(?:[-*•]|\d{1,3}[.)])\s+(\S.*)$/;
const HEADING = /^#{1,6}\s+(\S.*)$/;
const QUOTE = /^>(?:\s+|$)(.*)$/;
/** "---" or "___" on its own line: a separator, read as a paragraph break. A run of "*" stays text
 *  ("****" is shown as written). */
const RULE = /^(?:-{3,}|_{3,})$/;
const TABLE_SEPARATOR = /^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?$/;
const TABLE_ROW = /^\|(.*)\|$/;

const CODE = /`([^`\n]+)`/g;

/** Stand-in for "*" inside code spans, so bold/italic parsing can't see it. */
const CODE_STAR = '\uE000';
const protectCode = (text: string) =>
  text.replace(/\uE000/g, '').replace(CODE, (_m, code: string) => code.replaceAll('*', CODE_STAR));
const restoreCode = (text: string) => text.replaceAll(CODE_STAR, '*');

/** Longest link destination scanned for its closing ")" (keeps the scan linear on hostile input). */
const MAX_LINK_DESTINATION = 2048;

/**
 * [label](destination) → label. Links are never kept: a model-written URL must not become clickable,
 * nor leak into the email. The destination is scanned with balanced parentheses (URLs may contain
 * "(…)", even nested); an unclosed one is dropped up to the next whitespace.
 */
export function stripLinks(text: string): string {
  const opener = /\[([^\]\n]+)\]\(/g;
  let out = '';
  let from = 0;
  for (let match = opener.exec(text); match; match = opener.exec(text)) {
    let end = opener.lastIndex;
    let depth = 1;
    const limit = Math.min(text.length, end + MAX_LINK_DESTINATION);
    while (end < limit && depth > 0 && text[end] !== '\n') {
      if (text[end] === '(') depth++;
      else if (text[end] === ')') depth--;
      end++;
    }
    if (depth > 0) {
      const space = text.slice(opener.lastIndex).search(/\s/);
      end = space === -1 ? text.length : opener.lastIndex + space;
    }
    out += text.slice(from, match.index) + match[1];
    from = end;
    opener.lastIndex = end;
  }
  return out + text.slice(from);
}

/*
 * Underscores are never formatting: no __bold__, _italic_ or ___bold italic___. They are common in
 * real data (ana__m__x@mail.com, _ana_@mail.com, __init__, snake_case) and rare as formatting, and the
 * prompt asks the model for ** only. Reading them as markup would corrupt the visitor's address in
 * the bubble, the screen-reader announcement and the lead email.
 */

/** *italic* → text, only when the markers hug a word (so "2*3*4" stays). */
const ITALIC_STAR = /(^|[^\p{L}\p{N}*])\*(?![\s*])([^*\n]*?[^\s*])\*(?![\p{L}\p{N}*])/gu;

const stripItalics = (text: string) => text.replace(ITALIC_STAR, '$1$2');

/** ***x*** (bold italic) → **x**: the italic is dropped, so no stray marker is left. */
const BOLD_ITALIC = /\*\*\*(?=[^\s*])([^*\n]*?[^\s*])\*\*\*/g;

/**
 * Splits a line into plain and bold pieces. `**x**` is bold when the opener is followed by a
 * non-space and the closer preceded by one. An unclosed opener (e.g. mid-stream) stays literal.
 * One pass over the delimiter tokens: linear, even for thousands of asterisks.
 */
export function parseInline(raw: string): Line {
  const text = stripLinks(protectCode(raw)).replace(BOLD_ITALIC, '**$1**');
  const tokens = text.split(/(\*\*)/);
  const bold = new Array<boolean>(tokens.length).fill(false);
  const literal = new Array<boolean>(tokens.length).fill(true);
  let open = -1;
  for (let k = 1; k < tokens.length; k += 2) {
    const delimiter = tokens[k];
    const before = tokens[k - 1];
    const after = tokens[k + 1] ?? '';
    if (open !== -1 && tokens[open] === delimiter && before !== '' && !/\s$/u.test(before)) {
      for (let i = open + 1; i < k; i++) bold[i] = true;
      literal[open] = false;
      literal[k] = false;
      open = -1;
    } else if (open === -1 && after !== '' && !/^\s/u.test(after)) {
      open = k;
    }
  }
  const line: Line = [];
  tokens.forEach((token, i) => {
    const isDelimiter = i % 2 === 1;
    if (isDelimiter && !literal[i]) return;
    // Italics are stripped first, then code-span markers come back as the literal "*" / "_".
    const piece = restoreCode(isDelimiter ? token : stripItalics(token));
    if (piece === '') return;
    const last = line.at(-1);
    if (last && last.bold === bold[i]) last.text += piece;
    else line.push({ text: piece, bold: bold[i] });
  });
  return line;
}

/** Parses a reply into paragraphs and bullet lists. Empty or blank input gives no blocks. */
export function parseChatText(text: string): Block[] {
  const blocks: Block[] = [];
  // An object, not a `let`: TypeScript does not track reassignments made inside the closures below.
  const open: { block: Block | null } = { block: null };
  const close = () => {
    if (open.block) blocks.push(open.block);
    open.block = null;
  };
  const addLine = (line: Line) => {
    if (line.length === 0) return;
    if (open.block?.kind === 'paragraph') open.block.lines.push(line);
    else {
      close();
      open.block = { kind: 'paragraph', lines: [line] };
    }
  };

  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (line === '' || RULE.test(line) || TABLE_SEPARATOR.test(line)) {
      close();
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (item) {
      const content = parseInline(item[1]);
      if (content.length === 0) continue;
      if (open.block?.kind === 'list') open.block.items.push(content);
      else {
        close();
        open.block = { kind: 'list', items: [content] };
      }
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      addLine(parseInline(heading[1]).map((piece) => ({ ...piece, bold: true })));
      continue;
    }
    const row = TABLE_ROW.exec(line);
    if (row) {
      addLine(parseInline(row[1].split('|').map((cell) => cell.trim()).filter(Boolean).join(' · ')));
      continue;
    }
    const quote = QUOTE.exec(line);
    addLine(parseInline(quote ? quote[1] : line));
  }
  close();
  return mergeBold(blocks);
}

/** Adjacent pieces with the same weight become one (e.g. after a heading's pieces were all bolded). */
function mergeBold(blocks: Block[]): Block[] {
  const merge = (line: Line): Line =>
    line.reduce<Line>((out, piece) => {
      const last = out.at(-1);
      if (last && last.bold === piece.bold) last.text += piece.text;
      else out.push({ ...piece });
      return out;
    }, []);
  return blocks.map((b) => (b.kind === 'list' ? { kind: 'list', items: b.items.map(merge) } : { kind: 'paragraph', lines: b.lines.map(merge) }));
}

/**
 * What a screen reader should hear for a reply: the words only. No "**", and no "- " either (read
 * aloud as "guion" / "dash"); each list item and paragraph ends up on its own line.
 */
export function chatToSpeech(text: string): string {
  const lineText = (line: Line) => line.map((piece) => piece.text).join('');
  return parseChatText(text)
    .flatMap((b) => (b.kind === 'list' ? b.items : b.lines).map(lineText))
    .join('\n');
}

/** Plain text for the email's text part: no markers; list items keep a leading "- ". */
export function chatToPlainText(blocks: Block[]): string {
  const lineText = (line: Line) => line.map((piece) => piece.text).join('');
  return blocks
    .map((b) => (b.kind === 'list' ? b.items.map((item) => `- ${lineText(item)}`).join('\n') : b.lines.map(lineText).join('\n')))
    .join('\n\n');
}
