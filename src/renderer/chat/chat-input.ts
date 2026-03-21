export class ChatInput {
  private el: HTMLElement | null = null;
  private textarea: HTMLTextAreaElement | null = null;
  private sendBtn: HTMLButtonElement | null = null;
  private isVisible = false;
  private resolve: ((value: string | null) => void) | null = null;

  constructor() {}

  /**
   * Show input popup and wait for user input
   */
  async show(): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.ensureElement();
      this.isVisible = true;

      if (this.textarea) {
        this.textarea.value = '';
        this.textarea.style.height = 'auto';
      }

      this.el!.style.display = 'block';
      this.el!.classList.add('chat-input-visible');
      this.updatePosition();
      this.textarea?.focus();

      // Auto-hide on outside click
      setTimeout(() => {
        document.addEventListener('click', this.onOutsideClick);
      }, 100);
    });
  }

  /**
   * Hide input popup
   */
  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.el?.classList.remove('chat-input-visible');
    this.el?.classList.add('chat-input-hidden');

    document.removeEventListener('click', this.onOutsideClick);

    setTimeout(() => {
      this.el!.style.display = 'none';
    }, 200);
  }

  private ensureElement(): void {
    if (this.el) return;

    this.el = document.createElement('div');
    this.el.className = 'chat-input-popup chat-input-hidden';

    const container = document.createElement('div');
    container.className = 'chat-input-container';

    this.textarea = document.createElement('textarea');
    this.textarea.className = 'chat-input-textarea';
    this.textarea.placeholder = '和猫咪说点什么...';
    this.textarea.rows = 1;

    this.sendBtn = document.createElement('button');
    this.sendBtn.className = 'chat-input-send';
    this.sendBtn.textContent = '发送';
    this.sendBtn.type = 'button';

    // Event listeners
    this.textarea.addEventListener('input', this.onInput);
    this.textarea.addEventListener('keydown', this.onKeyDown);
    this.sendBtn.addEventListener('click', this.onSend);

    container.appendChild(this.textarea);
    container.appendChild(this.sendBtn);
    this.el.appendChild(container);
    document.body.appendChild(this.el);
  }

  private onInput = (): void => {
    if (!this.textarea) return;

    // Auto-resize
    this.textarea.style.height = 'auto';
    const scrollHeight = this.textarea.scrollHeight;
    const maxHeight = 120;
    this.textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.onSend();
    } else if (e.key === 'Escape') {
      this.cancel();
    }
  }

  private onSend = (): void => {
    const text = this.textarea?.value.trim();
    this.hide();
    this.resolve?.(text || null);
  }

  private cancel(): void {
    this.hide();
    this.resolve?.(null);
  }

  private onOutsideClick = (e: MouseEvent): void => {
    if (this.el && !this.el.contains(e.target as Node)) {
      this.cancel();
    }
  }

  private updatePosition(): void {
    if (!this.el) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Position near the pet
    const modelX = w / 2;
    const modelY = h - 10;

    const inputWidth = this.el.offsetWidth || 280;

    let x = modelX - inputWidth / 2;
    let y = modelY - 150; // Above the model

    // Keep within bounds
    x = Math.max(10, Math.min(x, w - inputWidth - 10));
    y = Math.max(10, y);

    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }

  destroy(): void {
    this.hide();
    this.el?.remove();
    this.el = null;
    this.textarea = null;
    this.sendBtn = null;
  }
}
