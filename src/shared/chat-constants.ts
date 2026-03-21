/**
 * Chat module constants and types
 */

export const CHAT_EVENTS = {
  // Config
  GET_CONFIG: 'chat:get-config',
  IS_CONFIGURED: 'chat:is-configured',

  // Messaging
  SEND_MESSAGE: 'chat:send-message',
  STREAM_CHUNK: 'chat:stream-chunk',
  MESSAGE_COMPLETE: 'chat:message-complete',
  MESSAGE_ERROR: 'chat:message-error',

  // UI Control
  CLEAR_HISTORY: 'chat:clear-history',
} as const;

export const DEFAULT_CONFIG = {
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  model: 'glm-4-flash',
  maxTokens: 300,
  temperature: 0.7,
  bubbleDuration: 8, // Auto-hide after 8 seconds
  typewriterSpeed: 2, // Chars per frame (~120ms at 60fps)
  systemPrompt: `你是一只可爱的桌面猫咪，名字叫小爪。请保持回复简短（1-2句话），语气友好、调皮。
偶尔在句尾加"喵~"。你生活在用户的桌面上，喜欢和主人聊天。`
} as const;

export type StreamChunkType = 'text' | 'done' | 'error';

export interface StreamChunk {
  type: StreamChunkType;
  text?: string;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatConfig {
  baseURL: string;
  model: string;
  maxTokens: number;
  temperature: number;
  bubbleDuration: number;
  typewriterSpeed: number;
  systemPrompt: string;
}
