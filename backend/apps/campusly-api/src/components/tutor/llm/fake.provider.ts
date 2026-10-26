import { createHash } from 'node:crypto';
import { TUTOR_EMBED_DIMENSIONS } from '../../../libs/config';
import type {
  ChatRequest,
  ChatResult,
  Embedding,
  LlmProvider,
} from './llm.provider';

/** About 4 characters per token: close enough for the budget in tests */
const tokens = (text: string) => Math.ceil(text.length / 4);

/**
 * No network, no cost: e2e tests and local work while the Bedrock quota is pending.
 * Embeddings are "bag of words" hashed into the vector, so texts that share words really are
 * close — the search behaves like the real one on small examples. The chat makes up nothing
 * about the subject: it says it is a practice tutor and repeats the help level.
 */
export class FakeLlmProvider implements LlmProvider {
  public readonly name = 'fake';

  public async streamChat(
    request: ChatRequest,
    onText: (delta: string) => void,
  ): Promise<ChatResult> {
    // The CMS "Translate from English": tag every text with its language
    if (request.system.startsWith('You translate')) {
      const texts = JSON.parse(request.messages[0].content) as string[];
      const text = JSON.stringify(
        texts.map((t) => ({
          uz: `[uz] ${t}`,
          ru: `[ru] ${t}`,
          ko: `[ko] ${t}`,
        })),
      );
      onText(text);
      return {
        text,
        inputTokens: tokens(texts.join(' ')),
        outputTokens: tokens(text),
        refused: false,
      };
    }
    const level = /Help level: (\d)/.exec(request.system)?.[1] ?? '1';
    const text = `Practice tutor (offline), help level ${level}: what is the first step you would try?`;
    // Three pieces, like a real stream
    for (const piece of text.match(/.{1,30}(\s|$)/g) ?? [text]) {
      if (request.signal?.aborted) break;
      onText(piece);
      await Promise.resolve();
    }
    const input =
      request.system + request.messages.map((m) => m.content).join('\n');
    return {
      text,
      inputTokens: tokens(input),
      outputTokens: tokens(text),
      refused: false,
    };
  }

  public embed(text: string): Promise<Embedding> {
    const vector = new Array<number>(TUTOR_EMBED_DIMENSIONS).fill(0);
    const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    for (const word of words) {
      const slot = createHash('sha1').update(word).digest().readUInt32BE(0);
      vector[slot % TUTOR_EMBED_DIMENSIONS] += 1;
    }
    // A zero vector has no direction (cosine distance would be NaN)
    if (words.length === 0) vector[0] = 1;
    const length = Math.hypot(...vector);
    return Promise.resolve({
      vector: vector.map((v) => v / length),
      tokens: tokens(text),
    });
  }
}
