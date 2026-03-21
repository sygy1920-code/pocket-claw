import { app } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import type {
  MemoryData,
  PersonalityState,
  InteractionRecord,
  ChatMessage,
  PersonalityTraits,
  ConversationSummary,
} from '../../src/shared/memory-constants';
import { DEFAULT_PERSONALITY } from '../../src/shared/memory-constants';

/**
 * Manages persistent storage for pet memory and personality data
 */
export class MemoryManager {
  private memoryFilePath: string;
  private memoryData: MemoryData;
  private saveTimer: NodeJS.Timeout | null = null;
  private summaryTimer: NodeJS.Timeout | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    const memoryDir = join(userDataPath, 'memory');

    if (!existsSync(memoryDir)) {
      mkdirSync(memoryDir, { recursive: true });
    }

    this.memoryFilePath = join(memoryDir, 'pet-memory.json');
    this.memoryData = this.loadMemory();

    // Check if we need to generate a daily summary
    this.checkAndGenerateSummary();

    // Start hourly check for summary generation
    this.startSummaryCheck();
  }

  private loadMemory(): MemoryData {
    if (existsSync(this.memoryFilePath)) {
      try {
        const data = readFileSync(this.memoryFilePath, 'utf-8');
        const parsed = JSON.parse(data);

        // Validate and fix data structure
        if (!parsed.personality) {
          console.warn('Invalid memory file: missing personality, using default');
          parsed.personality = this.createDefaultPersonalityState();
        }

        if (!parsed.interactions) {
          parsed.interactions = [];
        }

        if (!parsed.conversationSummaries) {
          parsed.conversationSummaries = [];
        }

        if (!parsed.recentMessages) {
          parsed.recentMessages = [];
        }

        if (!parsed.favoriteExpressions) {
          parsed.favoriteExpressions = {};
        }

        if (!parsed.ignoredCount) {
          parsed.ignoredCount = 0;
        }

        if (!parsed.lastSeen) {
          parsed.lastSeen = Date.now();
        }

        if (!parsed.lastSummaryDate) {
          parsed.lastSummaryDate = null;
        }

        console.log('Memory loaded successfully');
        return parsed;
      } catch (error) {
        console.error('Failed to load memory:', error);
      }
    }

    return this.createDefaultMemory();
  }

  private createDefaultPersonalityState(): PersonalityState {
    return {
      traits: { ...DEFAULT_PERSONALITY },
      lastUpdate: Date.now(),
      totalInteractions: 0,
      firstInteraction: Date.now(),
      daysKnown: 0,
    };
  }

  private createDefaultMemory(): MemoryData {
    return {
      personality: this.createDefaultPersonalityState(),
      interactions: [],
      conversationSummaries: [],
      recentMessages: [],
      favoriteExpressions: {},
      ignoredCount: 0,
      lastSeen: Date.now(),
      lastSummaryDate: null,
    };
  }

  private scheduleSave(immediate = false): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    if (immediate) {
      this.saveMemory();
    } else {
      // Debounce saves to avoid excessive disk writes
      this.saveTimer = setTimeout(() => {
        this.saveMemory();
      }, 5000);
    }
  }

  private saveMemory(): void {
    try {
      const dataToSave = {
        ...this.memoryData,
        favoriteExpressions: Object.fromEntries(
          Object.entries(this.memoryData.favoriteExpressions)
        ),
      };

      writeFileSync(this.memoryFilePath, JSON.stringify(dataToSave, null, 2));
      console.log('Memory saved successfully');
    } catch (error) {
      console.error('Failed to save memory:', error);
    }
  }

  private startSummaryCheck(): void {
    // Check every hour if we need to generate a summary
    this.summaryTimer = setInterval(() => {
      this.checkAndGenerateSummary();
    }, 60 * 60 * 1000);
  }

  private checkAndGenerateSummary(): void {
    const today = this.getDateString(Date.now());

    // If we haven't generated a summary today, and we have messages
    if (
      this.memoryData.lastSummaryDate !== today &&
      this.memoryData.recentMessages.length > 0
    ) {
      console.log('Generating daily summary...');
      this.generateDailySummary();
    }
  }

  private getDateString(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Generate a daily summary from recent messages and clear old messages
   */
  generateDailySummary(): void {
    if (this.memoryData.recentMessages.length === 0) {
      return;
    }

    const today = this.getDateString(Date.now());

    // Extract topics from messages (simple keyword extraction)
    const topics = this.extractTopics(this.memoryData.recentMessages);

    // Determine overall mood from personality
    const mood = this.getMoodDescription(this.memoryData.personality.traits.mood);

    // Check for special events
    const specialEvents: string[] = [];

    // Check if it's the first day
    if (this.memoryData.conversationSummaries.length === 0) {
      specialEvents.push('第一次和主人聊天');
    }

    // Check for high interaction day
    const todayInteractions = this.memoryData.interactions.filter((i) => {
      return this.getDateString(i.timestamp) === today;
    });
    if (todayInteractions.length > 20) {
      specialEvents.push('今天和主人互动了很多次');
    }

    // Create summary
    const summary: ConversationSummary = {
      date: today,
      topics,
      mood,
      specialEvents,
    };

    this.memoryData.conversationSummaries.push(summary);

    // Keep only last 30 summaries
    if (this.memoryData.conversationSummaries.length > 30) {
      this.memoryData.conversationSummaries =
        this.memoryData.conversationSummaries.slice(-30);
    }

    // Clear recent messages (they're now summarized)
    this.memoryData.recentMessages = [];
    this.memoryData.lastSummaryDate = today;

    // Save immediately
    this.scheduleSave(true);

    console.log('Daily summary generated:', summary);
  }

  private extractTopics(messages: ChatMessage[]): string[] {
    const topics: string[] = [];
    const keywords = [
      '吃饭',
      '睡觉',
      '玩',
      '开心',
      '难过',
      '生气',
      '喜欢',
      '讨厌',
      '工作',
      '学习',
      '天气',
      '时间',
      '名字',
      '主人',
    ];

    for (const message of messages) {
      for (const keyword of keywords) {
        if (message.content.includes(keyword) && !topics.includes(keyword)) {
          topics.push(keyword);
          if (topics.length >= 5) break;
        }
      }
      if (topics.length >= 5) break;
    }

    return topics.length > 0 ? topics : ['日常聊天'];
  }

  private getMoodDescription(mood: number): string {
    if (mood > 30) return '很开心';
    if (mood > 10) return '心情不错';
    if (mood > -10) return '心情平静';
    if (mood > -30) return '有点低落';
    return '很伤心';
  }

  // Public API

  getMemory(): MemoryData {
    return { ...this.memoryData };
  }

  getPersonality(): PersonalityState {
    return { ...this.memoryData.personality };
  }

  recordInteraction(interaction: InteractionRecord): void {
    this.memoryData.interactions.push(interaction);
    this.memoryData.personality.totalInteractions++;
    this.memoryData.lastSeen = interaction.timestamp;

    // Keep only last 1000 interactions
    if (this.memoryData.interactions.length > 1000) {
      this.memoryData.interactions = this.memoryData.interactions.slice(-1000);
    }

    this.scheduleSave();
  }

  updatePersonality(traits: Partial<PersonalityTraits>): void {
    this.memoryData.personality.traits = {
      ...this.memoryData.personality.traits,
      ...traits,
    };
    this.memoryData.personality.lastUpdate = Date.now();

    // Update days known
    const daysSinceFirst = Math.floor(
      (Date.now() - this.memoryData.personality.firstInteraction) /
        (1000 * 60 * 60 * 24)
    );
    this.memoryData.personality.daysKnown = daysSinceFirst;

    this.scheduleSave();
  }

  addChatMessage(message: ChatMessage): void {
    this.memoryData.recentMessages.push(message);

    // Keep only recent messages (we'll summarize periodically)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.memoryData.recentMessages = this.memoryData.recentMessages.filter(
      (m) => m.timestamp > oneDayAgo
    );

    this.scheduleSave();
  }

  getRecentContext(limit: number = 10): ChatMessage[] {
    return this.memoryData.recentMessages.slice(-limit);
  }

  getConversationSummaries(): ConversationSummary[] {
    return [...this.memoryData.conversationSummaries];
  }

  incrementIgnoredCount(): void {
    this.memoryData.ignoredCount++;
    this.scheduleSave();
  }

  getStats(): {
    totalInteractions: number;
    daysKnown: number;
    ignoredCount: number;
    favoriteExpression: string | null;
    recentChats: number;
  } {
    const favExpr = this.memoryData.favoriteExpressions;
    const favoriteExpression =
      Object.keys(favExpr).length > 0
        ? Object.entries(favExpr).sort((a, b) => b[1] - a[1])[0][0]
        : null;

    return {
      totalInteractions: this.memoryData.personality.totalInteractions,
      daysKnown: this.memoryData.personality.daysKnown,
      ignoredCount: this.memoryData.ignoredCount,
      favoriteExpression,
      recentChats: this.memoryData.recentMessages.length,
    };
  }

  resetMemory(): void {
    this.memoryData = this.createDefaultMemory();
    this.saveMemory();
  }

  destroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    if (this.summaryTimer) {
      clearInterval(this.summaryTimer);
    }
    // Save one last time
    this.saveMemory();
  }
}
