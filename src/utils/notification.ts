export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'Notification' in window;
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Desktop notifications are not supported in this browser');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  async show(options: NotificationOptions): Promise<Notification | null> {
    if (!this.isSupported) {
      return null;
    }

    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        return null;
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return null;
    }
  }

  showChatComplete(modelName: string, preview?: string): Promise<Notification | null> {
    return this.show({
      title: `${modelName} 回复完成`,
      body: preview || 'AI 已完成回复，点击查看',
      tag: 'chat-complete',
      silent: false,
    });
  }

  showChatError(modelName: string, error: string): Promise<Notification | null> {
    return this.show({
      title: `${modelName} 响应失败`,
      body: error,
      tag: 'chat-error',
      silent: false,
    });
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  isEnabled(): boolean {
    return this.isSupported && this.permission === 'granted';
  }
}

export const notificationService = new NotificationService();
