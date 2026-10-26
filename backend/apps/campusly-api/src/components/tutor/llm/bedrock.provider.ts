import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import { streamClaude } from './claude-stream';
import type {
  ChatRequest,
  ChatResult,
  Embedding,
  LlmProvider,
} from './llm.provider';
import { type AwsAccess, TitanEmbedder } from './titan.embedder';

/**
 * Claude on Amazon Bedrock through bedrock-runtime with the EU inference profile
 * (`eu.anthropic.…`), signed with SigV4 (the EC2 role). Kept for later: the account cannot use
 * Claude on Bedrock yet (Free plan, no Haiku 5.5 quota), so production uses AnthropicLlmProvider.
 * Claude in Amazon Bedrock's newer endpoint (bedrock-mantle) has no Haiku in eu-central-1.
 */
export class BedrockLlmProvider implements LlmProvider {
  public readonly name = 'bedrock';
  private readonly claude: AnthropicBedrock;
  private readonly titan: TitanEmbedder;

  constructor(
    aws: AwsAccess,
    private readonly chatModelId: string,
    embedModelId: string,
  ) {
    const client = {
      awsRegion: aws.region,
      // null: never pick up a bearer token from the environment, only SigV4
      apiKey: null,
      // A student is waiting: one quick retry, then the error goes to the chat
      maxRetries: 1,
      timeout: 60_000,
    };
    // Local keys, or none: then the SDK's default chain finds the EC2 role
    this.claude =
      aws.accessKeyId && aws.secretAccessKey
        ? new AnthropicBedrock({
            ...client,
            awsAccessKey: aws.accessKeyId,
            awsSecretKey: aws.secretAccessKey,
          })
        : new AnthropicBedrock(client);
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
