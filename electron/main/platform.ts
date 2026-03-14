import { BrowserWindow, app } from 'electron';

/**
 * 平台差异集中封装
 */
export function setupPlatformSpecifics(win: BrowserWindow): void {
  if (process.platform === 'darwin') {
    // macOS: Mission Control 下保持可见
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    // 隐藏 Dock 图标
    app.dock.hide();
  }
}

export function getTrayIconName(): string {
  if (process.platform === 'win32') return 'tray.ico';
  return 'tray.png';
}

export function isMacOS(): boolean {
  return process.platform === 'darwin';
}

export function isWindows(): boolean {
  return process.platform === 'win32';
}
