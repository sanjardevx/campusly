/**
 * What the tutor needs from a language model, and nothing more (DECISIONS §3: "behind an
 * LlmProvider interface"). The service never imports a vendor SDK: the Anthropic API in production,
 * Bedrock kept for later, the fake one for tests and offline work — one class each.
 */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  system: string;
  messages: ChatTurn[];
  maxTokens: number;
  /** The student closed the page: stop generating (and stop paying) */
  signal?: AbortSignal;
}

export interface ChatResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /** The model's safety system declined to answer (stop_reason "refusal") */
  refused: boolean;
}

export interface Embedding {
  vector: number[];
  tokens: number;
}

export interface LlmProvider {
  readonly name: 'fake' | 'bedrock' | 'anthropic';
  /** Streams the answer: `onText` gets each new piece as it is written */
  streamChat(
    request: ChatRequest,
    onText: (delta: string) => void,
  ): Promise<ChatResult>;
  /** One text → one normalized vector (TUTOR_EMBED_DIMENSIONS) */
  embed(text: string): Promise<Embedding>;
}

/** Injection token. The value is null when TUTOR_PROVIDER=off */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
