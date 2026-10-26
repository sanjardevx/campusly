import Anthropic from '@anthropic-ai/sdk';
import { streamClaude } from './claude-stream';
import type {
  ChatRequest,
  ChatResult,
  Embedding,
  LlmProvider,
} from './llm.provider';
import { type AwsAccess, TitanEmbedder } from './titan.embedder';

/**
 * Production tutor (DECISIONS log 2026-10-27): Claude Haiku 5.5 on the Anthropic API
 * (api.anthropic.com, the key from SSM), embeddings on Bedrock Titan V2 (the EC2 role).
 * Anthropic has no embedding model, and Titan already works on the account.
 * Only the question, the course material and the conversation are sent — no names or IDs.
 */
export class AnthropicLlmProvider implements LlmProvider {
  public readonly name = 'anthropic';
  private readonly claude: Anthropic;
  private readonly titan: TitanEmbedder;

  constructor(
    apiKey: string,
    private readonly chatModelId: string,
    aws: AwsAccess,
    embedModelId: string,
  ) {
    // A student is waiting: one quick retry, then the error goes to the chat
    this.claude = new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 });
    this.titan = new TitanEmbedder(aws, embedModelId);
  }

  public streamChat(
    request: ChatRequest,
    onText: (delta: string) => void,
  ): Promise<ChatResult> {
    return streamClaude(this.claude, this.chatModelId, request, onText);
  }

  public embed(text: string): Promise<Embedding> {
    return this.titan.embed(text);
  }
}
