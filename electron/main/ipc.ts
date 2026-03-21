import { BrowserWindow, ipcMain } from 'electron';
import { IPC_EVENTS } from '../../src/shared/constants';
import { CHAT_EVENTS } from '../../src/shared/chat-constants';
import { ConfigManager } from './config-manager';
import { LLMService } from './llm-service';

// Global instances for chat
let configManager: ConfigManager;
let llmService: LLMService;

export function initChatServices(cm: ConfigManager, llm: LLMService) {
  configManager = cm;
  llmService = llm;
}

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

  // ===== Chat IPC Handlers =====

  // Get config
  ipcMain.handle(CHAT_EVENTS.GET_CONFIG, () => {
    if (!configManager) return null;
    return configManager.getConfig();
  });

  // Check if configured
  ipcMain.handle(CHAT_EVENTS.IS_CONFIGURED, () => {
    if (!configManager) return false;
    return configManager.isConfigured();
  });

  // Send message
  ipcMain.handle(CHAT_EVENTS.SEND_MESSAGE, async (event, message: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || !llmService) {
      win?.webContents.send(CHAT_EVENTS.STREAM_CHUNK, {
        type: 'error',
        error: '服务未初始化'
      });
      return;
    }

    try {
      const stream = llmService.streamResponse(message);

      for await (const chunk of stream) {
        win.webContents.send(CHAT_EVENTS.STREAM_CHUNK, chunk);
        if (chunk.type === 'done' || chunk.type === 'error') {
          break;
        }
      }
    } catch (error) {
      win.webContents.send(CHAT_EVENTS.STREAM_CHUNK, {
        type: 'error',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  });

  // Clear history
  ipcMain.on(CHAT_EVENTS.CLEAR_HISTORY, () => {
    if (llmService) {
      llmService.clearHistory();
    }
  });
}
