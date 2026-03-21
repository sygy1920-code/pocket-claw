/**
 * Memory and Personality system types and constants
 */

// Personality traits (0-100, except mood which is -50 to 50)
export interface PersonalityTraits {
  affection: number;    // 亲密度 - 猫咪对主人的喜爱程度
  playfulness: number;  // 顽皮度 - 影响互动频率和主动聊天
  energy: number;       // 活力值 - 影响动画速度和响应积极性
  mood: number;         // 心情 (-50~50) - 负数表示难过/生气
  curiosity: number;    // 好奇心 - 影响主动发问和探索行为
  trust: number;        // 信任度 - 影响回复深度和个性化
}

export interface PersonalityState {
  traits: PersonalityTraits;
  lastUpdate: number;
  totalInteractions: number;
  firstInteraction: number;
  daysKnown: number;
}

// Interaction types
export type InteractionType =
  | 'click'
  | 'double_click'
  | 'hover'
  | 'drag'
  | 'chat_message'
  | 'right_click'
  | 'auto_chat'
  | 'ignore';

export interface InteractionRecord {
  id: string;
  type: InteractionType;
  timestamp: number;
  data?: {
    duration?: number;
    message?: string;
    expression?: string;
  };
}

// Conversation summary (replaces long-term history)
export interface ConversationSummary {
  date: string;           // YYYY-MM-DD
  topics: string[];       // 聊天主题关键词
  mood: string;           // 当天整体心情
  specialEvents: string[]; // 特殊事件记录
}

// Reuse ChatMessage from chat-constants
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface MemoryData {
  personality: PersonalityState;
  interactions: InteractionRecord[];
  conversationSummaries: ConversationSummary[];  // 替代长期历史
  recentMessages: ChatMessage[];                  // 仅保留1天
  favoriteExpressions: Record<string, number>;
  ignoredCount: number;
  lastSeen: number;
  lastSummaryDate: string | null;  // 上次生成摘要的日期
}

// IPC events
export const MEMORY_EVENTS = {
  GET_MEMORY: 'memory:get',
  GET_PERSONALITY: 'personality:get',
  UPDATE_PERSONALITY: 'personality:update',
  RECORD_INTERACTION: 'interaction:record',
  GET_STATS: 'stats:get',
  RESET_MEMORY: 'memory:reset',
  GENERATE_DAILY_SUMMARY: 'summary:generate',
  GET_CHAT_INTERVAL: 'personality:get-chat-interval',
  GET_PROMPT_MODIFIER: 'personality:get-prompt-modifier',
} as const;

// Default personality values
export const DEFAULT_PERSONALITY: PersonalityTraits = {
  affection: 50,
  playfulness: 60,
  energy: 70,
  mood: 20,
  curiosity: 65,
  trust: 40,
};

// Personality thresholds
export const PERSONALITY_THRESHOLDS = {
  HIGH: 80,
  MEDIUM_HIGH: 65,
  MEDIUM: 50,
  MEDIUM_LOW: 35,
  LOW: 20,
} as const;
