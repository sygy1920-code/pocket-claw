import type { Live2DScene } from './live2d-scene';
import type { ChatManager } from './chat/chat-manager';
import { InteractionTracker } from './personality/interaction-tracker';

/**
 * 鼠标处理（Live2D 版本）:
 * - 使用 bounds 检测是否悬停在宠物上
 * - 悬停时禁用穿透，移开时恢复穿透
 * - 支持单击、双击、拖拽
 * - 追踪所有交互记录到记忆系统
 */
export class Live2DMouseHandler {
  private scene: Live2DScene;
  private chatManager: ChatManager | null = null;
  private interactionTracker: InteractionTracker | null = null;

  private isHovering = false;
  private isDragging = false;
  private dragStart: { screenX: number; screenY: number } | null = null;
  private clickCount = 0;
  private lastClickAt = 0;
  private clickTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private wasHovering = false; // Track hover state changes

  constructor(scene: Live2DScene, chatManager?: ChatManager) {
    this.scene = scene;
    this.chatManager = chatManager || null;

    // Get interaction tracker from chat manager if available
    if (chatManager && 'getInteractionTracker' in chatManager) {
      this.interactionTracker = (chatManager as any).getInteractionTracker();
    }
  }

  init(): void {
    window.addEventListener('mousemove', this.onMove);
    window.addEventListener('mousedown', this.onDown);
    window.addEventListener('mouseup', this.onUp);
    window.addEventListener('click', this.onClick);
    window.addEventListener('contextmenu', this.onContextMenu);
  }

  private onMove = (e: MouseEvent): void => {
    if (this.isDragging && this.dragStart) {
      const dx = e.screenX - this.dragStart.screenX;
      const dy = e.screenY - this.dragStart.screenY;
      this.dragStart = { screenX: e.screenX, screenY: e.screenY };
      window.electronAPI?.moveWindow(dx, dy);
      return;
    }

    // Hit test using Live2D model bounds
    const nowHovering = this.scene.hitTest(e.clientX, e.clientY);
    if (nowHovering !== this.isHovering) {
      this.isHovering = nowHovering;
      window.electronAPI?.setIgnoreMouseEvents(!nowHovering);
      document.body.style.cursor = nowHovering ? 'pointer' : 'default';

      // Track hover changes
      if (nowHovering) {
        this.interactionTracker?.startHover();
      } else if (this.wasHovering) {
        this.interactionTracker?.endHover();
      }
      this.wasHovering = nowHovering;
    }

    // Reset ignore tracking on any mouse movement over the pet
    if (nowHovering) {
      this.interactionTracker?.recordAnyInteraction();
    }
  };

  private onDown = (e: MouseEvent): void => {
    if (!this.isHovering || e.button !== 0) return;
    this.isDragging = true;
    this.dragStart = { screenX: e.screenX, screenY: e.screenY };
    this.interactionTracker?.startDrag();
  };

  private onUp = (_e: MouseEvent): void => {
    if (this.isDragging) {
      this.interactionTracker?.endDrag();
    }
    this.isDragging = false;
    this.dragStart = null;
  };

  private onClick = (_e: MouseEvent): void => {
    if (!this.isHovering) return;

    const now = Date.now();
    if (now - this.lastClickAt < 300) {
      this.clickCount++;
    } else {
      this.clickCount = 1;
    }
    this.lastClickAt = now;

    if (this.clickTimeoutId) clearTimeout(this.clickTimeoutId);
    this.clickTimeoutId = setTimeout(() => {
      if (this.clickCount >= 2) {
        this.handleDoubleClick();
      } else {
        this.handleSingleClick();
      }
      this.clickCount = 0;
    }, 300);
  };

  private handleSingleClick(): void {
    window.electronAPI?.notifyPetClicked();
    this.scene.setState('happy');
    // Show input dialog on click
    this.chatManager?.showInput();
  }

  private handleDoubleClick(): void {
    this.scene.setState('excited');
    // Show input dialog on double click as well
    this.chatManager?.showInput();
  }

  private onContextMenu = (e: MouseEvent): void => {
    if (!this.isHovering) return;
    e.preventDefault();

    // Track right-click interaction
    this.interactionTracker?.recordRightClick();

    // Show input dialog on right click
    this.chatManager?.showInput();
  };

  destroy(): void {
    window.removeEventListener('mousemove', this.onMove);
    window.removeEventListener('mousedown', this.onDown);
    window.removeEventListener('mouseup', this.onUp);
    window.removeEventListener('click', this.onClick);
    window.removeEventListener('contextmenu', this.onContextMenu);
    if (this.clickTimeoutId) clearTimeout(this.clickTimeoutId);
    // Interaction tracker cleanup is handled by ChatManager
  }
}
