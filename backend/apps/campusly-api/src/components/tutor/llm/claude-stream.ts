import type Anthropic from '@anthropic-ai/sdk';
import type { ChatRequest, ChatResult } from './llm.provider';

/**
 * One Claude answer, streamed. The Anthropic API and Bedrock clients share the same `messages`
 * resource (same request body, same events), so both providers call this.
 */
export async function streamClaude(
  client: { messages: Pick<Anthropic['messages'], 'stream'> },
  model: string,
  request: ChatRequest,
  onText: (delta: string) => void,
): Promise<ChatResult> {
  const stream = client.messages.stream(
    {
      model,
      max_tokens: request.maxTokens,
      system: request.system,
      messages: request.messages,
      // Short hints, not deep reasoning. Haiku 5.5 thinks by default (silently: the student would
      // wait seconds before the first word), so thinking is off; that needs effort high or lower.
      thinking: { type: 'disabled' },
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
