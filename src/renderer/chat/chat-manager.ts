import type { Live2DScene } from '../live2d-scene';
import type { StreamChunk } from '../../shared/chat-constants';
import { ChatPanel } from './chat-panel';
import { PersonalityEngine } from '../personality/personality-engine';
import { InteractionTracker } from '../personality/interaction-tracker';

// Expression to prompt mapping
const EXPRESSION_PROMPTS: Record<string, string> = {
  'angry': '说一句生气的话，要简短可爱',
  'cat pupil': '说一句像猫咪的话，要简短可爱',
  'cry': '说一句想哭的话，要简短可爱',
  'expl': '说一句惊讶的话，要简短可爱',
  'eye glow': '说一句神秘的话，要简短可爱',
  'fluffy': '说一句毛茸茸的感觉，要简短可爱',
  'knife': '说一句调皮威胁的话，要简短可爱',
  'long': '说一句拉伸的感觉，要简短可爱',
  'no pupil': '说一句空洞的话，要简短可爱',
  'question': '说一句疑问的话，要简短可爱',
  'sad': '说一句难过的话，要简短可爱',
};

export class ChatManager {
  private panel: ChatPanel;
  private isProcessing = false;
  private unsubscribeStream: (() => void) | null = null;
  private unsubscribePersonality: (() => void) | null = null;
  private autoChatTimer: number | null = null;
  private checkInterval = 10 * 1000; // Check every 10 seconds
  private autoChatDelay = 2 * 60 * 1000; // 2 minutes of inactivity before auto-chat (will be adjusted by personality)
  private lastChatTime = 0;
  private lastUserInteractionTime = Date.now();
  private chatCooldown = 10 * 1000; // 10 seconds for both auto and click chat

  // Personality components
  private personalityEngine: PersonalityEngine;
  private interactionTracker: InteractionTracker;

  constructor(private scene: Live2DScene) {
    this.panel = new ChatPanel(() => this.scene.getHeadPosition());

    // Initialize personality engine with default values (will be updated from main process)
    this.personalityEngine = new PersonalityEngine({
      traits: {
        affection: 50,
        playfulness: 60,
        energy: 70,
        mood: 20,
        curiosity: 65,
        trust: 40,
      },
      lastUpdate: Date.now(),
      totalInteractions: 0,
      firstInteraction: Date.now(),
      daysKnown: 0,
    });

    // Initialize interaction tracker
    this.interactionTracker = new InteractionTracker((record) => {
      window.electronAPI.memory.recordInteraction(record);
    });
  }

  // Expose interaction tracker for mouse handler
  getInteractionTracker(): InteractionTracker {
    return this.interactionTracker;
  }

  async init(): Promise<void> {
    // Initialize last user interaction time
    this.lastUserInteractionTime = Date.now();

    // Check if configured
    const configured = await window.electronAPI.chat.isConfigured();

    if (!configured) {
      this.showSetupModal();
    } else {
      console.log('✅ Chat configured, starting auto-chat...');
    }

    // Listen for stream chunks
    this.unsubscribeStream = window.electronAPI.chat.onStreamChunk(
      this.onStreamChunk
    );

    // Load personality from main process
    try {
      const personalityState = await window.electronAPI.memory.getPersonality();
      if (personalityState) {
        this.personalityEngine.updateState(personalityState);
        console.log('✅ Personality loaded:', this.personalityEngine.getPersonalityDescription());
      }
    } catch (error) {
      console.error('Failed to load personality:', error);
    }

    // Listen for personality updates
    this.unsubscribePersonality = window.electronAPI.memory.onPersonalityUpdate((state) => {
      this.personalityEngine.updateState(state);
      console.log('✅ Personality updated:', this.personalityEngine.getPersonalityDescription());
    });

    // Update chat interval based on personality
    this.updateChatInterval();

    // Trigger initial chat after 3 seconds
    setTimeout(() => this.triggerAutoChat(), 3000);

    // Start periodic check for auto-chat
    this.startAutoChat();
  }

