import type { Live2DScene } from '../live2d-scene';
import type { StreamChunk } from '../../shared/chat-constants';
import { ChatBubble } from './chat-bubble';
import { TypingIndicator } from './typing-indicator';

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

const DEFAULT_EXPRESSIONS = ['angry', 'cat pupil', 'cry', 'expl', 'eye glow', 'fluffy', 'knife', 'long', 'no pupil', 'question', 'sad'];

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

    // First, pick and set a random expression
    const expressions = this.scene.getExpressions();
    console.log('🎭 Available expressions:', expressions);
    if (expressions.length === 0) return;

    const randomExpr = expressions[Math.floor(Math.random() * expressions.length)];
    this.scene.setExpression(randomExpr);

    // Then generate dialogue based on the expression
    const prompt = this.getPromptForExpression(randomExpr);
    console.log('🔄 Auto-chat trigger:', { expression: randomExpr, prompt });
    await this.sendMessage(prompt, randomExpr);
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

    // Show typing indicator
    this.typing.show();

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

      // Return to idle after 10s
      setTimeout(() => {
        this.scene.setState('idle');
      }, 10000);
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
