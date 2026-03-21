import { DEFAULT_CONFIG } from '../../shared/chat-constants';

/**
 * Unified chat panel that contains both input and bubble
 * Ensures they are always properly positioned relative to each other
 */
export class ChatPanel {
  private panelEl: HTMLElement | null = null;
  private bubbleContentEl: HTMLElement | null = null;
  private inputContainerEl: HTMLElement | null = null;
  private textareaEl: HTMLTextAreaElement | null = null;
  private sendBtnEl: HTMLButtonElement | null = null;
  private typingIndicatorEl: HTMLElement | null = null;

  // State
  private isInputVisible = false;
  private isBubbleVisible = false;
  private isTypingVisible = false;

  // Auto-hide
  private autoHideTimer: number | null = null;
  private typewriterTimer: number | null = null;
  private currentText = '';

  // Input promise
  private inputResolve: ((value: string | null) => void) | null = null;

  constructor(private getHeadPosition: () => { x: number; y: number }) {}

  /**
   * Show input popup and wait for user input
   */
  async showInput(): Promise<string | null> {
    if (this.isInputVisible) return null;

    this.ensureElement();
    this.isInputVisible = true;

    // Clear previous input
    if (this.textareaEl) {
      this.textareaEl.value = '';
      this.textareaEl.style.height = 'auto';
    }

    // Show input
    this.inputContainerEl!.style.display = 'flex';
    this.panelEl!.classList.add('chat-panel-input-visible');

    // Make panel visible when input is shown
    this.panelEl!.style.opacity = '1';
    this.panelEl!.style.transform = 'translateY(0)';

    this.updatePosition();
    this.textareaEl?.focus();

    // Clear any existing outside click listener before adding new one
    document.removeEventListener('click', this.onOutsideClick);

    return new Promise((resolve) => {
      this.inputResolve = resolve;

      // Auto-hide on outside click after a short delay
      setTimeout(() => {
        // Only add listener if input is still visible
        if (this.isInputVisible) {
          document.addEventListener('click', this.onOutsideClick);
        }
      }, 100);
    });
  }

  /**
   * Hide input popup
   */
  hideInput(): void {
    this.resolveInput(null);
  }

  isInputDialogVisible(): boolean {
    return this.isInputVisible;
  }

  /**
   * Show bubble with text
   */
  showBubble(text: string, options: {
    autoHide?: number;
    typewriter?: boolean;
    speed?: number;
  } = {}): void {
    const {
      autoHide = DEFAULT_CONFIG.bubbleDuration,
      typewriter = true,
      speed = DEFAULT_CONFIG.typewriterSpeed
    } = options;

    this.ensureElement();
    this.clearAutoHide();

    // Clear previous content
    this.bubbleContentEl!.textContent = '';

    this.isBubbleVisible = true;
    // Show the bubble element, not the entire panel
    const bubbleEl = this.panelEl!.querySelector('.chat-panel-bubble') as HTMLElement;
    bubbleEl.classList.remove('chat-panel-bubble-hidden');
    bubbleEl.classList.add('chat-panel-bubble-visible');

    if (typewriter) {
      this.currentText = text;
      this.typewriterEffect(text, speed);
    } else {
      this.bubbleContentEl!.textContent = text;
    }

    this.updatePosition();

    if (autoHide > 0) {
      this.autoHideTimer = window.setTimeout(() => {
        this.hideBubble();
      }, autoHide * 1000);
    }
  }

  /**
   * Append text to bubble (for streaming)
   */
  appendBubbleText(text: string): void {
    this.ensureElement();
    if (!this.bubbleContentEl) return;

    // Cancel typewriter effect
    if (this.typewriterTimer) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }

    this.isBubbleVisible = true;
    // Show the bubble element, not the entire panel
    const bubbleEl = this.panelEl!.querySelector('.chat-panel-bubble') as HTMLElement;
    bubbleEl.classList.remove('chat-panel-bubble-hidden');
    bubbleEl.classList.add('chat-panel-bubble-visible');

