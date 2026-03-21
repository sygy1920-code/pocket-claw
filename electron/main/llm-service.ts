import type { ChatMessage, StreamChunk } from '../../src/shared/chat-constants';

/**
 * Generate JWT token for GLM API
 * API Key format: id.secret
 */
function generateJWT(apiKey: string): string {
  try {
    const [id, secret] = apiKey.split('.');
    if (!id || !secret) {
      throw new Error('Invalid API key format');
    }

    const now = Date.now();
    const header = {
      alg: 'HS256',
      sign_type: 'SIGN',
    };

    const payload = {
      api_key: id,
      exp: now + 3600 * 1000, // 1 hour expiration
      timestamp: now,
    };

    // Simple base64url encoding
    const encodeBase64Url = (str: string) => {
      return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };

    const encodedHeader = encodeBase64Url(JSON.stringify(header));
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));

    // Create signature
    const crypto = require('crypto');
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return `${data}.${signature}`;
  } catch (error) {
    console.error('JWT generation error:', error);
    throw error;
  }
}

export class LLMService {
  private conversationHistory: ChatMessage[] = [];

  constructor(
    private apiKey: string,
    private baseURL: string,
    private model: string,
    private systemPrompt: string,
    private maxTokens: number,
    private temperature: number
  ) {}

  /**
   * Send a message and stream the response
   */
  async *streamResponse(userMessage: string): AsyncGenerator<StreamChunk> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    });

    // Build messages array
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...this.conversationHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    try {
      const token = generateJWT(this.apiKey);
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: true,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GLM API error:', response.status, errorText);

        if (response.status === 401) {
          yield { type: 'error', error: 'API Key 无效，请检查配置' };
          return;
        }
        if (response.status === 429) {
          yield { type: 'error', error: 'API 请求太频繁，请稍后再试' };
          return;
        }
        yield { type: 'error', error: `API 错误 (${response.status})` };
        return;
      }

      // Stream response
      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: '无法读取响应' };
        return;
      }

      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { type: 'done' };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                yield { type: 'text', text: content };
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Add assistant response to history
      if (fullResponse) {
        this.conversationHistory.push({
          role: 'assistant',
          content: fullResponse,
          timestamp: Date.now(),
        });
      }

      // Keep history manageable (last 10 messages)
      if (this.conversationHistory.length > 10) {
        this.conversationHistory = this.conversationHistory.slice(-10);
      }

      yield { type: 'done' };
    } catch (error) {
      console.error('LLM service error:', error);
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
          yield { type: 'error', error: '网络连接失败，请检查网络' };
        } else {
          yield { type: 'error', error: error.message };
        }
      } else {
        yield { type: 'error', error: '未知错误' };
      }
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Update configuration
   */
  updateConfig(config: {
    apiKey?: string;
    baseURL?: string;
    model?: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): void {
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.baseURL) this.baseURL = config.baseURL;
    if (config.model) this.model = config.model;
    if (config.systemPrompt) this.systemPrompt = config.systemPrompt;
    if (config.maxTokens !== undefined) this.maxTokens = config.maxTokens;
    if (config.temperature !== undefined) this.temperature = config.temperature;
  }
}
