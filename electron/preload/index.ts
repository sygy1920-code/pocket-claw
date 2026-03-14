import { contextBridge, ipcRenderer } from 'electron';

const IPC_EVENTS = {
  SET_IGNORE_MOUSE_EVENTS: 'set-ignore-mouse-events',
  PET_CLICKED: 'pet-clicked',
  SHOW_CONTEXT_MENU: 'show-context-menu',
  MOVE_WINDOW: 'move-window'
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
  platform: process.platform
});
