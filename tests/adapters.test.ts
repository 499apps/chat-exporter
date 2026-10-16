import { describe, expect, it } from 'vitest';
import { chatgpt } from '../src/adapters/chatgpt';
import { claude } from '../src/adapters/claude';
import { gemini } from '../src/adapters/gemini';
import { grok } from '../src/adapters/grok';
import { loadFixture } from './helpers';

describe('chatgpt adapter', () => {
  const msgs = chatgpt.extract(loadFixture('chatgpt.html'));
  it('extracts turns in order with roles', () => {
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant']);
  });
  it('keeps user newlines', () => {
    expect(msgs[0].content).toBe('How do I sort a list in Python?\nKeep it short.');
  });
  it('preserves code blocks and markdown', () => {
    expect(msgs[1].codeBlocks).toEqual([{ language: 'python', code: 'nums = [3, 1, 2]\nprint(sorted(nums))' }]);
    expect(msgs[1].content).toContain('```python\nnums = [3, 1, 2]\nprint(sorted(nums))\n```');
    expect(msgs[1].content).toContain('Use `sorted()` for a **new** list:');
    expect(msgs[1].content).toContain('- Pass `reverse=True` to flip');
    expect(msgs[1].content).toContain('[the docs](https://docs.python.org/3/howto/sorting.html)');
    expect(msgs[1].content).not.toContain('Copy');
  });
  it('reads title', () => expect(chatgpt.title!(loadFixture('chatgpt.html'))).toBe('Sorting help'));
});

describe('claude adapter', () => {
  const msgs = claude.extract(loadFixture('claude.html'));
  it('alternates roles without duplicates', () => {
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
  });
  it('captures content', () => {
    expect(msgs[1].content).toBe('Soft drops on the roof\n\ngray afternoon, slow and still\n\nthe gutters sing low');
    expect(msgs[3].codeBlocks[0]).toEqual({ language: 'javascript', code: 'const haiku = `Soft drops on the roof`;' });
    expect(msgs[3].content).toContain('1. Template literal\n2. One line');
  });
});

describe('gemini adapter', () => {
  const msgs = gemini.extract(loadFixture('gemini.html'));
  it('reads custom elements', () => {
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
    expect(msgs[0].content).toBe('What is 2 + 2?\nExplain briefly.');
  });
  it('converts headings, bold, tables and code', () => {
    expect(msgs[1].content).toContain('### Answer');
    expect(msgs[1].content).toContain('It is **4**.');
    expect(msgs[1].content).toContain('| a | b | sum |\n| --- | --- | --- |\n| 2 | 2 | 4 |');
    expect(msgs[3].codeBlocks[0]).toEqual({ language: 'sql', code: 'SELECT 2 + 2 AS total;' });
  });
});

describe('grok adapter', () => {
  const msgs = grok.extract(loadFixture('grok.html'));
  it('infers roles from alignment', () => {
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant']);
  });
  it('captures timestamps and blockquotes', () => {
    expect(msgs[0].timestamp).toBe('2026-01-02T10:00:00.000Z');
    expect(msgs[1].content).toContain('1. Pick a 5 km trail');
    expect(msgs[1].content).toContain('> Check the weather first.');
  });
});

describe('adapter isolation', () => {
  it('each adapter finds nothing on other sites fixtures', () => {
    expect(chatgpt.extract(loadFixture('claude.html'))).toEqual([]);
    expect(claude.extract(loadFixture('gemini.html'))).toEqual([]);
    expect(gemini.extract(loadFixture('grok.html'))).toEqual([]);
    expect(grok.extract(loadFixture('chatgpt.html'))).toEqual([]);
  });
});
