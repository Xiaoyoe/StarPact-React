import { IndexedDBStorage } from './IndexedDBStorage';

/**
 * 模板结果接口
 */
export interface TemplateResult {
  id: string;
  type: 'text' | 'image';
  versionNote: string;
  createdAt: string;
  content: string;
}

/**
 * 模板接口
 */
export interface Template {
  id: string;
  title: string;
  category: string;
  tags: string[];
  versionNote: string;
  content: string;
  results: TemplateResult[];
  createdAt: string;
}

/**
 * 提示词模板存储服务
 */
export class PromptTemplateStorage {
  private static dbStorage: IndexedDBStorage = IndexedDBStorage.getInstance();

  /**
   * 保存模板到IndexedDB
   * @param template 模板数据
   * @returns 是否保存成功
   */
  static async saveTemplate(template: Template): Promise<boolean> {
    try {
      console.log('开始保存提示词模板');
      
      // 使用IndexedDB存储模板数据
      await this.dbStorage.put('prompt-templates', template);
      console.log('提示词模板保存成功');

      return true;
    } catch (error) {
      console.error('保存提示词模板失败:', error);
      return false;
    }
  }

  /**
   * 获取单个模板
   * @param templateId 模板ID
   * @returns 模板数据或null
   */
  static async getTemplate(templateId: string): Promise<Template | null> {
    try {
      const template = await this.dbStorage.get<Template>('prompt-templates', templateId);
      return template;
    } catch (error) {
      console.error('获取提示词模板失败:', error);
      return null;
    }
  }

  /**
   * 从假数据文件导入初始模板
   * @returns 导入的模板数量
   */
  static async importMockData(): Promise<number> {
    try {
      console.log('开始从假数据文件导入初始模板');
      
      // 读取假数据文件
      const response = await fetch('/src/services/storage/mock-data/prompt-templates.json');
      if (!response.ok) {
        throw new Error('Failed to load mock data');
      }
      
      const mockTemplates = await response.json() as Template[];
      console.log('加载的假数据模板数量:', mockTemplates.length);
      
      // 保存到IndexedDB
      let importedCount = 0;
      for (const template of mockTemplates) {
        const success = await this.saveTemplate(template);
        if (success) {
          importedCount++;
        }
      }
      
      console.log('成功导入的模板数量:', importedCount);
      return importedCount;
    } catch (error) {
      console.error('导入假数据失败:', error);
      return 0;
    }
  }

  /**
   * 获取所有模板
   * @returns 模板数组
   */
  static async getAllTemplates(): Promise<Template[]> {
    try {
      console.log('开始获取所有提示词模板');
      
      const templates = await this.dbStorage.getAll<Template>('prompt-templates');
      console.log('最终加载的模板数量:', templates.length);
      
      // 如果没有模板，自动导入假数据
      if (templates.length === 0) {
        console.log('没有找到模板，开始导入假数据');
        await this.importMockData();
        // 重新获取导入后的模板
        const importedTemplates = await this.dbStorage.getAll<Template>('prompt-templates');
        console.log('导入后加载的模板数量:', importedTemplates.length);
        return importedTemplates;
      }
      
      return templates;
    } catch (error) {
      console.error('获取所有提示词模板失败:', error);
      return [];
    }
  }

  /**
   * 删除模板
   * @param templateId 模板ID
   * @returns 是否删除成功
   */
  static async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      await this.dbStorage.delete('prompt-templates', templateId);
      return true;
    } catch (error) {
      console.error('删除提示词模板失败:', error);
      return false;
    }
  }

  /**
   * 更新模板结果
   * @param templateId 模板ID
   * @param results 新的结果数组
   * @returns 是否更新成功
   */
  static async updateResults(templateId: string, results: TemplateResult[]): Promise<boolean> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        return false;
      }
      
      template.results = results;
      return await this.saveTemplate(template);
    } catch (error) {
      console.error('更新模板结果失败:', error);
      return false;
    }
  }

  /**
   * 导出模板
   * @returns 导出的模板Blob
   */
  static async exportTemplates(): Promise<Blob | null> {
    try {
      const templates = await this.getAllTemplates();
      const jsonString = JSON.stringify(templates, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // 触发文件下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-templates-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return blob;
    } catch (error) {
      console.error('导出模板失败:', error);
      return null;
    }
  }

  /**
   * 导入模板
   * @param templates 模板数组
   * @returns 导入的模板数量
   */
  static async importTemplates(templates: Template[]): Promise<number> {
    try {
      let importedCount = 0;
      
      for (const template of templates) {
        // 生成新的ID，避免冲突
        const newTemplate: Template = {
          ...template,
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString()
        };
        
        const success = await this.saveTemplate(newTemplate);
        if (success) {
          importedCount++;
        }
      }
      
      return importedCount;
    } catch (error) {
      console.error('导入模板失败:', error);
      return 0;
    }
  }

  /**
   * 从文件导入模板
   * @param file 模板文件
   * @returns 导入的模板数量
   */
  static async importTemplatesFromFile(file: File): Promise<number> {
    try {
      const text = await file.text();
      const templates = JSON.parse(text) as Template[];
      return await this.importTemplates(templates);
    } catch (error) {
      console.error('从文件导入模板失败:', error);
      return 0;
    }
  }

  /**
   * 搜索模板
   * @param query 搜索关键词
   * @returns 匹配的模板数组
   */
  static async searchTemplates(query: string): Promise<Template[]> {
    try {
      const templates = await this.getAllTemplates();
      
      if (!query.trim()) {
        return templates;
      }
      
      const q = query.toLowerCase();
      return templates.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    } catch (error) {
      console.error('搜索模板失败:', error);
      return [];
    }
  }

  /**
   * 获取模板统计信息
   * @returns 统计信息
   */
  static async getTemplateStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    totalResults: number;
  }> {
    try {
      const templates = await this.getAllTemplates();
      const stats = {
        total: templates.length,
        byCategory: {} as Record<string, number>,
        totalResults: 0
      };
      
      templates.forEach(template => {
        // 按分类统计
        if (!stats.byCategory[template.category]) {
          stats.byCategory[template.category] = 0;
        }
        stats.byCategory[template.category]++;
        
        // 统计总结果数
        stats.totalResults += template.results.length;
      });
      
      return stats;
    } catch (error) {
      console.error('获取模板统计信息失败:', error);
      return {
        total: 0,
        byCategory: {},
        totalResults: 0
      };
    }
  }

  /**
   * 同步方法（兼容旧代码）
   */
  static saveTemplateSync(template: Template): boolean {
    this.saveTemplate(template).catch(console.error);
    return true;
  }

  static getAllTemplatesSync(): Template[] {
    // 注意：这里返回空数组，实际使用时应该使用异步方法
    return [];
  }

  static deleteTemplateSync(templateId: string): boolean {
    this.deleteTemplate(templateId).catch(console.error);
    return true;
  }

  static updateResultsSync(templateId: string, results: TemplateResult[]): boolean {
    this.updateResults(templateId, results).catch(console.error);
    return true;
  }
}

