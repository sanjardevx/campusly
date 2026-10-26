import type { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../libs/config';
import { AnthropicLlmProvider } from './anthropic.provider';
import { BedrockLlmProvider } from './bedrock.provider';
import { FakeLlmProvider } from './fake.provider';
import { LLM_PROVIDER, type LlmProvider } from './llm.provider';

/** Region and (local only) keys for Bedrock; on EC2 the instance role is used */
const aws = (config: ConfigService<Env, true>) => ({
  region: config.get('AWS_REGION', { infer: true }),
  accessKeyId: config.get('AWS_ACCESS_KEY_ID', { infer: true }),
  secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', { infer: true }),
});

/** TUTOR_PROVIDER picks the implementation; shared by the API and the batch (indexing) */
export const llmProviderFactory: FactoryProvider<LlmProvider | null> = {
  provide: LLM_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>) => {
    switch (config.get('TUTOR_PROVIDER', { infer: true })) {
      case 'off':
        return null;
      case 'fake':
        return new FakeLlmProvider();
      case 'anthropic':
        return new AnthropicLlmProvider(
          config.get('ANTHROPIC_API_KEY', { infer: true }),
          config.get('ANTHROPIC_CHAT_MODEL_ID', { infer: true }),
          aws(config),
          config.get('BEDROCK_EMBED_MODEL_ID', { infer: true }),
        );
      case 'bedrock':
        return new BedrockLlmProvider(
          aws(config),
          config.get('BEDROCK_CHAT_MODEL_ID', { infer: true }),
          config.get('BEDROCK_EMBED_MODEL_ID', { infer: true }),
        );
    }
  },
};
