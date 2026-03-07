import { ipcMain, shell } from 'electron';
import { IPC_CHANNELS } from './channels';

export function registerShellHandlers() {
  ipcMain.handle(IPC_CHANNELS.SHELL.OPEN_EXTERNAL, async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Failed to open external URL:', error);
      return { success: false, error: String(error) };
    }
  });
}
