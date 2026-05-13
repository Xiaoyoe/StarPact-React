import { defineStore } from 'pinia';
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export const useLanServerStore = defineStore('lanServer', () => {
  const running = ref(false);
  const address = ref('');
  const port = ref(8080);

  const syncStatus = async () => {
    try {
      const result = await invoke<{ running: boolean; address: string; port: number }>('get_lan_server_status');
      running.value = result.running;
      address.value = result.running ? result.address : '';
      port.value = result.port;
    } catch (error) {
      console.error('Failed to sync LAN server status:', error);
    }
  };

  const start = async (portNum?: number) => {
    try {
      const result = await invoke<{ running: boolean; address: string; port: number }>('start_lan_server', { 
        port: portNum || port.value 
      });
      running.value = result.running;
      address.value = result.address;
      port.value = result.port;
      return result;
    } catch (error) {
      console.error('Failed to start LAN server:', error);
      throw error;
    }
  };

  const stop = async () => {
    try {
      const result = await invoke<{ running: boolean; address: string; port: number }>('stop_lan_server');
      running.value = result.running;
      address.value = '';
      return result;
    } catch (error) {
      console.error('Failed to stop LAN server:', error);
      throw error;
    }
  };

  return {
    running,
    address,
    port,
    syncStatus,
    start,
    stop,
  };
});
