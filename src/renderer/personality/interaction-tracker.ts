import type { InteractionRecord, InteractionType } from '../../shared/memory-constants';

/**
 * Tracks user interactions and sends them to the main process
 */
export class InteractionTracker {
  private hoverStartTime: number = 0;
  private dragStartTime: number = 0;
  private ignoreStartTime: number = 0;
  private ignoreTimer: number | null = null;
  private ignoreTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(private onRecord: (interaction: InteractionRecord) => void) {
    // Start ignore tracking on init
    this.startIgnoreTracking();
  }

  startHover(): void {
    this.hoverStartTime = Date.now();
  }

  endHover(): void {
    const duration = Date.now() - this.hoverStartTime;
    if (duration > 500) {
      // Only record hovers longer than 500ms
      this.record('hover', { duration });
    }
    this.hoverStartTime = 0;

    // Reset ignore tracking on interaction
    this.resetIgnoreTracking();
  }

  startDrag(): void {
    this.dragStartTime = Date.now();
  }

  endDrag(): void {
    const duration = Date.now() - this.dragStartTime;
    this.record('drag', { duration });
    this.dragStartTime = 0;

    // Reset ignore tracking on interaction
    this.resetIgnoreTracking();
  }

  recordClick(expression?: string): void {
    this.record('click', { expression });
    this.resetIgnoreTracking();
  }

  recordDoubleClick(expression?: string): void {
    this.record('double_click', { expression });
    this.resetIgnoreTracking();
  }

  recordRightClick(): void {
    this.record('right_click');
    this.resetIgnoreTracking();
  }

  recordChatMessage(message: string): void {
    this.record('chat_message', { message });
    this.resetIgnoreTracking();
  }

  recordAutoChat(): void {
    this.record('auto_chat');
    this.resetIgnoreTracking();
  }

  recordAnyInteraction(): void {
    // Generic interaction that resets ignore timer
    this.resetIgnoreTracking();
  }

  private startIgnoreTracking(): void {
    this.ignoreStartTime = Date.now();

    // If user doesn't interact for 5 minutes, record as ignore
    if (this.ignoreTimer) {
      clearTimeout(this.ignoreTimer);
    }

    this.ignoreTimer = window.setTimeout(() => {
      this.record('ignore');
      // Restart timer for next ignore
      this.startIgnoreTracking();
    }, this.ignoreTimeout);
  }

  private resetIgnoreTracking(): void {
    if (this.ignoreTimer) {
      clearTimeout(this.ignoreTimer);
      this.ignoreTimer = null;
    }
    this.ignoreStartTime = 0;

    // Restart the timer
    this.startIgnoreTracking();
  }

  private record(type: InteractionType, data?: { duration?: number; message?: string; expression?: string }): void {
    const record: InteractionRecord = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      data,
    };

    this.onRecord(record);
  }

  destroy(): void {
    if (this.ignoreTimer) {
      clearTimeout(this.ignoreTimer);
    }
  }
}
