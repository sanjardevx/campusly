import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { TUTOR_EMBED_DIMENSIONS } from '../../../libs/config';
import type { Embedding } from './llm.provider';

export interface AwsAccess {
  region: string;
  /** Local only; on EC2 the SDK uses the instance role */
  accessKeyId?: string;
  secretAccessKey?: string;
}

/** Amazon Titan Text Embeddings V2 on bedrock-runtime (InvokeModel): used by both providers */
export class TitanEmbedder {
  private readonly runtime: BedrockRuntimeClient;

  constructor(
    aws: AwsAccess,
    private readonly modelId: string,
  ) {
    const { region, accessKeyId, secretAccessKey } = aws;
    this.runtime = new BedrockRuntimeClient({
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  public async embed(text: string): Promise<Embedding> {
    const response = await this.runtime.send(
      new InvokeModelCommand({
        modelId: this.modelId,
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
