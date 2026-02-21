import * as http from 'http';
import * as https from 'https';
import { Readable } from 'stream';
import {
  OllamaModel,
  OllamaChatOptions,
  OllamaChatResponse,
  OllamaPullProgress,
} from '@/shared/types/ollama';

export class OllamaAPIClient {
  private host: string;
  private port: number;

  constructor(host: string = 'localhost', port: number = 11434) {
    this.host = host;
    this.port = port;
  }

  async getModels(): Promise<OllamaModel[]> {
    const response = await this.request('GET', '/api/tags');
    return response.body.models || [];
  }

  async chat(
    options: OllamaChatOptions,
    onProgress?: (chunk: string) => void
  ): Promise<OllamaChatResponse> {
    const { stream = true, ...chatOptions } = options;

    if (stream && onProgress) {
      return this.streamChat(chatOptions, onProgress);
    }

    return this.request('POST', '/api/chat', chatOptions);
  }

  async streamChat(
    options: OllamaChatOptions,
    onProgress: (chunk: string) => void
  ): Promise<OllamaChatResponse> {
    return new Promise((resolve, reject) => {
      const url = `http://${this.host}:${this.port}/api/chat`;
      const req = http.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }, (res) => {
        let fullResponse = '';

        res.on('data', (chunk) => {
          const lines = chunk.toString().split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                const content = data.message.content;
                fullResponse += content;
                onProgress(content);
              }
              if (data.done) {
                resolve({
                  model: data.model,
                  created_at: data.created_at,
                  message: {
                    role: 'assistant',
                    content: fullResponse,
                  },
                  done: true,
                });
              }
            } catch (e) {
            }
          }
        });

        res.on('end', () => {
          resolve({
            model: options.model,
            created_at: new Date().toISOString(),
            message: {
              role: 'assistant',
              content: fullResponse,
            },
            done: true,
          });
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify({ ...options, stream: true }));
      req.end();
    });
  }

  async pullModel(
    modelName: string,
    onProgress?: (progress: OllamaPullProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `http://${this.host}:${this.port}/api/pull`;
      const req = http.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }, (res) => {
        res.on('data', (chunk) => {
          const lines = chunk.toString().split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (onProgress) {
                onProgress(data);
              }
            } catch (e) {
            }
          }
        });

        res.on('end', () => {
          resolve();
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify({ name: modelName, stream: true }));
      req.end();
    });
  }

  async deleteModel(modelName: string): Promise<void> {
    await this.request('DELETE', '/api/delete', { name: modelName });
  }

  async getModelInfo(modelName: string): Promise<any> {
    return this.request('POST', '/api/show', { name: modelName });
  }

  async copyModel(source: string, destination: string): Promise<void> {
    await this.request('POST', '/api/copy', { source, destination });
  }

  async generateEmbedding(text: string, model: string = 'nomic-embed-text'): Promise<number[]> {
    const response = await this.request('POST', '/api/embeddings', {
      model,
      prompt: text,
    });
    return response.body.embedding;
  }

  async ps(): Promise<any> {
    const response = await this.request('GET', '/api/ps');
    return response.body;
  }

  async createModel(name: string, modelfile: string): Promise<any> {
    const response = await this.request('POST', '/api/create', {
      name,
      modelfile,
    });
    return response.body;
  }

  private request(
    method: string,
    path: string,
    body?: any
  ): Promise<{ headers: any; body: any }> {
    return new Promise((resolve, reject) => {
      const url = `http://${this.host}:${this.port}${path}`;
      const req = http.request(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ headers: res.headers, body: parsed });
          } catch {
            resolve({ headers: res.headers, body: data });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }
}

export default OllamaAPIClient;
