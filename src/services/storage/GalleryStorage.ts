import { StorageManager } from './StorageManager';

// 检查是否为浏览器环境（非 Electron）
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined' && !(typeof process !== 'undefined' && process.versions && process.versions.electron);

// 浏览器兼容的 path 模块实现
const path = isBrowser ? {
  join: (...parts: string[]) => parts.join('/'),
  resolve: (part: string) => part,
  basename: (filePath: string) => filePath.split('/').pop() || '',
  extname: (filePath: string) => {
    const parts = filePath.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }
} : require('path');

// 浏览器兼容的 fs 模块实现
const fs = isBrowser ? {
  existsSync: () => true,
  mkdirSync: () => {},
  writeFileSync: () => {},
  readFileSync: () => '{}',
  readdirSync: () => [],
  unlinkSync: () => {}
} : require('fs');

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
  filePath: string; // 本地文件路径
  tags?: string[]; // 图片标签
  description?: string; // 图片描述
  thumbnailPath?: string; // 缩略图路径
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
  /**
   * 保存图片相册
   * @param storagePath 存储路径
   * @param album 相册数据
   * @returns 是否保存成功
   */
  static saveAlbum(storagePath: string, album: ImageAlbum): boolean {
    try {
      console.log('开始保存相册，存储路径:', storagePath);
      
      const galleryPath = StorageManager.getGalleryPath(storagePath);
      console.log('相册存储路径:', galleryPath);
      
      const albumPath = path.join(galleryPath, `${album.id}.json`);
      console.log('相册文件路径:', albumPath);

      // 确保目录存在
      if (!fs.existsSync(galleryPath)) {
        console.log('目录不存在，开始创建:', galleryPath);
        fs.mkdirSync(galleryPath, { recursive: true });
        console.log('目录创建成功');
      } else {
        console.log('目录已存在:', galleryPath);
      }

      // 保存相册数据
      console.log('准备写入相册数据，图片数量:', album.images.length);
      fs.writeFileSync(
        albumPath,
        JSON.stringify(album, null, 2),
        'utf8'
      );
      console.log('相册数据保存成功');

      return true;
    } catch (error) {
      console.error('保存图片相册失败:', error);
      return false;
    }
  }

  /**
   * 加载图片相册
   * @param storagePath 存储路径
   * @param albumId 相册ID
   * @returns 相册数据或null
   */
  static loadAlbum(storagePath: string, albumId: string): ImageAlbum | null {
    try {
      const galleryPath = StorageManager.getGalleryPath(storagePath);
      const albumPath = path.join(galleryPath, `${albumId}.json`);

      if (!fs.existsSync(albumPath)) {
        return null;
      }

      const data = fs.readFileSync(albumPath, 'utf8');
      const album = JSON.parse(data) as ImageAlbum;

      return album;
    } catch (error) {
      console.error('加载图片相册失败:', error);
      return null;
    }
  }

  /**
   * 获取所有图片相册
   * @param storagePath 存储路径
   * @returns 相册数组
   */
  static getAllAlbums(storagePath: string): ImageAlbum[] {
    try {
      console.log('开始获取所有相册，存储路径:', storagePath);
      
      const galleryPath = StorageManager.getGalleryPath(storagePath);
      console.log('相册存储路径:', galleryPath);

      if (!fs.existsSync(galleryPath)) {
        console.log('相册存储路径不存在');
        return [];
      }

      console.log('相册存储路径存在');
      const files = fs.readdirSync(galleryPath);
      console.log('目录中的文件数量:', files.length);
      console.log('目录中的文件:', files);
      
      const albums: ImageAlbum[] = [];

      for (const file of files) {
        if (path.extname(file) === '.json') {
          console.log('找到相册文件:', file);
          const albumId = path.basename(file, '.json');
          console.log('相册ID:', albumId);
          const album = this.loadAlbum(storagePath, albumId);
          if (album) {
            console.log('加载相册成功:', album.name, '图片数量:', album.images.length);
            albums.push(album);
          } else {
            console.log('加载相册失败:', albumId);
          }
        } else {
          console.log('跳过非相册文件:', file);
        }
      }

      console.log('最终加载的相册数量:', albums.length);
      return albums;
    } catch (error) {
      console.error('获取所有图片相册失败:', error);
      return [];
    }
  }

  /**
   * 删除图片相册
   * @param storagePath 存储路径
   * @param albumId 相册ID
   * @returns 是否删除成功
   */
  static deleteAlbum(storagePath: string, albumId: string): boolean {
    try {
      const galleryPath = StorageManager.getGalleryPath(storagePath);
      const albumPath = path.join(galleryPath, `${albumId}.json`);

      if (fs.existsSync(albumPath)) {
        fs.unlinkSync(albumPath);
      }

      return true;
    } catch (error) {
      console.error('删除图片相册失败:', error);
      return false;
    }
  }

  /**
   * 保存图片文件到本地
   * @param storagePath 存储路径
   * @param imageFile 图片文件
   * @returns 保存的图片元数据或null
   */
  static async saveImageFile(storagePath: string, imageFile: File): Promise<ImageMetadata | null> {
    try {
      console.log('开始保存图片文件，存储路径:', storagePath);
      console.log('图片文件名:', imageFile.name);
      console.log('图片文件大小:', imageFile.size);
      console.log('图片文件类型:', imageFile.type);
      console.log('是否为浏览器环境:', isBrowser);
      
      // 浏览器环境：使用Data URL
      if (isBrowser) {
        console.log('浏览器环境，使用Data URL');
        return new Promise<ImageMetadata>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            console.log('Data URL 生成成功');
            const metadata: ImageMetadata = {
              id: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: imageFile.name,
              size: imageFile.size,
              type: imageFile.type,
              url: e.target?.result as string || '',
              width: 0,
              height: 0,
              addedAt: Date.now(),
              filePath: ''
            };
            resolve(metadata);
          };
          reader.onerror = (error) => {
            console.error('FileReader 错误:', error);
            resolve(null);
          };
          reader.readAsDataURL(imageFile);
        });
      }

      // Node.js 环境：保存到本地文件系统
      console.log('Node.js 环境，保存到本地文件系统');
      const galleryPath = StorageManager.getGalleryPath(storagePath);
      console.log('相册路径:', galleryPath);
      
      const imagesPath = path.join(galleryPath, 'images');
      console.log('图片存储路径:', imagesPath);
      
      const thumbnailsPath = path.join(galleryPath, 'thumbnails');
      console.log('缩略图存储路径:', thumbnailsPath);

      // 确保目录存在
      if (!fs.existsSync(imagesPath)) {
        console.log('图片存储路径不存在，开始创建:', imagesPath);
        fs.mkdirSync(imagesPath, { recursive: true });
        console.log('图片存储路径创建成功');
      } else {
        console.log('图片存储路径已存在:', imagesPath);
      }

      if (!fs.existsSync(thumbnailsPath)) {
        console.log('缩略图存储路径不存在，开始创建:', thumbnailsPath);
        fs.mkdirSync(thumbnailsPath, { recursive: true });
        console.log('缩略图存储路径创建成功');
      } else {
        console.log('缩略图存储路径已存在:', thumbnailsPath);
      }

      // 生成本地文件路径
      const safeFileName = this.getSafeFileName(imageFile.name);
      console.log('安全文件名:', safeFileName);
      
      const localFilePath = path.join(imagesPath, safeFileName);
      console.log('本地文件路径:', localFilePath);

      // 保存图片文件
      try {
        // 尝试读取文件内容
        let fileContent;
        if (imageFile.path) {
          // Electron 环境，文件有路径
          console.log('Electron 环境，文件路径:', imageFile.path);
          fileContent = fs.readFileSync(imageFile.path);
          console.log('文件读取成功，大小:', fileContent.length);
        } else {
          // 浏览器环境或其他环境，使用 FileReader
          console.log('非 Electron 环境，使用 FileReader');
          fileContent = await new Promise<Buffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const arrayBuffer = e.target?.result as ArrayBuffer;
              console.log('FileReader 读取成功，大小:', arrayBuffer.byteLength);
              resolve(Buffer.from(arrayBuffer));
            };
            reader.onerror = (error) => {
              console.error('FileReader 错误:', error);
              reject(error);
            };
            reader.readAsArrayBuffer(imageFile);
          });
        }
        
        // 写入文件
        console.log('准备写入文件:', localFilePath);
        fs.writeFileSync(localFilePath, fileContent);
        console.log('文件写入成功');
      } catch (readError) {
        console.error('读取图片文件失败:', readError);
        // 回退到使用Data URL
        console.log('回退到使用Data URL');
        return new Promise<ImageMetadata>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            console.log('回退 Data URL 生成成功');
            const metadata: ImageMetadata = {
              id: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: imageFile.name,
              size: imageFile.size,
              type: imageFile.type,
              url: e.target?.result as string || '',
              width: 0,
              height: 0,
              addedAt: Date.now(),
              filePath: ''
            };
            resolve(metadata);
          };
          reader.onerror = (error) => {
            console.error('回退 FileReader 错误:', error);
            resolve(null);
          };
          reader.readAsDataURL(imageFile);
        });
      }

      // 创建图片元数据
      console.log('创建图片元数据');
      const metadata: ImageMetadata = {
        id: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type,
        url: `file://${localFilePath}`,
        width: 0, // 后续可以通过图像处理库获取
        height: 0, // 后续可以通过图像处理库获取
        addedAt: Date.now(),
        filePath: localFilePath
      };

      console.log('图片元数据创建成功');
      return metadata;
    } catch (error) {
      console.error('保存图片文件失败:', error);
      return null;
    }
  }

  /**
   * 删除图片文件
   * @param storagePath 存储路径
   * @param imageId 图片ID
   * @param albumId 相册ID
   * @returns 是否删除成功
   */
  static deleteImageFile(storagePath: string, imageId: string, albumId: string): boolean {
    try {
      const album = this.loadAlbum(storagePath, albumId);
      if (!album) {
        return false;
      }

      const image = album.images.find(img => img.id === imageId);
      if (!image) {
        return false;
      }

      // 删除本地图片文件
      if (image.filePath && fs.existsSync(image.filePath)) {
        fs.unlinkSync(image.filePath);
      }

      // 删除缩略图文件
      if (image.thumbnailPath && fs.existsSync(image.thumbnailPath)) {
        fs.unlinkSync(image.thumbnailPath);
      }

      // 从相册中移除图片
      album.images = album.images.filter(img => img.id !== imageId);
      album.updatedAt = Date.now();

      // 如果删除的是封面图片，清除封面图片ID
      if (album.coverImageId === imageId) {
        album.coverImageId = album.images.length > 0 ? album.images[0].id : undefined;
      }

      // 保存更新后的相册
      return this.saveAlbum(storagePath, album);
    } catch (error) {
      console.error('删除图片文件失败:', error);
      return false;
    }
  }

  /**
   * 导出图片相册
   * @param storagePath 存储路径
   * @param albumId 相册ID
   * @param exportPath 导出路径
   * @returns 是否导出成功
   */
  static exportAlbum(storagePath: string, albumId: string, exportPath: string): boolean {
    try {
      const album = this.loadAlbum(storagePath, albumId);
      if (!album) {
        return false;
      }

      fs.writeFileSync(
        exportPath,
        JSON.stringify(album, null, 2),
        'utf8'
      );

      return true;
    } catch (error) {
      console.error('导出图片相册失败:', error);
      return false;
    }
  }

  /**
   * 导入图片相册
   * @param storagePath 存储路径
   * @param importPath 导入路径
   * @returns 导入的相册或null
   */
  static importAlbum(storagePath: string, importPath: string): ImageAlbum | null {
    try {
      const data = fs.readFileSync(importPath, 'utf8');
      const album = JSON.parse(data) as ImageAlbum;

      // 生成新的ID，避免冲突
      const newAlbum: ImageAlbum = {
        ...album,
        id: `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        updatedAt: Date.now(),
        images: album.images.map(image => ({
          ...image,
          id: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }))
      };

      this.saveAlbum(storagePath, newAlbum);
      return newAlbum;
    } catch (error) {
      console.error('导入图片相册失败:', error);
      return null;
    }
  }

  /**
   * 搜索图片
   * @param storagePath 存储路径
   * @param query 搜索关键词
   * @returns 匹配的图片元数据数组
   */
  static searchImages(storagePath: string, query: string): ImageMetadata[] {
    try {
      const albums = this.getAllAlbums(storagePath);
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
   * 获取安全的文件名，处理中文和特殊字符
   * @param fileName 原始文件名
   * @returns 安全的文件名
   */
  private static getSafeFileName(fileName: string): string {
    // 保留中文，移除或替换特殊字符
    const safeName = fileName.replace(/[<>"|:*?]/g, '_');
    return safeName;
  }
}