  private updateChatInterval(): void {
    const traits = this.personalityEngine.getTraits();
    window.electronAPI.memory.getChatInterval(traits).then((interval) => {
      this.checkInterval = interval;
      // Restart auto-chat timer with new interval
      if (this.autoChatTimer) {
        clearInterval(this.autoChatTimer);
      }
      this.startAutoChat();
    });
  }

  private startAutoChat(): void {
    // Check periodically if we should trigger auto-chat
    this.autoChatTimer = window.setInterval(() => {
      this.checkAndTriggerAutoChat();
    }, this.checkInterval);
  }

  private checkAndTriggerAutoChat(): void {
    const now = Date.now();
    const timeSinceLastInteraction = now - this.lastUserInteractionTime;

    // Only trigger if no interaction for 2 minutes
    if (timeSinceLastInteraction >= this.autoChatDelay) {
      this.triggerAutoChat();
    }
  }

  private async triggerAutoChat(): Promise<void> {
    // Check if pet should initiate chat based on personality
    if (!this.personalityEngine.shouldInitiateChat()) {
      return;
    }

    if (this.isProcessing) {
      console.log('⏸️ Auto-chat skipped: already processing');
      return;
    }

    const now = Date.now();
    const cooldown = this.personalityEngine.getCooldownDuration(this.chatCooldown);
    if (now - this.lastChatTime < cooldown) {
      console.log('⏸️ Auto-chat skipped: cooldown');
      return;
    }

    // First, pick and set an expression based on personality
    const expressions = this.scene.getExpressions();
    console.log('🎭 Available expressions:', expressions);
    if (expressions.length === 0) return;

    const selectedExpr = this.personalityEngine.selectExpression(expressions);
    this.scene.setExpression(selectedExpr);

    // Then generate dialogue based on the expression
    const prompt = this.getPromptForExpression(selectedExpr);
    console.log('🔄 Auto-chat trigger:', { expression: selectedExpr, prompt });
    this.lastChatTime = now;

    // Record auto-chat interaction
    this.interactionTracker.recordAutoChat();

    await this.sendMessage(prompt, selectedExpr);
  }

  /**
   * Get prompt based on expression
   */
  private getPromptForExpression(exprName: string): string {
    // Try to find exact match
    if (EXPRESSION_PROMPTS[exprName]) {
      return EXPRESSION_PROMPTS[exprName];
    }

    // Try partial match
    for (const [key, prompt] of Object.entries(EXPRESSION_PROMPTS)) {
      if (exprName.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(exprName.toLowerCase())) {
        return prompt;
      }
    }

    // Default fallback
    return '说一句简短可爱的话';
  }

  private async sendMessage(message: string, expression?: string): Promise<void> {
    this.isProcessing = true;
    console.log('📤 Sending message:', { message, expression });

    // Clear previous message
    this.panel.clearBubble();

    // Show typing indicator
    this.panel.showTyping();

    try {
      // Get current personality traits
      const traits = this.personalityEngine.getTraits();
      // Send message with personality context
      await window.electronAPI.chat.sendMessage(message, traits);
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Send message error:', error);
      this.panel.hideTyping();
      this.panel.showBubble('出错了，请稍后再试喵~');
      this.isProcessing = false;
    }
  }

  private onStreamChunk = (chunk: StreamChunk): void => {
    if (chunk.type === 'text') {
      // First text chunk - hide typing and show bubble
      this.panel.hideTyping();

      // Log the API response
      console.log('📥 API Response chunk:', chunk.text);

      // Append text to bubble
      this.panel.appendBubbleText(chunk.text || '');
    } else if (chunk.type === 'done') {
      this.isProcessing = false;
      console.log('✅ API Response complete');

      // Auto hide after delay
      this.panel.bubbleAutoHide(10);

      // Return to idle after 10s
      setTimeout(() => {
        this.scene.setState('idle');
      }, 10000);
    } else if (chunk.type === 'error') {
      this.isProcessing = false;
      console.error('❌ API Response error:', chunk.error);
      this.panel.hideTyping();
      this.panel.showBubble(chunk.error || '出错了喵~');
      this.panel.bubbleAutoHide(5);
    }
  }

