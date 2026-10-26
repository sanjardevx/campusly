import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { TUTOR_EMBED_DIMENSIONS } from '../../../libs/config';
import type {
  ChatRequest,
  ChatResult,
  Embedding,
  LlmProvider,
} from './llm.provider';

export interface BedrockOptions {
  region: string;
  chatModelId: string;
  embedModelId: string;
  /** Local only; on EC2 both clients use the instance role */
  accessKeyId?: string;
  secretAccessKey?: string;
}

/**
 * Claude Haiku 5.5 through Claude in Amazon Bedrock (the Messages API at
 * bedrock-mantle.{region}.api.aws, signed with SigV4), and Titan Text Embeddings V2 through
 * bedrock-runtime InvokeModel. Both stay inside the AWS account: no API key to store.
 */
export class BedrockLlmProvider implements LlmProvider {
  public readonly name = 'bedrock';
  private readonly claude: AnthropicBedrockMantle;
  private readonly runtime: BedrockRuntimeClient;

  constructor(private readonly options: BedrockOptions) {
    const { region, accessKeyId, secretAccessKey } = options;
    const keys =
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined;
    this.claude = new AnthropicBedrockMantle({
      awsRegion: region,
      // null: never pick up a bearer token from the environment, only SigV4
      apiKey: null,
      awsAccessKey: keys?.accessKeyId,
      awsSecretAccessKey: keys?.secretAccessKey,
      // A student is waiting: one quick retry, then the error goes to the chat
      maxRetries: 1,
      timeout: 60_000,
    });
    this.runtime = new BedrockRuntimeClient({ region, credentials: keys });
  }

  public async streamChat(
    request: ChatRequest,
    onText: (delta: string) => void,
  ): Promise<ChatResult> {
    const stream = this.claude.messages.stream(
      {
        model: this.options.chatModelId,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: request.messages,
        // Short hints, not deep reasoning: low effort keeps the answer fast and cheap
        output_config: { effort: 'low' },
      },
      { signal: request.signal },
    );
    stream.on('text', (delta) => onText(delta));
    const message = await stream.finalMessage();
    const text = message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');
    return {
      text,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      refused: message.stop_reason === 'refusal',
    };
  }

  public async embed(text: string): Promise<Embedding> {
    const response = await this.runtime.send(
      new InvokeModelCommand({
        modelId: this.options.embedModelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          inputText: text,
          dimensions: TUTOR_EMBED_DIMENSIONS,
          normalize: true,
        }),
      }),
    );
    const body = JSON.parse(new TextDecoder().decode(response.body)) as {
      embedding: number[];
      inputTextTokenCount: number;
    };
    return { vector: body.embedding, tokens: body.inputTextTokenCount };
  }
}
