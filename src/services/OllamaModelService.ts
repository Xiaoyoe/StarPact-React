import { useStore } from '@/store';

class OllamaModelService {
  private static instance: OllamaModelService;
  private switchingModel: boolean = false;
  private config = { host: 'localhost', port: 11434 };

  private constructor() {}

  static getInstance(): OllamaModelService {
    if (!OllamaModelService.instance) {
      OllamaModelService.instance = new OllamaModelService();
    }
    return OllamaModelService.instance;
  }

  isSwitching(): boolean {
    return this.switchingModel;
  }

  async switchModel(
    newModelName: string, 
    toast: any,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ): Promise<boolean> {
    const store = useStore.getState();
    const { activeOllamaModel, setActiveOllamaModel, setActiveModel, addOllamaLog } = store;

    if (this.switchingModel) {
      toast.info('正在切换模型中，请稍候', { duration: 2000 });
      return false;
    }

    if (newModelName === activeOllamaModel) {
      toast.info(`${newModelName} 已是当前选中模型`, { duration: 2000 });
      onSuccess?.();
      return true;
    }

    this.switchingModel = true;

    try {
      if (activeOllamaModel) {
        toast.info(`正在关闭 ${activeOllamaModel}...`, { duration: 2000 });
        addOllamaLog({ type: 'info', message: `正在关闭模型 ${activeOllamaModel}...` });
        
        await fetch(`http://${this.config.host}:${this.config.port}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: activeOllamaModel,
            keep_alive: 0
          })
        });
        
        addOllamaLog({ type: 'info', message: `模型 ${activeOllamaModel} 已关闭` });
      }

      setActiveOllamaModel(newModelName);
      setActiveModel(null);
      toast.info(`正在启动 ${newModelName}...`, { duration: 2000 });
      addOllamaLog({ type: 'info', message: `正在启动模型 ${newModelName}...` });

      const response = await fetch(`http://${this.config.host}:${this.config.port}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: newModelName,
          prompt: '',
          keep_alive: '10m'
        })
      });

      if (response.ok) {
        addOllamaLog({ type: 'info', message: `模型 ${newModelName} 已启动` });
        setTimeout(() => {
          toast.success(`已切换到 ${newModelName}`, { duration: 2000 });
          onSuccess?.();
        }, 2000);
        return true;
      } else {
        addOllamaLog({ type: 'error', message: `启动模型 ${newModelName} 失败` });
        toast.error(`启动 ${newModelName} 失败`, { duration: 3000 });
        onError?.(new Error(`启动失败: HTTP ${response.status}`));
        return false;
      }
    } catch (error) {
      addOllamaLog({ type: 'error', message: `切换模型失败: ${error}` });
      toast.error('模型切换失败', { duration: 3000 });
      onError?.(error);
      return false;
    } finally {
      setTimeout(() => {
        this.switchingModel = false;
      }, 3000);
    }
  }

  async stopModel(
    modelName: string,
    toast: any,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ): Promise<boolean> {
    const store = useStore.getState();
    const { setActiveOllamaModel, addOllamaLog } = store;

    try {
      toast.info(`正在停止 ${modelName}...`, { duration: 2000 });
      addOllamaLog({ type: 'info', message: `正在停止模型 ${modelName}...` });
      
      await fetch(`http://${this.config.host}:${this.config.port}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          keep_alive: 0
        })
      });

      setActiveOllamaModel(null);
      addOllamaLog({ type: 'info', message: `模型 ${modelName} 已停止` });
      toast.success(`已停止 ${modelName}`, { duration: 2000 });
      onSuccess?.();
      return true;
    } catch (error) {
      addOllamaLog({ type: 'error', message: `停止模型 ${modelName} 失败` });
      toast.error('停止模型失败', { duration: 3000 });
      onError?.(error);
      return false;
    }
  }

  setConfig(host: string, port: number) {
    this.config = { host, port };
  }
}

export const ollamaModelService = OllamaModelService.getInstance();
