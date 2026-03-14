import { BrowserWindow, ipcMain } from 'electron';
import { IPC_EVENTS } from '../../src/shared/constants';

export function setupIpcHandlers(_mainWindow: BrowserWindow): void {
  // 鼠标穿透切换
  ipcMain.on(IPC_EVENTS.SET_IGNORE_MOUSE_EVENTS, (event, ignore: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });

  // 宠物点击通知
  ipcMain.on(IPC_EVENTS.PET_CLICKED, () => {
    // 可以在这里添加音效或其他主进程响应
  });

  // 上下文菜单
  ipcMain.on(IPC_EVENTS.SHOW_CONTEXT_MENU, (event, x: number, y: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const [wx, wy] = win.getPosition();
    console.log('Context menu at screen:', wx + x, wy + y);
  });

  // 窗口拖拽移动
  ipcMain.on(IPC_EVENTS.MOVE_WINDOW, (event, dx: number, dy: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const [x, y] = win.getPosition();
    win.setPosition(x + dx, y + dy);
  });
}