    this.bubbleContentEl.textContent += text;
    this.updatePosition();
  }

  /**
   * Clear bubble content (start of new conversation)
   */
  clearBubble(): void {
    this.ensureElement();
    if (this.bubbleContentEl) {
      this.bubbleContentEl.textContent = '';
    }
  }

  /**
   * Hide bubble
   */
  hideBubble(): void {
    this.clearAutoHide();
    if (this.typewriterTimer) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    this.isBubbleVisible = false;
    // Hide only the bubble element, not the input
    const bubbleEl = this.panelEl!.querySelector('.chat-panel-bubble') as HTMLElement;
    bubbleEl.classList.remove('chat-panel-bubble-visible');
    bubbleEl.classList.add('chat-panel-bubble-hidden');
  }

  /**
   * Set auto-hide duration
   */
  bubbleAutoHide(seconds: number): void {
    this.clearAutoHide();
    if (seconds > 0) {
      this.autoHideTimer = window.setTimeout(() => {
        this.hideBubble();
      }, seconds * 1000);
    }
  }

  /**
   * Show typing indicator
   */
  showTyping(): void {
    this.ensureElement();
    this.isTypingVisible = true;
    this.typingIndicatorEl!.style.display = 'flex';
    this.updatePosition();
  }

  /**
   * Hide typing indicator
   */
  hideTyping(): void {
    if (this.typingIndicatorEl) {
      this.typingIndicatorEl.style.display = 'none';
    }
    this.isTypingVisible = false;
  }

  /**
   * Check if input dialog is visible
   */
  isVisible(): boolean {
    return this.isInputVisible;
  }

  private ensureElement(): void {
    if (this.panelEl) return;

    // Create main panel container
    this.panelEl = document.createElement('div');
    this.panelEl.className = 'chat-panel';

    // Create bubble
    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'chat-panel-bubble chat-panel-bubble-hidden';
    this.bubbleContentEl = document.createElement('div');
    this.bubbleContentEl.className = 'chat-panel-bubble-content';
    bubbleEl.appendChild(this.bubbleContentEl);
    this.panelEl.appendChild(bubbleEl);

    // Create input container
    this.inputContainerEl = document.createElement('div');
    this.inputContainerEl.className = 'chat-panel-input-container';
    this.inputContainerEl.style.display = 'none';

    const textareaWrapper = document.createElement('div');
    textareaWrapper.className = 'chat-panel-input-wrapper';

    this.textareaEl = document.createElement('textarea');
    this.textareaEl.className = 'chat-panel-textarea';
    this.textareaEl.placeholder = '和猫咪说点什么...';
    this.textareaEl.rows = 1;

    this.sendBtnEl = document.createElement('button');
    this.sendBtnEl.className = 'chat-panel-send';
    this.sendBtnEl.textContent = '发送';
    this.sendBtnEl.type = 'button';

    textareaWrapper.appendChild(this.textareaEl);
    textareaWrapper.appendChild(this.sendBtnEl);
    this.inputContainerEl.appendChild(textareaWrapper);
    this.panelEl.appendChild(this.inputContainerEl);

    // Create typing indicator
    this.typingIndicatorEl = document.createElement('div');
    this.typingIndicatorEl.className = 'chat-panel-typing';
    this.typingIndicatorEl.style.display = 'none';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'chat-panel-typing-dot';
      this.typingIndicatorEl.appendChild(dot);
    }
    this.panelEl.appendChild(this.typingIndicatorEl);

    // Event listeners
    this.textareaEl.addEventListener('input', this.onInput);
    this.textareaEl.addEventListener('keydown', this.onKeyDown);
    this.sendBtnEl.addEventListener('click', this.onSend);

    document.body.appendChild(this.panelEl);
  }

  private onInput = (): void => {
    if (!this.textareaEl) return;

    // Auto-resize
    this.textareaEl.style.height = 'auto';
    const scrollHeight = this.textareaEl.scrollHeight;
    const maxHeight = 120;
    this.textareaEl.style.height = Math.min(scrollHeight, maxHeight) + 'px';
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.onSend();
    } else if (e.key === 'Escape') {
      this.cancelInput();
    }
  }

  private onSend = (): void => {
    // Capture value before doing anything else
    const text = this.textareaEl?.value.trim() || '';
    console.log('📤 ChatPanel onSend:', { text, textareaExists: !!this.textareaEl, rawValue: this.textareaEl?.value });

    // Resolve the promise first with the captured value
    this.resolveInput(text || null);
  }

  private cancelInput(): void {
    this.resolveInput(null);
  }

  private resolveInput(value: string | null): void {
    // Remove outside click listener first
    document.removeEventListener('click', this.onOutsideClick);

    // Resolve the promise
    if (this.inputResolve) {
      this.inputResolve(value);
      this.inputResolve = null;
    }

    // Then hide the UI
    this.hideInputUI();
  }

  private hideInputUI(): void {
    if (!this.isInputVisible) return;

    this.isInputVisible = false;
    this.inputContainerEl!.style.display = 'none';
    this.panelEl!.classList.remove('chat-panel-input-visible');
    this.updatePosition();
  }

  private onOutsideClick = (e: MouseEvent): void => {
    if (this.panelEl && !this.panelEl.contains(e.target as Node)) {
      this.cancelInput();
    }
  }

  private typewriterEffect(text: string, speed: number): void {
    let index = 0;
    const interval = 1000 / 60 / speed;

    const type = () => {
      if (index < text.length) {
        this.bubbleContentEl!.textContent += text[index];
        index++;
        this.updatePosition();
        this.typewriterTimer = window.setTimeout(type, interval);
      }
    };

    type();
  }

  private clearAutoHide(): void {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  private updatePosition(): void {
    if (!this.panelEl) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Get the head position from the model
    const headPos = this.getHeadPosition();

    const panelWidth = this.panelEl.offsetWidth || 280;
    const panelHeight = this.panelEl.offsetHeight || 60;

    let x = headPos.x - panelWidth / 2;
    let y = headPos.y - panelHeight - 10;

    // Ensure panel is fully visible within window
    x = Math.max(10, Math.min(x, w - panelWidth - 10));
    y = Math.max(10, Math.min(y, h - panelHeight - 10));

    this.panelEl.style.left = `${x}px`;
    this.panelEl.style.top = `${y}px`;
  }

  destroy(): void {
    this.clearAutoHide();
    if (this.typewriterTimer) {
      clearTimeout(this.typewriterTimer);
    }
    document.removeEventListener('click', this.onOutsideClick);
    this.panelEl?.remove();
    this.panelEl = null;
    this.bubbleContentEl = null;
    this.inputContainerEl = null;
    this.textareaEl = null;
    this.sendBtnEl = null;
    this.typingIndicatorEl = null;
  }
}
