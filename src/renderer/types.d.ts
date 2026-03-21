/**
 * Window.electronAPI 类型声明
 */
import type { ChatConfig, StreamChunk } from '../shared/chat-constants';

export interface ChatAPI {
  getConfig: () => Promise<ChatConfig | null>;
  isConfigured: () => Promise<boolean>;
  sendMessage: (message: string) => Promise<void>;
  clearHistory: () => void;
  onStreamChunk: (callback: (chunk: StreamChunk) => void) => () => void;
}

export interface ElectronAPI {
  setIgnoreMouseEvents: (ignore: boolean) => void;
  notifyPetClicked: () => void;
  showContextMenu: (x: number, y: number) => void;
  moveWindow: (dx: number, dy: number) => void;
  platform: string;
  chat: ChatAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
