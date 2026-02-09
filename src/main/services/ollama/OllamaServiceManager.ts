import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';
import { OllamaServiceStatus, OllamaConfig } from '@/shared/types/ollama';

export class OllamaServiceManager extends EventEmitter {
  private static instance: OllamaServiceManager;
  private process: ChildProcess | null = null;
  private config: OllamaConfig;
  private status: OllamaServiceStatus = {
    isRunning: false,
    port: 11434,
  };

  private constructor(config?: Partial<OllamaConfig>) {
    super();
    this.config = {
      host: 'localhost',
      port: 11434,
      autoStart: false,
      ...config,
    };
  }

  static getInstance(config?: Partial<OllamaConfig>): OllamaServiceManager {
    if (!OllamaServiceManager.instance) {
      OllamaServiceManager.instance = new OllamaServiceManager(config);
    }
    return OllamaServiceManager.instance;
  }

  async checkStatus(): Promise<OllamaServiceStatus> {
    try {
      const response = await this.makeRequest('/api/tags');
      this.status = {
        isRunning: true,
        port: this.config.port,
        version: response.headers['ollama-version'] || 'unknown',
      };
      this.emit('status', this.status);
      return this.status;
    } catch (error) {
      this.status = {
        isRunning: false,
        port: this.config.port,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      this.emit('status', this.status);
      return this.status;
    }
  }

  async start(): Promise<void> {
    if (this.status.isRunning) {
      throw new Error('Ollama service is already running');
    }

    return new Promise((resolve, reject) => {
      this.process = spawn('ollama', ['serve'], {
        env: {
          ...process.env,
          OLLAMA_HOST: `${this.config.host}:${this.config.port}`,
        },
      });

      this.process.stdout?.on('data', (data) => {
        const message = data.toString();
        console.log('[Ollama]', message);
        this.emit('log', { type: 'info', message });
      });

      this.process.stderr?.on('data', (data) => {
        const message = data.toString();
        console.error('[Ollama]', message);
        this.emit('log', { type: 'error', message });
      });

      this.process.on('error', (error) => {
        this.status = {
          isRunning: false,
          port: this.config.port,
          error: error.message,
        };
        this.emit('status', this.status);
        this.emit('log', { type: 'error', message: error.message });
        reject(error);
      });

      this.process.on('exit', (code) => {
        this.status = {
          isRunning: false,
          port: this.config.port,
        };
        this.emit('status', this.status);
        this.emit('log', { type: 'info', message: `Ollama exited with code ${code}` });
      });

      setTimeout(async () => {
        const status = await this.checkStatus();
        if (status.isRunning) {
          resolve();
        } else {
          reject(new Error('Failed to start Ollama service'));
        }
      }, 3000);
    });
  }

  async stop(): Promise<void> {
    if (!this.process) {
      throw new Error('Ollama service is not running');
    }

    return new Promise((resolve) => {
      this.process?.on('exit', () => {
        this.process = null;
        this.status = {
          isRunning: false,
          port: this.config.port,
        };
        this.emit('status', this.status);
        resolve();
      });

      this.process?.kill('SIGTERM');

      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
        resolve();
      }, 5000);
    });
  }

  async restart(): Promise<void> {
    if (this.status.isRunning) {
      await this.stop();
    }
    await this.start();
  }

  getStatus(): OllamaServiceStatus {
    return { ...this.status };
  }

  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private makeRequest(path: string): Promise<{ headers: any; body: any }> {
    return new Promise((resolve, reject) => {
      const url = `http://${this.config.host}:${this.config.port}${path}`;
      const protocol = url.startsWith('https') ? https : http;

      const req = protocol.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const body = data ? JSON.parse(data) : {};
            resolve({ headers: res.headers, body });
          } catch {
            resolve({ headers: res.headers, body: data });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }
}

export default OllamaServiceManager;
