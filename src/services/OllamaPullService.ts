export interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percentage?: number;
}

export interface PullTask {
  id: string;
  modelName: string;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'cancelled' | 'error';
  progress: PullProgress;
  startTime: number;
  error?: string;
}

class OllamaPullService {
  private static instance: OllamaPullService;
  private abortControllers: Map<string, AbortController> = new Map();
  private config = { host: 'localhost', port: 11434 };
  private listeners: Set<(tasks: Map<string, PullTask>) => void> = new Set();
  private tasks: Map<string, PullTask> = new Map();

  private constructor() {}

  static getInstance(): OllamaPullService {
    if (!OllamaPullService.instance) {
      OllamaPullService.instance = new OllamaPullService();
    }
    return OllamaPullService.instance;
  }

  setConfig(host: string, port: number) {
    this.config = { host, port };
  }

  subscribe(listener: (tasks: Map<string, PullTask>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(new Map(this.tasks)));
  }

  getTasks(): Map<string, PullTask> {
    return new Map(this.tasks);
  }

  getTask(id: string): PullTask | undefined {
    return this.tasks.get(id);
  }

  async pullModel(
    modelName: string,
    onProgress?: (progress: PullProgress) => void,
    onComplete?: () => void,
    onError?: (error: string) => void
  ): Promise<string> {
    const taskId = `pull-${modelName}-${Date.now()}`;
    
    const task: PullTask = {
      id: taskId,
      modelName,
      status: 'pending',
      progress: { status: 'Initializing...' },
      startTime: Date.now(),
    };

    this.tasks.set(taskId, task);
    this.notifyListeners();

    const abortController = new AbortController();
    this.abortControllers.set(taskId, abortController);

    try {
      task.status = 'downloading';
      task.progress = { status: 'pulling manifest' };
      this.tasks.set(taskId, task);
      this.notifyListeners();

      const response = await fetch(`http://${this.config.host}:${this.config.port}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: modelName,
          insecure: false,
          stream: true
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              
              if (data.status) {
                let percentage = 0;
                if (data.total && data.completed) {
                  percentage = Math.round((data.completed / data.total) * 100);
                }

                task.progress = {
                  status: data.status,
                  digest: data.digest,
                  total: data.total,
                  completed: data.completed,
                  percentage,
                };

                this.tasks.set(taskId, task);
                this.notifyListeners();
                onProgress?.(task.progress);
              }

              if (data.status === 'success') {
                task.status = 'completed';
                task.progress = { status: 'success', percentage: 100 };
                this.tasks.set(taskId, task);
                this.notifyListeners();
                onComplete?.();
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) {
                continue;
              }
              throw e;
            }
          }
        }
      }

      return taskId;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        task.status = 'cancelled';
        task.progress = { status: 'Cancelled', percentage: task.progress.percentage || 0 };
        this.tasks.set(taskId, task);
        this.notifyListeners();
      } else {
        task.status = 'error';
        task.error = error.message || 'Unknown error';
        task.progress = { status: `Error: ${task.error}` };
        this.tasks.set(taskId, task);
        this.notifyListeners();
        onError?.(task.error);
      }
      throw error;
    } finally {
      this.abortControllers.delete(taskId);
    }
  }

  pausePull(taskId: string): boolean {
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
      
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'paused';
        this.tasks.set(taskId, task);
        this.notifyListeners();
      }
      
      return true;
    }
    return false;
  }

  cancelPull(taskId: string): boolean {
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
    }
    
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'cancelled';
      task.progress = { status: 'Cancelled', percentage: 0 };
      this.tasks.set(taskId, task);
      this.notifyListeners();
      
      this.tasks.delete(taskId);
      this.notifyListeners();
    }
    
    return true;
  }

  removeTask(taskId: string) {
    this.tasks.delete(taskId);
    this.notifyListeners();
  }

  clearCompletedTasks() {
    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'error') {
        this.tasks.delete(id);
      }
    }
    this.notifyListeners();
  }
}

export const ollamaPullService = OllamaPullService.getInstance();
