// Hercules chat panel (specs/hercules-assistant/03). Loaded on demand (dynamic import) the first time
// the visitor opens the assistant, so pages ship no widget JS until then. Vanilla DOM, no framework;
// visitor and model text is only ever inserted as text nodes (never innerHTML). Replies are formatted
// (bold, bullet lists) by building elements from chat-format.ts, still with text nodes only.
import type { Dictionary } from '../constants/strings';
import { parseChatText } from './chat-format';
import {
  clearConversation,
  isConversationFull,
  loadConversation,
  MAX_USER_CHARS,
  TURNSTILE_ACTION,
  TurnstileGate,
  parseSse,
  prepareUserMessage,
  saveConversation,
  errorNotice,
  settleReply,
  startNewConversation,
  type ChatMessage,
} from './hercules-core';

export type WidgetConfig = {
  locale: 'es' | 'en';
  siteKey: string;
  strings: Dictionary['hercules'];
  privacyHref: string;
  phone: { display: string; href: string };
  logoHtml: string; // decorative LogoMark SVG rendered by Astro (trusted markup)
};

type Turnstile = {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  execute(idOrEl: string | HTMLElement): void;
  reset(id: string): void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Renders a Hércules reply as paragraphs, bullet lists and bold text (specs/hercules-chat-formatting).
 * Elements and text nodes only, never innerHTML: "<b>" in a reply stays the literal text "<b>".
 * Called again on every streamed delta; an unclosed "**" shows literally until it closes.
 */
function renderReply(node: HTMLElement, text: string): void {
  node.replaceChildren(
    ...parseChatText(text).map((block, index) => {
      const spacing = index > 0 ? 'mt-2' : '';
      const fill = (target: HTMLElement, line: { text: string; bold: boolean }[]) => {
        for (const piece of line) target.append(piece.bold ? el('strong', 'font-semibold', piece.text) : document.createTextNode(piece.text));
      };
      if (block.kind === 'list') {
        const list = el('ul', `list-disc space-y-1 pl-5 ${spacing}`.trim());
        for (const item of block.items) {
          const li = el('li');
          fill(li, item);
          list.append(li);
        }
        return list;
      }
      const paragraph = el('p', spacing);
      block.lines.forEach((line, i) => {
        if (i > 0) paragraph.append(el('br'));
        fill(paragraph, line);
      });
      return paragraph;
    }),
  );
}

function session(): Storage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

class HerculesPanel {
  readonly root: HTMLElement;
  private readonly log: HTMLElement;
  private readonly announcer: HTMLElement;
  private readonly alerter: HTMLElement;
  private readonly form: HTMLFormElement;
  private readonly input: HTMLTextAreaElement;
  private readonly sendButton: HTMLButtonElement;
  private readonly counter: HTMLElement;
  private readonly chips: HTMLElement;
  private readonly turnstileBox: HTMLElement;
  private conversation: ChatMessage[];
  private busy = false;
  private turnstileId: string | null = null;
  private readonly gate = new TurnstileGate();
  private readonly consent: HTMLInputElement;
  private readonly small = window.matchMedia('(max-width: 639px)');

  constructor(
    private readonly config: WidgetConfig,
    private readonly launcher: HTMLElement,
  ) {
    const s = config.strings;
    this.conversation = loadConversation(session());

    this.root = el(
      'section',
      'fixed inset-0 z-[60] flex flex-col bg-white sm:inset-auto sm:bottom-24 sm:right-4 sm:h-[560px] sm:max-h-[calc(100dvh-7rem)] sm:w-[380px] sm:rounded-2xl sm:border sm:border-ink/10 sm:shadow-2xl',
    );
    this.root.id = 'hercules-panel';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'false');
    this.root.setAttribute('aria-labelledby', 'hercules-title');
    this.root.hidden = true;

    // Header
    const header = el('header', 'flex items-center gap-3 border-b border-ink/10 px-4 py-3');
    const avatar = el('span', 'flex size-10 flex-none items-center justify-center rounded-full bg-ink');
    avatar.innerHTML = config.logoHtml; // trusted, build-time SVG
    const titles = el('div', 'min-w-0 flex-1');
    const title = el('h2', 'font-display text-lg font-bold leading-tight text-ink', s.title);
    title.id = 'hercules-title';
    titles.append(title, el('p', 'text-xs text-steel', s.subtitle));
    const close = el('button', 'rounded-lg p-2 text-steel hover:bg-ink/5 hover:text-ink');
    close.type = 'button';
    close.setAttribute('aria-label', s.close);
    close.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>';
    close.addEventListener('click', () => this.close());
    header.append(avatar, titles, close);

    // Messages: role="log" without live announcements (streaming would be read token by token);
    // completed replies are announced once through the separate polite region below.
    this.log = el('div', 'flex-1 space-y-3 overflow-y-auto px-4 py-4');
    this.log.setAttribute('role', 'log');
    this.log.setAttribute('aria-live', 'off');
    this.announcer = el('div', 'sr-only');
    this.announcer.setAttribute('aria-live', 'polite');
    // Errors interrupt (assertive); replies and status notices wait their turn (polite).
    this.alerter = el('div', 'sr-only');
    this.alerter.setAttribute('role', 'alert');

    this.chips = el('div', 'flex flex-wrap gap-2 px-4 pb-2');
    for (const reply of s.quickReplies) {
      const chip = el('button', 'rounded-full border border-brand-500/40 px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-500/10', reply);
      chip.type = 'button';
      chip.addEventListener('click', () => void this.send(reply));
      this.chips.append(chip);
    }

    // Input
    this.form = el('form', 'flex items-end gap-2 border-t border-ink/10 px-3 py-3');
    const label = el('label', 'sr-only', s.inputLabel);
    label.htmlFor = 'hercules-input';
    this.input = el('textarea', 'max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-ink/15 px-3 py-2.5 text-sm text-ink placeholder:text-steel focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500');
    this.input.id = 'hercules-input';
    this.input.rows = 1;
    this.input.maxLength = MAX_USER_CHARS;
    this.input.placeholder = s.placeholder;
    this.counter = el('span', 'sr-only');
    this.counter.setAttribute('aria-live', 'polite');
    this.sendButton = el('button', 'flex size-11 flex-none items-center justify-center rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50');
    this.sendButton.type = 'submit';
    this.sendButton.setAttribute('aria-label', s.send);
    this.sendButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"/></svg>';
    this.form.append(label, this.input, this.sendButton, this.counter);
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.send(this.input.value);
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void this.send(this.input.value);
      }
    });
    this.input.addEventListener('input', () => {
      this.input.style.height = 'auto';
      this.input.style.height = `${this.input.scrollHeight}px`;
      const left = MAX_USER_CHARS - this.input.value.length;
      this.counter.textContent = left <= 200 ? String(left) : '';
    });

    // Footer: AI disclaimer, privacy notice, phone
    const footer = el('footer', 'flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pb-3 text-xs text-steel');
    const privacy = el('a', 'underline hover:text-ink', s.privacyLink);
    privacy.href = config.privacyHref;
    // New tab: the privacy page has no chat, and leaving would lose a reply that is still streaming.
    privacy.target = '_blank';
    privacy.rel = 'noopener';
    privacy.append(el('span', 'sr-only', ` ${s.opensNewTab}`));
    const phone = el('a', 'whitespace-nowrap underline hover:text-ink', config.phone.display);
    phone.href = config.phone.href;
    footer.append(el('span', '', s.disclaimer), privacy, phone);

    // Explicit consent, owned by the visitor (not the model): the server refuses submit_lead unless
    // this box is ticked. Never pre-checked; not persisted.
    const consentRow = el('label', 'flex items-center gap-2 px-4 pb-2 text-xs text-ink');
    this.consent = el('input', 'size-4 accent-brand-500');
    this.consent.type = 'checkbox';
    consentRow.append(this.consent, el('span', '', s.consentLabel));

    // Visible container: in interaction-only mode Turnstile stays invisible unless it needs the
    // visitor to solve a challenge, which must be able to render here (never display:none).
    this.turnstileBox = el('div', 'px-4');
    this.root.append(header, this.log, this.announcer, this.alerter, this.chips, this.turnstileBox, this.form, consentRow, footer);
    this.root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
      else if (e.key === 'Tab') this.trapFocus(e);
    });
    this.small.addEventListener('change', () => this.syncModal());
    document.body.append(this.root);

    this.renderHistory();
  }

  private bubble(role: 'user' | 'assistant' | 'notice', text: string): HTMLElement {
    const styles = {
      user: 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-500 px-3.5 py-2.5 text-sm text-white',
      assistant: 'mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-mist px-3.5 py-2.5 text-sm text-ink',
      notice: 'mx-auto max-w-[90%] rounded-lg border border-ink/10 px-3 py-2 text-center text-xs text-steel',
    } as const;
    // Replies are formatted (block elements, so a div); the visitor's text and notices stay exactly as typed.
    const node = role === 'assistant' ? el('div', `${styles[role]} break-words`) : el('p', `${styles[role]} whitespace-pre-wrap break-words`, text);
    if (role === 'assistant') renderReply(node, text);
    this.log.append(node);
    this.log.scrollTop = this.log.scrollHeight;
    return node;
  }

  private renderHistory(): void {
    this.log.replaceChildren();
    this.bubble('assistant', this.config.strings.greeting);
    for (const m of this.conversation) this.bubble(m.role, m.content);
    this.chips.hidden = this.conversation.length > 0;
  }

  /** Full-screen on small screens = a real modal (focus trapped); a side panel otherwise. */
  private syncModal(): void {
    this.root.setAttribute('aria-modal', String(this.small.matches));
  }

  private trapFocus(e: KeyboardEvent): void {
    if (!this.small.matches) return;
    const focusable = [...this.root.querySelectorAll<HTMLElement>('button, textarea, input, a[href]')].filter(
      (node) => !node.hasAttribute('disabled') && node.offsetParent !== null,
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  open(): void {
    if (!this.root.hidden) return this.input.focus(); // idempotent: secondary triggers never close it
    this.syncModal();
    this.root.hidden = false;
    this.launcher.setAttribute('aria-expanded', 'true');
    this.ensureTurnstile();
    this.input.focus();
  }

  close(): void {
    this.root.hidden = true;
    this.launcher.setAttribute('aria-expanded', 'false');
    this.launcher.focus();
  }

  toggle(): void {
    if (this.root.hidden) this.open();
    else this.close();
  }

  /** Loads Turnstile once and renders an invisible widget that issues one token per message. */
  private ensureTurnstile(): void {
    if (this.turnstileId || document.querySelector(`script[src="${TURNSTILE_SRC}"]`)) {
      if (window.turnstile && !this.turnstileId) this.renderTurnstile();
      return;
    }
    const script = el('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.addEventListener('load', () => this.renderTurnstile());
    document.head.append(script);
  }

  private renderTurnstile(): void {
    if (!window.turnstile || this.turnstileId) return;
    if (!this.config.siteKey) {
      // A misconfigured build must degrade to "unavailable", not an uncaught TurnstileError.
      this.gate.fail(new Error('turnstile site key missing'));
      return;
    }
    try {
      this.turnstileId = window.turnstile.render(this.turnstileBox, {
        sitekey: this.config.siteKey,
        action: TURNSTILE_ACTION, // the Worker rejects tokens without this exact action
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (token: string) => this.gate.resolveToken(token),
        'error-callback': () => this.gate.rejectToken(),
      });
    } catch (err) {
      // Turnstile throws synchronously on invalid parameters (e.g. a bad site key).
      this.gate.fail(err instanceof Error ? err : new Error('turnstile render failed'));
      return;
    }
    this.gate.setReady(window.turnstile, this.turnstileId);
  }

  /**
   * Speaks `text` through a live region. Cleared first so an identical message (e.g. two rate-limit
   * notices in a row) is announced again.
   */
  private say(text: string, urgent = false): void {
    const region = urgent ? this.alerter : this.announcer;
    region.textContent = '';
    requestAnimationFrame(() => (region.textContent = text));
  }

  /** A notice bubble in the log (which is aria-live="off") that is also announced. */
  private status(text: string, urgent = false): void {
    this.bubble('notice', text);
    this.say(text, urgent);
  }

  private notice(code: string): void {
    const { text, urgent } = errorNotice(code, this.config.strings.errors, this.config.phone.display);
    this.status(text, urgent);
  }

  private finished(): void {
    clearConversation(session());
    this.conversation = [];
    this.status(this.config.strings.sent);
    this.offerNewConversation();
  }

  /** Locks the input and offers "Nueva conversación" (after a lead is sent or the limit is hit). */
  private offerNewConversation(): void {
    this.input.disabled = true;
    this.sendButton.disabled = true;
    const again = el('button', 'mx-auto block rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90', this.config.strings.newConversation);
    again.type = 'button';
    again.addEventListener('click', () => {
      const fresh = startNewConversation(session());
      this.conversation = fresh.conversation;
      this.consent.checked = fresh.consentChecked;
      this.input.disabled = false;
      this.sendButton.disabled = false;
      this.renderHistory();
      this.input.focus();
    });
    this.log.append(again);
    // The focused textarea was just disabled; without this, focus would fall back to <body>.
    again.focus();
  }

  async send(raw: string): Promise<void> {
    const text = prepareUserMessage(raw);
    if (!text || this.busy) return;
    if (isConversationFull(this.conversation)) {
      this.status(this.config.strings.limitReached);
      this.offerNewConversation(); // otherwise the visitor is stuck until a reload
      return;
    }

    this.busy = true;
    this.sendButton.disabled = true;
    this.chips.hidden = true;
    this.input.value = '';
    this.input.style.height = 'auto';
    this.conversation.push({ role: 'user', content: text });
    this.bubble('user', text);
    const typing = this.bubble('assistant', this.config.strings.typing);
    typing.classList.add('motion-safe:animate-pulse', 'text-steel');

    let reply = '';
    let replyNode: HTMLElement | null = null;
    let leadSent = false;
    let failed: string | null = null;
    let sawDone = false;

    try {
      const turnstileToken = await this.gate.token();
      const res = await fetch('/api/hercules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: this.config.locale,
          turnstileToken,
          privacyAccepted: this.consent.checked,
          messages: this.conversation,
        }),
      });
      if (!res.body) throw new Error('no body');
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const parsed = parseSse(buffer + value);
        buffer = parsed.rest;
        for (const event of parsed.events) {
          if (event.event === 'text') {
            if (!replyNode) {
              typing.remove();
              replyNode = this.bubble('assistant', '');
            }
            reply += event.delta;
            renderReply(replyNode, reply);
            this.log.scrollTop = this.log.scrollHeight;
          } else if (event.event === 'lead_sent') {
            leadSent = true;
          } else if (event.event === 'error') {
            failed = event.code;
          } else if (event.event === 'done') {
            sawDone = true;
          }
        }
      }
    } catch {
      failed ??= 'unavailable';
    }

    typing.remove();
    const outcome = settleReply({ reply, sawDone, error: failed, leadSent });
    failed = outcome.error;
    if (outcome.keep) {
      this.conversation.push({ role: 'assistant', content: outcome.stored });
      this.say(outcome.stored); // announce the completed reply once
    } else {
      // No reply: drop the unanswered message so the history still alternates, and give it back.
      this.conversation.pop();
      replyNode?.remove();
      this.input.value = text;
    }
    if (failed) this.notice(failed);

    if (leadSent) this.finished();
    else saveConversation(session(), this.conversation);

    this.busy = false;
    if (!leadSent) {
      this.sendButton.disabled = false;
      this.input.focus();
    }
  }
}

let panel: HerculesPanel | null = null;

/** Floating button: opens or closes the panel, creating it on first use. */
export function toggleHercules(config: WidgetConfig, launcher: HTMLElement): void {
  panel ??= new HerculesPanel(config, launcher);
  panel.toggle();
}

/** Secondary triggers (e.g. the hero link): always open, never close. */
export function openHercules(config: WidgetConfig, launcher: HTMLElement): void {
  panel ??= new HerculesPanel(config, launcher);
  panel.open();
}
