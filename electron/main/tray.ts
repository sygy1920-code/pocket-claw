import { Tray, Menu, BrowserWindow, nativeImage } from 'electron';
import { join } from 'path';
import { getTrayIconName } from './platform';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow): Tray {
  const iconPath = join(__dirname, `../../icons/${getTrayIconName()}`);
  let icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    // 创建一个 1x1 的空图标作为后备
    icon = nativeImage.createEmpty();
  } else {
    icon = icon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(icon);

  const updateMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: mainWindow.isVisible() ? '隐藏宠物' : '显示宠物',
        click: () => {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
          }
          updateMenu(); // 更新菜单标签
        }
      },
      { type: 'separator' },
      {
        label: '重置位置',
        click: () => {
          const { screen } = require('electron');
          const { width, height } = screen.getPrimaryDisplay().workAreaSize;
          mainWindow.setPosition(width - 350, height - 350);
          mainWindow.show();
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          tray?.destroy();
          mainWindow.destroy();
        }
      }
    ]);
    tray!.setContextMenu(contextMenu);
  };

  updateMenu();
  tray.setToolTip('桌面宠物 - Pocket Claw');

  tray.on('double-click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  return tray;
}
