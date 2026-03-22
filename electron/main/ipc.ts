import { BrowserWindow, ipcMain } from 'electron';
import { IPC_EVENTS } from '../../src/shared/constants';
import { CHAT_EVENTS } from '../../src/shared/chat-constants';
import { MEMORY_EVENTS } from '../../src/shared/memory-constants';
import { ConfigManager } from './config-manager';
import { LLMService } from './llm-service';
import { MemoryManager } from './memory-manager';
import { PersonalityService } from './personality-service';
import type { PersonalityTraits, InteractionRecord } from '../../src/shared/memory-constants';

// Global instances
let configManager: ConfigManager;
let llmService: LLMService;
let memoryManager: MemoryManager;
let personalityService: PersonalityService;

export function initChatServices(cm: ConfigManager, llm: LLMService) {
  configManager = cm;
  llmService = llm;
}

export function initMemoryServices(mm: MemoryManager, ps: PersonalityService) {
  memoryManager = mm;
  personalityService = ps;

  // Inject personality service into LLM service
  if (llmService) {
    llmService.setPersonalityService(ps);
  }
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

  // Set API Key
  ipcMain.on(CHAT_EVENTS.SET_API_KEY, (_event, apiKey: string) => {
    if (!configManager || !llmService) return;
    configManager.setApiKey(apiKey);
    // Update LLM service with new API key
    llmService.updateConfig({ apiKey });
    console.log('✅ API Key updated in LLMService');
  });

  // Send message
  ipcMain.handle(CHAT_EVENTS.SEND_MESSAGE, async (event, message: string, personalityTraits?: PersonalityTraits, timeContext?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || !llmService) {
      win?.webContents.send(CHAT_EVENTS.STREAM_CHUNK, {
        type: 'error',
        error: '服务未初始化'
      });
      return;
    }

    try {
      const stream = llmService.streamResponse(message, personalityTraits, timeContext);

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

  // ===== Memory & Personality IPC Handlers =====

  // Get memory data
  ipcMain.handle(MEMORY_EVENTS.GET_MEMORY, () => {
    if (!memoryManager) return null;
    return memoryManager.getMemory();
  });

  // Get personality state
  ipcMain.handle(MEMORY_EVENTS.GET_PERSONALITY, () => {
    if (!memoryManager) return null;
    return memoryManager.getPersonality();
  });

  // Update personality traits
  ipcMain.on(MEMORY_EVENTS.UPDATE_PERSONALITY, (_event, traits: Partial<PersonalityTraits>) => {
    if (!memoryManager) return;
    memoryManager.updatePersonality(traits);
  });

  // Record interaction
  ipcMain.on(MEMORY_EVENTS.RECORD_INTERACTION, (_event, interaction: InteractionRecord) => {
    if (!memoryManager || !personalityService) return;

    // Record the interaction
    memoryManager.recordInteraction(interaction);

    // Calculate and apply personality changes
    const currentTraits = memoryManager.getPersonality().traits;
    const changes = personalityService.calculatePersonalityChange(
      currentTraits,
      interaction.type,
      interaction.data
    );

    if (Object.keys(changes).length > 0) {
      memoryManager.updatePersonality(changes);

      // Notify renderer of personality update
      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        win.webContents.send('personality:updated', memoryManager.getPersonality());
      }
    }
  });

  // Get stats
  ipcMain.handle(MEMORY_EVENTS.GET_STATS, () => {
    if (!memoryManager) return null;
    return memoryManager.getStats();
  });

  // Reset memory
  ipcMain.on(MEMORY_EVENTS.RESET_MEMORY, () => {
    if (!memoryManager) return;
    memoryManager.resetMemory();

    // Notify renderer
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('memory:reset');
    }
  });

  // Generate daily summary
  ipcMain.on(MEMORY_EVENTS.GENERATE_DAILY_SUMMARY, () => {
    if (!memoryManager) return;
    memoryManager.generateDailySummary();
  });

  // Get chat interval based on personality
  ipcMain.handle(MEMORY_EVENTS.GET_CHAT_INTERVAL, (_event, traits: PersonalityTraits) => {
    if (!personalityService) return 60000;
    return personalityService.getChatInterval(traits);
  });

  // Get prompt modifier based on personality
  ipcMain.handle(MEMORY_EVENTS.GET_PROMPT_MODIFIER, (_event, traits: PersonalityTraits) => {
    if (!personalityService) return '';
    return personalityService.getPersonalityPromptModifier(traits);
  });

  // Get pet info (name and owner title)
  ipcMain.handle(MEMORY_EVENTS.GET_PET_INFO, () => {
    if (!memoryManager) return { petName: '小爪', ownerTitle: '主人' };
    return memoryManager.getPetInfo();
  });

  // Set pet info (name and owner title)
  ipcMain.on(MEMORY_EVENTS.SET_PET_INFO, (_event, petName: string, ownerTitle: string) => {
    if (!memoryManager) return;
    memoryManager.setPetInfo(petName, ownerTitle);
  });
}
