import { StorageManager } from './StorageManager';
import { IndexedDBStorage } from './IndexedDBStorage';

/**
 * 图片元数据接口
 */
export interface ImageMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  width: number;
  height: number;
  addedAt: number;
  filePath: string; // 本地文件路径（兼容旧数据）
  tags?: string[]; // 图片标签
  description?: string; // 图片描述
  thumbnailPath?: string; // 缩略图路径（兼容旧数据）
}

/**
 * 图片相册接口
 */
export interface ImageAlbum {
  id: string;
  name: string;
  images: ImageMetadata[];
  createdAt: number;
  updatedAt: number;
  coverImageId?: string; // 封面图片ID
}

/**
 * 图片存储服务
 */
export class GalleryStorage {
  private static dbStorage: IndexedDBStorage = IndexedDBStorage.getInstance();

  /**
   * 保存图片相册
   * @param storagePath 存储路径（兼容参数）
   * @param album 相册数据
   * @returns 是否保存成功
   */
  static async saveAlbum(storagePath: string, album: ImageAlbum): Promise<boolean> {
    try {
      // 使用IndexedDB存储相册数据
      await this.dbStorage.put('gallery', album);
      return true;
    } catch (error) {
      console.error('保存图片相册失败:', error);
      return false;
    }
  }

  /**
   * 加载图片相册
   * @param storagePath 存储路径（兼容参数）
   * @param albumId 相册ID
   * @returns 相册数据或null
   */
  static async loadAlbum(storagePath: string, albumId: string): Promise<ImageAlbum | null> {
    try {
      const album = await this.dbStorage.get<ImageAlbum>('gallery', albumId);
      return album;
    } catch (error) {
      console.error('加载图片相册失败:', error);
      return null;
    }
  }

  /**
   * 获取所有图片相册
   * @param storagePath 存储路径（兼容参数）
   * @returns 相册数组
   */
  static async getAllAlbums(storagePath: string): Promise<ImageAlbum[]> {
    try {
      const albums = await this.dbStorage.getAll<ImageAlbum>('gallery');
      
      if (albums.length === 0) {
        return [];
      }
      
      // 处理每个相册中的图片文件，重新生成有效的 Blob URL
      const processedAlbums = await Promise.all(
        albums.map(async (album) => {
          const processedImages = await Promise.all(
            album.images.map(async (image) => {
              // 检查图片是否有 ID，无论 URL 是否为空或已失效，都尝试从 IndexedDB 获取图片文件
              if (image.id) {
                try {
                  // 从 IndexedDB 中获取图片文件
                  const imageData = await this.dbStorage.getFile('images', image.id);
                  if (imageData && imageData.blob) {
                    // 重新生成 Blob URL
                    const newBlobUrl = URL.createObjectURL(imageData.blob);
                    return {
                      ...image,
                      url: newBlobUrl
                    };
                  }
                } catch (error) {
                  console.error('获取图片文件失败:', error);
                }
              }
              return image;
            })
          );
          
          return {
            ...album,
            images: processedImages
          };
        })
      );
      
      return processedAlbums;
    } catch (error) {
      console.error('获取所有图片相册失败:', error);
      return [];
    }
  }

  /**
   * 删除图片相册
   * @param storagePath 存储路径（兼容参数）
   * @param albumId 相册ID
   * @returns 是否删除成功
   */
  static async deleteAlbum(storagePath: string, albumId: string): Promise<boolean> {
    try {
      await this.dbStorage.delete('gallery', albumId);
      return true;
    } catch (error) {
      console.error('删除图片相册失败:', error);
      return false;
    }
  }