  private showSetupModal(): void {
    const modal = document.createElement('div');
    modal.className = 'chat-setup-modal';

    modal.innerHTML = `
      <div class="chat-setup-content">
        <div class="chat-setup-title">🐱 设置 GLM API Key</div>
        <div class="chat-setup-description">
          请输入智谱 GLM API Key 来启用猫咪自动说话功能。<br>
          <a href="https://open.bigmodel.cn/" target="_blank" class="chat-setup-link">获取 API Key</a>
        </div>
        <div class="chat-setup-description" style="font-size: 13px; color: #888;">
          或在项目根目录创建 .env 文件：<br>
          GLM_API_KEY=你的密钥
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Auto close after 5 seconds
    setTimeout(() => {
      modal.remove();
    }, 5000);
  }

  /**
   * Trigger chat on click (single click)
   * Picks an expression based on personality and generates dialogue
   */
  async triggerClickChat(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏸️ Click chat skipped: already processing');
      return;
    }

    const now = Date.now();
    const cooldown = this.personalityEngine.getCooldownDuration(this.chatCooldown);
    if (now - this.lastChatTime < cooldown) {
      console.log('⏸️ Click chat skipped: cooldown');
      return;
    }

    const expressions = this.scene.getExpressions();
    if (expressions.length === 0) return;

    const selectedExpr = this.personalityEngine.selectExpression(expressions);
    this.scene.setExpression(selectedExpr);

    const prompt = this.getPromptForExpression(selectedExpr);
    console.log('🖱️ Click chat trigger:', { expression: selectedExpr, prompt });
    this.lastChatTime = now;
    this.lastUserInteractionTime = now;

    // Record click interaction
    this.interactionTracker.recordClick(selectedExpr);

    await this.sendMessage(prompt, selectedExpr);
  }

  /**
   * Trigger chat on double click
   * Uses excited expression
   */
  async triggerDoubleClickChat(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏸️ Double click chat skipped: already processing');
      return;
    }

    const now = Date.now();
    const cooldown = this.personalityEngine.getCooldownDuration(this.chatCooldown);
    if (now - this.lastChatTime < cooldown) {
      console.log('⏸️ Double click chat skipped: cooldown');
      return;
    }

    // Use 'knife' expression for excited state
    const expr = 'knife';
    this.scene.setExpression(expr);

    const prompt = this.getPromptForExpression(expr);
    console.log('🖱️🖱️ Double click chat trigger:', { expression: expr, prompt });
    this.lastChatTime = now;
    this.lastUserInteractionTime = now;

    // Record double-click interaction
    this.interactionTracker.recordDoubleClick(expr);

    await this.sendMessage(prompt, expr);
  }

  /**
   * Show input dialog for user to type a message
   */
  async showInput(): Promise<void> {
    // Update user interaction time when opening input
    this.lastUserInteractionTime = Date.now();

    if (this.isProcessing) {
      console.log('⏸️ Input skipped: already processing');
      return;
    }

    const userMessage = await this.panel.showInput();
    if (!userMessage) {
      console.log('❌ Input cancelled');
      return;
    }

    console.log('💬 User input:', userMessage);

    // Record chat message interaction
    this.interactionTracker.recordChatMessage(userMessage);

    await this.sendUserMessage(userMessage);
  }

  /**
   * Send user message directly (bypassing cooldown)
   */
  private async sendUserMessage(message: string): Promise<void> {
    // Update user interaction time when sending message
    this.lastUserInteractionTime = Date.now();

    this.isProcessing = true;
    console.log('📤 Sending user message:', message);

    // Clear previous message
    this.panel.clearBubble();

    // Show typing indicator
    this.panel.showTyping();

    try {
      // Get current personality traits
      const traits = this.personalityEngine.getTraits();
      await window.electronAPI.chat.sendMessage(message, traits);
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Send message error:', error);
      this.panel.hideTyping();
      this.panel.showBubble('出错了，请稍后再试喵~');
      this.isProcessing = false;
    }
  }

  destroy(): void {
    this.unsubscribeStream?.();
    this.unsubscribePersonality?.();
    if (this.autoChatTimer) {
      clearInterval(this.autoChatTimer);
    }
    this.interactionTracker.destroy();
    this.panel.destroy();
  }
}
