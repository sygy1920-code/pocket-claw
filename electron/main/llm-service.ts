import type { ChatMessage, StreamChunk } from '../../src/shared/chat-constants';
import type { PersonalityTraits } from '../../src/shared/memory-constants';
import type { MemoryManager } from './memory-manager';
import { SUPPORTED_EXPRESSIONS } from '../../src/shared/expression-constants';

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
  private memoryManager: MemoryManager | null = null;

  constructor(
    private apiKey: string,
    private baseURL: string,
    private model: string,
    private systemPrompt: string,
    private maxTokens: number,
    private temperature: number,
    private personalityService: any = null  // PersonalityService injected from main
  ) {}

  /**
   * Set the memory manager for persistent conversation history
   */
  setMemoryManager(manager: MemoryManager): void {
    this.memoryManager = manager;
    // Load recent context from memory
    this.loadRecentContext();
  }

  /**
   * Set the personality service for prompt generation
   */
  setPersonalityService(service: any): void {
    this.personalityService = service;
  }

  /**
   * Parse expression from response text
   * Format: [expression:expr_name]
   */
  private parseExpressionFromResponse(text: string): { expression: string | null; text: string } {
    const match = text.match(/\[expression:(.+?)\]/);
    if (match) {
      const expr = match[1].trim();
      if (SUPPORTED_EXPRESSIONS.includes(expr as any)) {
        return { expression: expr, text: text.replace(match[0], '').trim() };
      }
    }
    return { expression: null, text };
  }

  /**
   * Build system prompt with personality, time context, and memory
   */
  private buildSystemPrompt(personalityTraits?: PersonalityTraits, timeContext?: string): string {
    const parts: string[] = [];

    // Get pet info from memory
    let petName = '小爪';
    let ownerTitle = '主人';
    if (this.memoryManager) {
      const petInfo = this.memoryManager.getPetInfo();
      petName = petInfo.petName;
      ownerTitle = petInfo.ownerTitle;
    }

    // Build base prompt with pet info
    const basePrompt = this.systemPrompt
      .replace(/小爪/g, petName)
      .replace(/主人/g, ownerTitle);
    parts.push(basePrompt);

    // Add personality modifier
    if (personalityTraits && this.personalityService) {
      const personalityDesc = this.personalityService.getPersonalityPromptModifier(personalityTraits);
      if (personalityDesc) {
        parts.push(personalityDesc);
      }
    }

    // Add time context
    if (timeContext) {
      parts.push(timeContext);
    }

    // Add memory context (summaries and stats)
    if (this.memoryManager) {
      const summaries = this.memoryManager.getConversationSummaries();
      if (summaries.length > 0) {
        const recentSummaries = summaries.slice(-3).map(s =>
          `${s.date}: ${s.mood}, 聊了${s.topics.join('、')}`
        ).join('; ');
        parts.push(`最近聊天: ${recentSummaries}`);
      }

      const stats = this.memoryManager.getStats();
      if (stats.daysKnown > 0) {
        parts.push(`你认识主人${stats.daysKnown}天了。`);
      }
    }

    // Add expression instructions with examples
    parts.push(`\n【表情指令】`);
    parts.push(`每次回复时，根据内容和心情，在回复最开头使用 [expression:表情名] 来指定表情。`);
    parts.push(`可用表情: ${SUPPORTED_EXPRESSIONS.join(', ')}`);
    parts.push(`\n示例:`);
    parts.push(`- [expression:cat pupil] ${ownerTitle}好呀喵~`);
    parts.push(`- [expression:question] 什么意思喵？`);
    parts.push(`- [expression:knife] 再不理我，我要生气了喵！`);
    parts.push(`- [expression:sad] 好像没人陪我玩...`);
    parts.push(`\n请确保每次回复都以表情指令开头。`);

    return parts.join('\n');
  }

  /**
   * Load recent conversation context from memory manager
   */
  private loadRecentContext(): void {
    if (!this.memoryManager) return;

    const recentMessages = this.memoryManager.getRecentContext(20);
    if (recentMessages.length > 0) {
      this.conversationHistory = recentMessages;
      console.log(`Loaded ${recentMessages.length} messages from memory`);
    }
  }

  /**
   * Send a message and stream the response
   */
  async *streamResponse(
    userMessage: string,
    personalityTraits?: PersonalityTraits,
    timeContext?: string
  ): AsyncGenerator<StreamChunk> {
    // Add user message to history
    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    this.conversationHistory.push(userMsg);

    // Save to memory manager
    if (this.memoryManager) {
      this.memoryManager.addChatMessage(userMsg);
    }

    // Build system prompt with personality and time context
    const systemPrompt = this.buildSystemPrompt(personalityTraits, timeContext);

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
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

      // Stream response with 1s buffer delay to ensure expression tags are complete
      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: '无法读取响应' };
        return;
      }

      const decoder = new TextDecoder();
      let fullResponse = '';
      const bufferDelay = 1000; // 1 second buffer
      let bufferTimer: NodeJS.Timeout | null = null;
      let streamComplete = false;

      // Read stream in background
      const readStream = async (): Promise<void> => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            streamComplete = true;
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                streamComplete = true;
                break;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }

          // If we have content and stream is complete, break early
          if (streamComplete) break;
        }
      };

      // Start reading stream
      const readPromise = readStream();

      // Wait for buffer delay or stream completion
      await new Promise<void>((resolve) => {
        const checkAndResolve = () => {
          if (streamComplete || fullResponse.length > 0) {
            // If stream is complete or we have some content, wait buffer delay
            bufferTimer = setTimeout(() => {
              resolve();
            }, bufferDelay);
          } else {
            // No content yet, check again soon
            setTimeout(checkAndResolve, 50);
          }
        };
        checkAndResolve();
      });

      // Wait for stream to fully complete
      await readPromise;

      // Clear buffer timer
      if (bufferTimer) {
        clearTimeout(bufferTimer);
      }

      // Now process the complete response
      if (fullResponse) {
        // Parse expression and send first
        const { expression, text: cleanText } = this.parseExpressionFromResponse(fullResponse);
        if (expression) {
          yield { type: 'expression', expression };
        }

        // Send clean text (without expression tags)
        if (cleanText) {
          yield { type: 'text', text: cleanText };
        }

        // Add to history
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: cleanText,
          timestamp: Date.now(),
        };
        this.conversationHistory.push(assistantMsg);

        // Save to memory manager
        if (this.memoryManager) {
          this.memoryManager.addChatMessage(assistantMsg);
        }
      }

      // Keep history manageable (last 20 messages)
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
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
