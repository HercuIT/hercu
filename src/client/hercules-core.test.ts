import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  capAssistantReply,
  clearConversation,
  isConversationFull,
  loadConversation,
  parseSse,
  prepareUserMessage,
  saveConversation,
} from './hercules-core';

const memory = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
};
const throwing = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

describe('parseSse', () => {
  it('parses complete events of every kind', () => {
    const { events, rest } = parseSse(
      'event: text\ndata: {"delta":"Hola"}\n\nevent: lead_sent\ndata: {"ok":true}\n\nevent: error\ndata: {"code":"refused"}\n\nevent: done\ndata: {}\n\n',
    );
    expect(events).toEqual([
      { event: 'text', delta: 'Hola' },
      { event: 'lead_sent' },
      { event: 'error', code: 'refused' },
      { event: 'done' },
    ]);
    expect(rest).toBe('');
  });

  it('keeps an incomplete trailing event for the next chunk', () => {
    const first = parseSse('event: text\ndata: {"delta":"Ho');
    expect(first.events).toEqual([]);
    const second = parseSse(`${first.rest}la"}\n\n`);
    expect(second.events).toEqual([{ event: 'text', delta: 'Hola' }]);
  });

  it('handles a chunk split between the two blank-line characters', () => {
    const a = parseSse('event: done\ndata: {}\n');
    expect(a.events).toEqual([]);
    expect(parseSse(`${a.rest}\n`).events).toEqual([{ event: 'done' }]);
  });

  it('accepts CRLF line endings', () => {
    expect(parseSse('event: text\r\ndata: {"delta":"á"}\r\n\r\n').events).toEqual([{ event: 'text', delta: 'á' }]);
  });

  it('skips malformed JSON and unknown events without stopping', () => {
    const { events } = parseSse('event: text\ndata: {nope\n\nevent: ping\ndata: {}\n\nevent: done\ndata: {}\n\n');
    expect(events).toEqual([{ event: 'done' }]);
  });

  it('defaults an error without a code to "unavailable"', () => {
    expect(parseSse('event: error\ndata: {}\n\n').events).toEqual([{ event: 'error', code: 'unavailable' }]);
  });

  it('returns nothing for an empty buffer', () => {
    expect(parseSse('')).toEqual({ events: [], rest: '' });
  });
});

describe('conversation storage', () => {
  const conversation = [
    { role: 'user' as const, content: 'Hola' },
    { role: 'assistant' as const, content: '¿En qué le ayudo?' },
  ];

  it('round-trips a valid conversation', () => {
    const s = memory();
    saveConversation(s, conversation);
    expect(loadConversation(s)).toEqual(conversation);
  });

  it('clears the stored conversation', () => {
    const s = memory();
    saveConversation(s, conversation);
    clearConversation(s);
    expect(s.map.has(STORAGE_KEY)).toBe(false);
  });

  it.each([
    ['nothing stored', null],
    ['invalid JSON', '{oops'],
    ['a non-array', '{"role":"user"}'],
    ['a bad role', '[{"role":"system","content":"x"}]'],
    ['non-string content', '[{"role":"user","content":42}]'],
    ['a history starting with assistant', '[{"role":"assistant","content":"x"}]'],
    ['two user messages in a row', '[{"role":"user","content":"a"},{"role":"user","content":"b"}]'],
  ])('returns [] for %s', (_label, raw) => {
    const s = memory();
    if (raw !== null) s.map.set(STORAGE_KEY, raw);
    expect(loadConversation(s)).toEqual([]);
  });

  it('never throws when storage is blocked (private mode) or missing', () => {
    expect(loadConversation(throwing)).toEqual([]);
    expect(() => saveConversation(throwing, conversation)).not.toThrow();
    expect(() => clearConversation(throwing)).not.toThrow();
    expect(loadConversation(undefined)).toEqual([]);
  });
});

describe('message limits', () => {
  it('prepares visitor text: trims, rejects blanks, caps at 2000 chars', () => {
    expect(prepareUserMessage('  hola  ')).toBe('hola');
    expect(prepareUserMessage('   ')).toBeNull();
    expect(prepareUserMessage('')).toBeNull();
    expect(prepareUserMessage('x'.repeat(2500))).toHaveLength(2000);
  });

  it('caps stored assistant replies at 4000 chars', () => {
    expect(capAssistantReply('y'.repeat(5000))).toHaveLength(4000);
    expect(capAssistantReply('  ok  ')).toBe('ok');
  });

  it('reports a full conversation before the server limit is exceeded', () => {
    const msgs = (n: number) => Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' }) as const);
    expect(isConversationFull(msgs(28))).toBe(false);
    expect(isConversationFull(msgs(29))).toBe(false);
    expect(isConversationFull(msgs(30))).toBe(true);
  });
});
