import type { Live2DScene } from './live2d-scene';

interface MenuItem {
  label?: string;
  action?: () => void;
  separator?: true;
}

export class ContextMenu {
  private scene: Live2DScene;
  private el: HTMLElement | null = null;

  constructor(scene: Live2DScene) {
    this.scene = scene;
  }

  init(): void {
    window.addEventListener('show-context-menu', (e: Event) => {
      const { x, y } = (e as CustomEvent).detail;
      this.show(x, y);
    });
    document.addEventListener('click', () => this.hide());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
  }

  private show(x: number, y: number): void {
    this.hide();

    this.el = document.createElement('div');
    this.el.className = 'context-menu';

    const items: MenuItem[] = [
      { label: '开心跳跳 ✨', action: () => this.scene.setState('happy') },
      { label: '超级兴奋 🎉', action: () => this.scene.setState('excited') },
      { label: '回到安静 💤', action: () => this.scene.setState('idle') },
      { separator: true },
      { label: '关闭菜单', action: () => this.hide() }
    ];

    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        this.el.appendChild(sep);
      } else {
        const btn = document.createElement('div');
        btn.className = 'context-menu-item';
        btn.textContent = item.label ?? '';
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          item.action?.();
          this.hide();
        });
        this.el.appendChild(btn);
      }
    }

    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    document.body.appendChild(this.el);

    // 防止超出边界
    requestAnimationFrame(() => {
      if (!this.el) return;
      const rect = this.el.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        this.el.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        this.el.style.top = `${y - rect.height}px`;
      }
    });
  }

  private hide(): void {
    this.el?.remove();
    this.el = null;
  }

  destroy(): void {
    this.hide();
  }
}
