/**
 * Window.electronAPI 类型声明
 */
import type { ChatConfig, StreamChunk } from '../shared/chat-constants';
import type {
  PersonalityState,
  PersonalityTraits,
  InteractionRecord,
  MemoryData,
} from '../shared/memory-constants';

export interface ChatAPI {
  getConfig: () => Promise<ChatConfig | null>;
  isConfigured: () => Promise<boolean>;
  setApiKey: (apiKey: string) => void;
  sendMessage: (message: string, personalityTraits?: PersonalityTraits, timeContext?: string) => Promise<void>;
  clearHistory: () => void;
  onStreamChunk: (callback: (chunk: StreamChunk) => void) => () => void;
}

export interface MemoryAPI {
  getMemory: () => Promise<MemoryData | null>;
  getPersonality: () => Promise<PersonalityState | null>;
  updatePersonality: (traits: Partial<PersonalityTraits>) => void;
  recordInteraction: (interaction: InteractionRecord) => void;
  getStats: () => Promise<{
    totalInteractions: number;
    daysKnown: number;
    ignoredCount: number;
    favoriteExpression: string | null;
    recentChats: number;
  } | null>;
  resetMemory: () => void;
  getChatInterval: (traits: PersonalityTraits) => Promise<number>;
  getPromptModifier: (traits: PersonalityTraits) => Promise<string>;
  getPetInfo: () => Promise<{ petName: string; ownerTitle: string }>;
  setPetInfo: (petName: string, ownerTitle: string) => void;
  onPersonalityUpdate: (callback: (state: PersonalityState) => void) => () => void;
}

export interface ElectronAPI {
  setIgnoreMouseEvents: (ignore: boolean) => void;
  notifyPetClicked: () => void;
  showContextMenu: (x: number, y: number) => void;
  moveWindow: (dx: number, dy: number) => void;
  platform: string;
  chat: ChatAPI;
  memory: MemoryAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
