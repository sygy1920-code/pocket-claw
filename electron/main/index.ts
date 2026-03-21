import { app, BrowserWindow, screen } from 'electron';
import { join } from 'path';
import { setupPlatformSpecifics } from './platform';
import { setupIpcHandlers, initChatServices } from './ipc';
import { createTray } from './tray';
import { ConfigManager } from './config-manager';
import { LLMService } from './llm-service';
import { DEFAULT_CONFIG } from '../../src/shared/chat-constants';

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width: 300,
    height: 400,
    x: width - 320,
    y: height - 420,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      sandbox: false,
      devTools: true // Enable DevTools
    }
  });

  setupPlatformSpecifics(win);
  win.setAlwaysOnTop(true, 'floating');

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  // 初始鼠标穿透
  win.setIgnoreMouseEvents(true, { forward: true });

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

// 环境检测
if (process.env['ELECTRON_RUN_AS_NODE']) {
  console.error('❌ 错误: ELECTRON_RUN_AS_NODE 环境变量被设置');
  console.error('');
  console.error('这会导致 Electron 以 Node.js 模式运行，而不是 GUI 模式。');
  console.error('');
  console.error('解决方法:');
  console.error('  1. 运行: npm run dev');
  console.error('  2. 或: ./START.sh');
  console.error('  3. 或: ELECTRON_RUN_AS_NODE= npm run dev');
  console.error('');
  console.error('不要直接运行: node out/main/index.js 或 electron out/main/index.js');
  console.error('');
  process.exit(1);
}

// 验证 Electron API 是否可用
if (typeof app === 'undefined') {
  console.error('❌ 错误: Electron API 不可用');
  console.error('');
  console.error('当前运行环境不正确。');
  console.error('');
  console.error('请确保:');
  console.error('  1. 使用 npm run dev 启动（不是直接运行编译后的文件）');
  console.error('  2. ELECTRON_RUN_AS_NODE 环境变量未被设置');
  console.error('  3. 在正确的项目目录中运行');
  console.error('');
  console.error('调试信息:');
  console.error('  process.versions.electron:', process.versions.electron || '未定义');
  console.error('  process.env.ELECTRON_RUN_AS_NODE:', process.env.ELECTRON_RUN_AS_NODE || '未设置');
  console.error('');
  process.exit(1);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Initialize chat services
    const configManager = new ConfigManager();
    const config = configManager.getConfig();
    const llmService = new LLMService(
      configManager.getApiKey(),
      config.baseURL,
      config.model,
      config.systemPrompt,
      config.maxTokens,
      config.temperature
    );

    mainWindow = createMainWindow();
    createTray(mainWindow);
    setupIpcHandlers(mainWindow);
    initChatServices(configManager, llmService);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
}
