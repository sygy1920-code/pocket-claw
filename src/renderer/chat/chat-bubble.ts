import { DEFAULT_CONFIG } from '../../shared/chat-constants';

export class ChatBubble {
  private el: HTMLElement | null = null;
  private contentEl: HTMLElement | null = null;
  private autoHideTimer: number | null = null;
  private typewriterTimer: number | null = null;
  private currentText = '';
  private getHeadPosition: () => { x: number; y: number };

  constructor(getHeadPosition: () => { x: number; y: number }) {
    this.getHeadPosition = getHeadPosition;
  }

  /**
   * Show bubble with text
   */
  show(text: string, options: {
    autoHide?: number; // seconds, 0 = never
    typewriter?: boolean; // Enable typing animation
    speed?: number; // chars per frame
  } = {}): void {
    const {
      autoHide = DEFAULT_CONFIG.bubbleDuration,
      typewriter = true,
      speed = DEFAULT_CONFIG.typewriterSpeed
    } = options;

    this.ensureElement();
    this.clearAutoHide();

    // Clear previous content
    this.contentEl!.textContent = '';

    if (typewriter) {
      this.currentText = text;
      this.typewriterEffect(text, speed);
    } else {
      this.contentEl!.textContent = text;
    }

    this.el!.style.display = 'block';
    this.el!.classList.remove('chat-bubble-hidden');
    this.el!.classList.add('chat-bubble-visible');
    this.updatePosition();

    console.log('💬 Bubble shown at:', this.el.style.left, this.el.style.top);

    if (autoHide > 0) {
      this.autoHideTimer = window.setTimeout(() => {
        this.hide();
      }, autoHide * 1000);
    }
  }

  /**
   * Append text to current content (for streaming)
   */
  appendText(text: string): void {
    this.ensureElement();
    if (!this.contentEl) return;

    // Cancel any typewriter effect
    if (this.typewriterTimer) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }

    // Make bubble visible
    this.el!.style.display = 'block';
    this.el!.classList.remove('chat-bubble-hidden');
    this.el!.classList.add('chat-bubble-visible');

    this.contentEl.textContent += text;
    this.updatePosition();
  }

  /**
   * Clear and reset bubble
   */
  clear(): void {
    this.ensureElement();
    this.contentEl!.textContent = '';
    this.currentText = '';
  }

  /**
   * Hide bubble
   */
  hide(): void {
    this.clearAutoHide();
    if (this.typewriterTimer) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    this.el?.classList.remove('chat-bubble-visible');
    setTimeout(() => {
      this.el?.classList.add('chat-bubble-hidden');
    }, 300);
  }

  /**
   * Set auto-hide duration
   */
  autoHide(seconds: number): void {
    this.clearAutoHide();
    if (seconds > 0) {
      this.autoHideTimer = window.setTimeout(() => {
        this.hide();
      }, seconds * 1000);
    }
  }

  private ensureElement(): void {
    if (this.el) return;

    this.el = document.createElement('div');
    this.el.className = 'chat-bubble chat-bubble-hidden';

    this.contentEl = document.createElement('div');
    this.contentEl.className = 'chat-bubble-content';

    this.el.appendChild(this.contentEl);
    document.body.appendChild(this.el);
  }

  private typewriterEffect(text: string, speed: number): void {
    let index = 0;
    const interval = 1000 / 60 / speed; // Chars per frame at 60fps

    const type = () => {
      if (index < text.length) {
        this.contentEl!.textContent += text[index];
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
    if (!this.el) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Get the head position from the model
    const headPos = this.getHeadPosition();

    // Position bubble above the head
    const bubbleWidth = this.el.offsetWidth || 200;
    const bubbleHeight = this.el.offsetHeight || 50;

    // Center bubble above head, with some padding
    let x = headPos.x - bubbleWidth / 2;
    let y = headPos.y - bubbleHeight - 20; // 20px above head

    // Ensure bubble is fully visible within window
    x = Math.max(10, Math.min(x, w - bubbleWidth - 10));
    y = Math.max(10, Math.min(y, h - bubbleHeight - 10));

    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;

    console.log('💬 Bubble position:', { x, y, headPos, bubbleWidth, bubbleHeight });
  }

  destroy(): void {
    this.clearAutoHide();
    if (this.typewriterTimer) {
      clearTimeout(this.typewriterTimer);
    }
    this.el?.remove();
    this.el = null;
    this.contentEl = null;
  }
}
