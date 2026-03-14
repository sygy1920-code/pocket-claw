/**
 * Window.electronAPI 类型声明
 */
export interface ElectronAPI {
  setIgnoreMouseEvents: (ignore: boolean) => void;
  notifyPetClicked: () => void;
  showContextMenu: (x: number, y: number) => void;
  moveWindow: (dx: number, dy: number) => void;
  platform: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
