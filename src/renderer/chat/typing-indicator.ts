export class TypingIndicator {
  private el: HTMLElement | null = null;
  private getHeadPosition: () => { x: number; y: number };

  constructor(getHeadPosition: () => { x: number; y: number }) {
    this.getHeadPosition = getHeadPosition;
  }

  show(): void {
    this.ensureElement();
    this.el!.style.display = 'flex';
    this.el!.classList.add('typing-visible');
    this.updatePosition();
  }

  hide(): void {
    this.el?.classList.remove('typing-visible');
    this.el?.classList.add('typing-hidden');
  }

  private ensureElement(): void {
    if (this.el) return;

    this.el = document.createElement('div');
    this.el.className = 'typing-indicator typing-hidden';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'typing-dot';
      dot.style.animationDelay = `${i * 0.16}s`;
      this.el.appendChild(dot);
    }

    document.body.appendChild(this.el);
  }

  private updatePosition(): void {
    if (!this.el) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Get the head position from the model
    const headPos = this.getHeadPosition();

    // Center the indicator above head
    const indicatorWidth = this.el.offsetWidth || 60;
    const indicatorHeight = this.el.offsetHeight || 30;

    let x = headPos.x - indicatorWidth / 2;
    let y = headPos.y - indicatorHeight - 20;

    // Keep within bounds
    x = Math.max(10, Math.min(x, w - indicatorWidth - 10));
    y = Math.max(10, Math.min(y, h - indicatorHeight - 10));

    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }

  destroy(): void {
    this.el?.remove();
    this.el = null;
  }
}