  /**
   * 保存图片文件到IndexedDB
   * @param storagePath 存储路径（兼容参数）
   * @param imageFile 图片文件
   * @returns 保存的图片元数据或null
   */
  static async saveImageFile(storagePath: string, imageFile: File): Promise<ImageMetadata | null> {
    try {
      // 生成图片ID
      const imageId = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 读取文件为Blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          resolve(new Blob([arrayBuffer], { type: imageFile.type }));
        };
        reader.onerror = (error) => {
          console.error('FileReader 错误:', error);
          reject(error);
        };
        reader.readAsArrayBuffer(imageFile);
      });
      
      // 存储图片文件到IndexedDB
      await this.dbStorage.storeFile('images', imageId, blob, {
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type
      });
      
      // 创建图片元数据
      const blobUrl = URL.createObjectURL(blob);
      
      const metadata: ImageMetadata = {
        id: imageId,
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type,
        url: blobUrl,
        width: 0, // 后续可以通过图像处理库获取
        height: 0, // 后续可以通过图像处理库获取
        addedAt: Date.now(),
        filePath: '' // IndexedDB存储不需要文件路径
      };

      return metadata;
    } catch (error) {
      console.error('保存图片文件失败:', error);
      return null;
    }
  }

  /**
   * 删除图片文件
   * @param storagePath 存储路径（兼容参数）
   * @param imageId 图片ID
   * @param albumId 相册ID
   * @returns 是否删除成功
   */
  static async deleteImageFile(storagePath: string, imageId: string, albumId: string): Promise<boolean> {
    try {
      const album = await this.loadAlbum(storagePath, albumId);
      if (!album) {
        return false;
      }

      // 从IndexedDB删除图片文件
      await this.dbStorage.delete('images', imageId);

      // 从相册中移除图片
      album.images = album.images.filter(img => img.id !== imageId);
      album.updatedAt = Date.now();

      // 如果删除的是封面图片，清除封面图片ID
      if (album.coverImageId === imageId) {
        album.coverImageId = album.images.length > 0 ? album.images[0].id : undefined;
      }

      // 保存更新后的相册
      return await this.saveAlbum(storagePath, album);
    } catch (error) {
      console.error('删除图片文件失败:', error);
      return false;
    }
  }

  /**
   * 导出图片相册
   * @param storagePath 存储路径（兼容参数）
   * @param albumId 相册ID
   * @returns 导出的相册Blob
   */
  static async exportAlbum(storagePath: string, albumId: string): Promise<Blob | null> {
    try {
      const album = await this.loadAlbum(storagePath, albumId);
      if (!album) {
        return null;
      }

      const jsonString = JSON.stringify(album, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // 触发文件下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${album.name}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return blob;
    } catch (error) {
      console.error('导出图片相册失败:', error);
      return null;
    }
  }

  /**
   * 导入图片相册
   * @param storagePath 存储路径（兼容参数）
   * @param albumData 相册数据
   * @returns 导入的相册或null
   */
  static async importAlbum(storagePath: string, albumData: ImageAlbum): Promise<ImageAlbum | null> {
    try {
      // 生成新的ID，避免冲突
      const newAlbum: ImageAlbum = {
        ...albumData,
        id: `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        updatedAt: Date.now(),
        images: albumData.images.map(image => ({
          ...image,
          id: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }))
      };

      await this.saveAlbum(storagePath, newAlbum);
      return newAlbum;
    } catch (error) {
      console.error('导入图片相册失败:', error);
      return null;
    }
  }

  /**
   * 从文件导入图片相册
   * @param storagePath 存储路径（兼容参数）
   * @param file 相册文件
   * @returns 导入的相册或null
   */
  static async importAlbumFromFile(storagePath: string, file: File): Promise<ImageAlbum | null> {
    try {
      const text = await file.text();
      const album = JSON.parse(text) as ImageAlbum;
      return await this.importAlbum(storagePath, album);
    } catch (error) {
      console.error('从文件导入图片相册失败:', error);
      return null;
    }
  }

  /**
   * 搜索图片
   * @param storagePath 存储路径（兼容参数）
   * @param query 搜索关键词
   * @returns 匹配的图片元数据数组
   */
  static async searchImages(storagePath: string, query: string): Promise<ImageMetadata[]> {
    try {
      const albums = await this.getAllAlbums(storagePath);
      const allImages = albums.flatMap(album => album.images);

      return allImages.filter(image => 
        image.name.toLowerCase().includes(query.toLowerCase()) ||
        image.description?.toLowerCase().includes(query.toLowerCase()) ||
        image.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
    } catch (error) {
      console.error('搜索图片失败:', error);
      return [];
    }
  }

  /**
   * 获取图片文件
   * @param imageId 图片ID
   * @returns 图片Blob或null
   */
  static async getImageFile(imageId: string): Promise<Blob | null> {
    try {
      const fileData = await this.dbStorage.getFile('images', imageId);
      return fileData?.blob || null;
    } catch (error) {
      console.error('获取图片文件失败:', error);
      return null;
    }
  }
}

/**
 * 同步方法（兼容旧代码）
 */
export class GalleryStorageSync {
  /**
   * 同步保存相册（内部使用异步实现）
   */
  static saveAlbum(storagePath: string, album: ImageAlbum): boolean {
    GalleryStorage.saveAlbum(storagePath, album).catch(console.error);
    return true;
  }

  /**
   * 同步加载相册（内部使用异步实现）
   */
  static loadAlbum(storagePath: string, albumId: string): ImageAlbum | null {
    // 注意：这里返回null，实际使用时应该使用异步方法
    return null;
  }

  /**
   * 同步获取所有相册（内部使用异步实现）
   */
  static getAllAlbums(storagePath: string): ImageAlbum[] {
    // 注意：这里返回空数组，实际使用时应该使用异步方法
    return [];
  }

  /**
   * 同步删除相册（内部使用异步实现）
   */
  static deleteAlbum(storagePath: string, albumId: string): boolean {
    GalleryStorage.deleteAlbum(storagePath, albumId).catch(console.error);
    return true;
  }

  /**
   * 同步删除图片文件（内部使用异步实现）
   */
  static deleteImageFile(storagePath: string, imageId: string, albumId: string): boolean {
    GalleryStorage.deleteImageFile(storagePath, imageId, albumId).catch(console.error);
    return true;
  }

  /**
   * 同步导出相册（内部使用异步实现）
   */
  static exportAlbum(storagePath: string, albumId: string, exportPath: string): boolean {
    GalleryStorage.exportAlbum(storagePath, albumId).catch(console.error);
    return true;
  }

  /**
   * 同步导入相册（内部使用异步实现）
   */
  static importAlbum(storagePath: string, importPath: string): ImageAlbum | null {
    // 注意：这里返回null，实际使用时应该使用异步方法
    return null;
  }

  /**
   * 同步搜索图片（内部使用异步实现）
   */
  static searchImages(storagePath: string, query: string): ImageMetadata[] {
    // 注意：这里返回空数组，实际使用时应该使用异步方法
    return [];
  }
}
