import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const windowService = {
  async minimize(): Promise<void> {
    await getCurrentWindow().minimize();
  },

  async maximize(): Promise<void> {
    const window = getCurrentWindow();
    if (await window.isMaximized()) {
      await window.unmaximize();
    } else {
      await window.maximize();
    }
  },

  async close(): Promise<void> {
    await getCurrentWindow().close();
  },

  async isMaximized(): Promise<boolean> {
    return getCurrentWindow().isMaximized();
  },

  async setSize(width: number, height: number): Promise<void> {
    await getCurrentWindow().setSize({ width, height });
  },

  async getSize(): Promise<{ width: number; height: number }> {
    const size = await getCurrentWindow().innerSize();
    return { width: size.width, height: size.height };
  },

  async center(): Promise<void> {
    await getCurrentWindow().center();
  },

  async setTitle(title: string): Promise<void> {
    await getCurrentWindow().setTitle(title);
  },
};
