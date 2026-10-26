import { chunkText, toVectorLiteral } from './tutor-text';

describe('chunkText', () => {
  it('keeps a short text in one piece and drops link URLs', () => {
    expect(chunkText('See [the rule](https://x.io/a) here.  ')).toEqual([
      'See the rule here.',
    ]);
  });

  it('returns nothing for an empty text', () => {
    expect(chunkText('  \n ')).toEqual([]);
  });

  it('cuts a long text at sentence ends, with an overlap, and loses no words', () => {
    const sentences = Array.from(
      { length: 40 },
      (_, i) => `Sentence number ${i} explains one idea.`,
    );
    const chunks = chunkText(sentences.join(' '), 200, 40);
    expect(chunks.length).toBeGreaterThan(5);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(200);
    // Every chunk but the last ends at a sentence
    for (const chunk of chunks.slice(0, -1))
      expect(chunk.endsWith('.')).toBe(true);
    const joined = chunks.join(' ');
    for (const sentence of sentences) expect(joined).toContain(sentence);
  });

  it('cuts a text without spaces anyway', () => {
    expect(chunkText('x'.repeat(500), 200, 20)).toHaveLength(3);
  });
});

describe('toVectorLiteral', () => {
  it('writes the pgvector text form', () => {
    expect(toVectorLiteral([0.5, -1, 0])).toBe('[0.5,-1,0]');
  });
});
