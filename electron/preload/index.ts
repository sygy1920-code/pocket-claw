import { contextBridge, ipcRenderer } from 'electron';

const IPC_EVENTS = {
  SET_IGNORE_MOUSE_EVENTS: 'set-ignore-mouse-events',
  PET_CLICKED: 'pet-clicked',
  SHOW_CONTEXT_MENU: 'show-context-menu',
  MOVE_WINDOW: 'move-window'
} as const;

const CHAT_EVENTS = {
  GET_CONFIG: 'chat:get-config',
  IS_CONFIGURED: 'chat:is-configured',
  SEND_MESSAGE: 'chat:send-message',
  STREAM_CHUNK: 'chat:stream-chunk',
  CLEAR_HISTORY: 'chat:clear-history',
} as const;

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore: boolean) => {
    ipcRenderer.send(IPC_EVENTS.SET_IGNORE_MOUSE_EVENTS, ignore);
  },
  notifyPetClicked: () => {
    ipcRenderer.send(IPC_EVENTS.PET_CLICKED);
  },
  showContextMenu: (x: number, y: number) => {
    ipcRenderer.send(IPC_EVENTS.SHOW_CONTEXT_MENU, x, y);
  },
  moveWindow: (dx: number, dy: number) => {
    ipcRenderer.send(IPC_EVENTS.MOVE_WINDOW, dx, dy);
  },
  platform: process.platform,

  // Chat API
  chat: {
    getConfig: () => ipcRenderer.invoke(CHAT_EVENTS.GET_CONFIG),
    isConfigured: () => ipcRenderer.invoke(CHAT_EVENTS.IS_CONFIGURED),
    sendMessage: (message: string) => ipcRenderer.invoke(CHAT_EVENTS.SEND_MESSAGE, message),
    clearHistory: () => ipcRenderer.send(CHAT_EVENTS.CLEAR_HISTORY),
    onStreamChunk: (callback: (chunk: any) => void) => {
      const listener = (_event: any, chunk: any) => callback(chunk);
      ipcRenderer.on(CHAT_EVENTS.STREAM_CHUNK, listener);
      return () => ipcRenderer.removeListener(CHAT_EVENTS.STREAM_CHUNK, listener);
    },
  }
});
