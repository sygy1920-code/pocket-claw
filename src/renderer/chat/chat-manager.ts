import type { Live2DScene } from '../live2d-scene';
import type { StreamChunk } from '../../shared/chat-constants';
import { ChatBubble } from './chat-bubble';
import { TypingIndicator } from './typing-indicator';

// Random prompts for auto-chat
const AUTO_CHAT_PROMPTS = [
  '说一句简短的问候',
  '说一句调皮的话',
  '说说你现在在做什么',
  '说一句可爱的话',
  '说一句想睡觉的话',
  '说一句想吃东西的话',
  '说一句关于天气的话',
  '说一句无聊的话',
  '说一句开心的话',
];

export class ChatManager {
  private bubble: ChatBubble;
  private typing: TypingIndicator;
  private isProcessing = false;
  private unsubscribeStream: (() => void) | null = null;
  private autoChatTimer: number | null = null;
  private chatInterval = 60 * 1000; // 1 minute

  constructor(private scene: Live2DScene) {
    this.bubble = new ChatBubble(() => this.scene.getHeadPosition());
    this.typing = new TypingIndicator(() => this.scene.getHeadPosition());
  }

  async init(): Promise<void> {
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

    // Start auto-chat regardless of config (will fail gracefully)
    this.startAutoChat();
  }

  private startAutoChat(): void {
    // Initial message after a short delay
    setTimeout(() => this.triggerAutoChat(), 3000);

    // Then every minute
    this.autoChatTimer = window.setInterval(() => {
      this.triggerAutoChat();
    }, this.chatInterval);
  }

  private async triggerAutoChat(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏸️ Auto-chat skipped: already processing');
      return;
    }

    // Pick a random prompt
    const prompt = AUTO_CHAT_PROMPTS[Math.floor(Math.random() * AUTO_CHAT_PROMPTS.length)];
    console.log('🔄 Auto-chat trigger:', prompt);
    await this.sendMessage(prompt);
  }

  private async sendMessage(message: string): Promise<void> {
    this.isProcessing = true;
    console.log('📤 Sending message:', message);

    // Show typing indicator
    this.typing.show();

    // Make pet excited
    this.scene.setState('happy');

    try {
      await window.electronAPI.chat.sendMessage(message);
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Send message error:', error);
      this.typing.hide();
      this.bubble.show('出错了，请稍后再试喵~');
      this.isProcessing = false;
    }
  }

  private onStreamChunk = (chunk: StreamChunk): void => {
    if (chunk.type === 'text') {
      // First text chunk - hide typing and show bubble
      if (this.typing) {
        this.typing.hide();
      }

      // Append text to bubble
      this.bubble.appendText(chunk.text || '');
    } else if (chunk.type === 'done') {
      this.isProcessing = false;

      // Auto hide after delay
      this.bubble.autoHide(10);

      // Return to idle after a while
      setTimeout(() => {
        this.scene.setState('idle');
      }, 2000);
    } else if (chunk.type === 'error') {
      this.isProcessing = false;
      this.typing.hide();
      this.bubble.show(chunk.error || '出错了喵~');
      this.bubble.autoHide(5);
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

  destroy(): void {
    this.unsubscribeStream?.();
    if (this.autoChatTimer) {
      clearInterval(this.autoChatTimer);
    }
    this.bubble.destroy();
    this.typing.destroy();
  }
}