/**
 * 同步方法（兼容旧代码）
 */
export class PromptTemplateStorageSync {
  /**
   * 同步保存模板（内部使用异步实现）
   */
  static saveTemplate(template: Template): boolean {
    PromptTemplateStorage.saveTemplate(template).catch(console.error);
    return true;
  }

  /**
   * 同步获取单个模板（内部使用异步实现）
   */
  static getTemplate(templateId: string): Template | null {
    // 注意：这里返回null，实际使用时应该使用异步方法
    return null;
  }

  /**
   * 同步获取所有模板（内部使用异步实现）
   */
  static getAllTemplates(): Template[] {
    // 注意：这里返回空数组，实际使用时应该使用异步方法
    return [];
  }

  /**
   * 同步删除模板（内部使用异步实现）
   */
  static deleteTemplate(templateId: string): boolean {
    PromptTemplateStorage.deleteTemplate(templateId).catch(console.error);
    return true;
  }

  /**
   * 同步更新模板结果（内部使用异步实现）
   */
  static updateResults(templateId: string, results: TemplateResult[]): boolean {
    PromptTemplateStorage.updateResults(templateId, results).catch(console.error);
    return true;
  }

  /**
   * 同步导出模板（内部使用异步实现）
   */
  static exportTemplates(): boolean {
    PromptTemplateStorage.exportTemplates().catch(console.error);
    return true;
  }

  /**
   * 同步导入模板（内部使用异步实现）
   */
  static importTemplates(templates: Template[]): number {
    // 注意：这里返回0，实际使用时应该使用异步方法
    PromptTemplateStorage.importTemplates(templates).catch(console.error);
    return 0;
  }

  /**
   * 同步从文件导入模板（内部使用异步实现）
   */
  static importTemplatesFromFile(file: File): number {
    // 注意：这里返回0，实际使用时应该使用异步方法
    PromptTemplateStorage.importTemplatesFromFile(file).catch(console.error);
    return 0;
  }

  /**
   * 导出模板到本地文件夹
   * @param folderPath 文件夹路径
   * @returns 是否导出成功
   */
  static async exportToLocalFolder(folderPath: string): Promise<boolean> {
    try {
      const templates = await this.getAllTemplates();
      const jsonString = JSON.stringify(templates, null, 2);
      const fileName = `prompt-templates-${new Date().toISOString().split('T')[0]}.json`;
      
      // 在Electron环境中使用fs模块写入文件
      if (typeof window !== 'undefined' && (window as any).require) {
        const fs = (window as any).require('fs');
        const path = (window as any).require('path');
        const filePath = path.join(folderPath, fileName);
        
        fs.writeFileSync(filePath, jsonString, 'utf8');
        console.log('成功导出模板到本地文件夹:', filePath);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('导出模板到本地文件夹失败:', error);
      return false;
    }
  }

  /**
   * 从本地文件夹导入模板
   * @param filePath 文件路径
   * @returns 导入的模板数量
   */
  static async importFromLocalFile(filePath: string): Promise<number> {
    try {
      // 在Electron环境中使用fs模块读取文件
      if (typeof window !== 'undefined' && (window as any).require) {
        const fs = (window as any).require('fs');
        const jsonString = fs.readFileSync(filePath, 'utf8');
        const templates = JSON.parse(jsonString) as Template[];
        
        let importedCount = 0;
        for (const template of templates) {
          const success = await this.saveTemplate(template);
          if (success) {
            importedCount++;
          }
        }
        
        console.log('成功从本地文件导入模板:', importedCount, '个');
        return importedCount;
      }
      
      return 0;
    } catch (error) {
      console.error('从本地文件导入模板失败:', error);
      return 0;
    }
  }
}
