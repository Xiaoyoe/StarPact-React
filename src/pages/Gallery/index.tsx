import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ImageGrid,
  ImageViewer,
  ImageEditor,
  GallerySidebar,
  GalleryToolbar
} from '@/components/GalleryComponents';
import { ImageItem, ImageFolder, ViewMode, SortBy, SortOrder } from '@/types/gallery';
import sharp from 'sharp';
import { useStore } from '@/store';
import { GalleryStorage, ImageMetadata, ImageAlbum } from '@/services/storage/GalleryStorage';
import { useToast } from '@/components/Toast';

// 检查是否为Electron环境
const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;

// 导入fs模块（仅在Electron环境）
const fs = isElectron ? require('fs') : null;

// 模拟path模块的basename和extname函数
const path = {
  basename: (filePath: string) => {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  },
  extname: (filePath: string) => {
    const lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return filePath.substring(lastDotIndex);
  }
};

// 模拟electron dialog API
const dialog = {
  showOpenDialog: async (options: any) => {
    // 在web环境中，我们使用HTML5的文件选择器
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options.properties?.includes('multiSelections');
      input.webkitdirectory = options.properties?.includes('openDirectory');
      
      if (options.filters) {
        const extensions = options.filters[0]?.extensions?.join(',');
        if (extensions) {
          input.accept = extensions.split(',').map((ext: string) => `.${ext}`).join(',');
        }
      }
      
      input.onchange = (e: any) => {
        const files = Array.from(e.target.files);
        resolve({ canceled: false, files });
      };
      
      input.oncancel = () => {
        resolve({ canceled: true, files: [] });
      };
      
      input.click();
    });
  }
};

// 从本地文件路径读取图片并转换为Data URL
const loadImageFromPath = async (filePath: string): Promise<string> => {
  if (!isElectron || !fs || !fs.existsSync(filePath)) {
    return '';
  }
  
  try {
    const fileContent = fs.readFileSync(filePath);
    const base64 = fileContent.toString('base64');
    const mimeType = getMimeTypeFromPath(filePath);
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('读取本地图片失败:', error);
    return '';
  }
};

// 根据文件路径获取MIME类型
const getMimeTypeFromPath = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    default:
      return 'image/jpeg';
  }
};

// 图片项接口，添加isLoaded状态
interface LazyImageItem extends ImageItem {
  isLoaded: boolean;
  originalUrl: string; // 原始URL（可能为空）
}

// 懒加载图片钩子
const useLazyLoadImages = (images: ImageItem[]): { lazyImages: LazyImageItem[]; setLazyImages: React.Dispatch<React.SetStateAction<LazyImageItem[]>> } => {
  const [lazyImages, setLazyImages] = useState<LazyImageItem[]>(
    images.map(img => ({
      ...img,
      isLoaded: !!img.url, // 如果已有URL则标记为已加载
      originalUrl: img.url
    }))
  );
  
  // 监听图片元素进入视口
  useEffect(() => {
    const imageElements = document.querySelectorAll('[data-image-id]');
    
    const observer = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const imageId = entry.target.getAttribute('data-image-id');
            if (imageId) {
              const imageIndex = lazyImages.findIndex(img => img.id === imageId);
              if (imageIndex !== -1 && !lazyImages[imageIndex].isLoaded && lazyImages[imageIndex].path) {
                console.log('图片进入视口，开始加载:', lazyImages[imageIndex].path);
                
                // 从本地路径加载图片
                const imageUrl = await loadImageFromPath(lazyImages[imageIndex].path);
                
                // 更新图片状态
                setLazyImages(prev => {
                  const newImages = [...prev];
                  newImages[imageIndex] = {
                    ...newImages[imageIndex],
                    isLoaded: true,
                    url: imageUrl
                  };
                  return newImages;
                });
              }
            }
          }
        }
      },
      {
        root: null,
        rootMargin: '200px 0px', // 提前200px开始加载
        threshold: 0.1
      }
    );
    
    // 观察所有图片元素
    imageElements.forEach(element => observer.observe(element));
    
    // 清理
    return () => {
      imageElements.forEach(element => observer.unobserve(element));
      observer.disconnect();
    };
  }, [lazyImages]);
  
  return { lazyImages, setLazyImages };
};

// 初始空文件夹数据
const initialFolders: ImageFolder[] = [
  {
    id: 'all',
    name: '全部图片',
    images: []
  },
  {
    id: 'favorites',
    name: '收藏',
    images: []
  }
];

export function GalleryPage() {
  const { storagePath } = useStore();
  const toast = useToast();
  

  
  // 状态管理
  const [folders, setFolders] = useState<ImageFolder[]>(initialFolders);
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showViewer, setShowViewer] = useState<boolean>(false);
  const [viewerIndex, setViewerIndex] = useState<number>(0);
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editingImage, setEditingImage] = useState<ImageItem | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true); // 加载状态
  
  // 当前文件夹
  const activeFolder = useMemo(() => {
    return folders.find(folder => folder.id === activeFolderId) || folders[0];
  }, [folders, activeFolderId]);
  
  // 使用懒加载钩子
  const { lazyImages, setLazyImages } = useLazyLoadImages(activeFolder.images);
  
  // 当激活文件夹变化时，更新懒加载的图片数据
  useEffect(() => {
    setLazyImages(activeFolder.images.map(img => ({
      ...img,
      isLoaded: !!img.url,
      originalUrl: img.url
    })));
  }, [activeFolder.images, setLazyImages]);

  // 从存储加载图片数据
  useEffect(() => {
    const loadImagesFromStorage = async () => {
      // 设置加载状态为true
      setIsLoading(true);
      
      try {
        if (storagePath) {
          // 修复路径重复问题
          let baseStoragePath = storagePath;
          // 检查存储路径是否已经包含 starpact-local
          if (storagePath.endsWith('starpact-local')) {
            // 如果包含，去掉末尾的 starpact-local
            baseStoragePath = storagePath.substring(0, storagePath.lastIndexOf('starpact-local')).trim();
          }
          
          const albums = await GalleryStorage.getAllAlbums(baseStoragePath);
          
          if (albums.length > 0) {
            // 将相册转换为文件夹格式，并从本地路径加载图片
            const loadedFolders: ImageFolder[] = await Promise.all(albums.map(async (album) => {
              // 从本地文件路径加载图片并转换为Data URL
              const loadedImages = await Promise.all(album.images.map(async (img) => {
                let imageUrl = img.url;
                
                // 如果URL为空但有filePath，则从本地路径加载
                if (!imageUrl && img.filePath) {
                  imageUrl = await loadImageFromPath(img.filePath);
                }
                
                return {
                  id: img.id,
                  name: img.name,
                  url: imageUrl,
                  path: img.filePath || '',
                  width: img.width,
                  height: img.height,
                  size: img.size,
                  type: img.type,
                  tags: img.tags || [],
                  favorite: false, // 可以根据需要从元数据中获取
                  isLongImage: img.height > img.width * 1.5,
                  aspectRatio: img.width / img.height,
                  dateAdded: new Date(img.addedAt)
                };
              }));
              
              return {
                id: album.id,
                name: album.name,
                images: loadedImages
              };
            }));
            
            // 添加默认文件夹
            const allImages = loadedFolders.flatMap(folder => folder.images);
            
            const defaultFolders: ImageFolder[] = [
              {
                id: 'all',
                name: '全部图片',
                images: allImages
              },
              {
                id: 'favorites',
                name: '收藏',
                images: allImages.filter(img => img.favorite)
              }
            ];
            
            setFolders([...defaultFolders, ...loadedFolders]);
          }
        }
      } catch (error) {
        console.error('加载图片数据失败:', error);
      } finally {
        // 无论成功失败，都设置加载状态为false
        setIsLoading(false);
      }
    };
    
    loadImagesFromStorage();
  }, [storagePath]);

  // 保存图片数据到存储
  useEffect(() => {
    const saveImagesToStorage = async () => {
      if (storagePath) {
        // 修复路径重复问题，与加载时使用相同的逻辑
        let baseStoragePath = storagePath;
        // 检查存储路径是否已经包含 starpact-local
        if (storagePath.endsWith('starpact-local')) {
          // 如果包含，去掉末尾的 starpact-local
          baseStoragePath = storagePath.substring(0, storagePath.lastIndexOf('starpact-local')).trim();
        }
        
        // 将文件夹转换为相册格式
        const foldersToSave = folders.filter(folder => !['all', 'favorites'].includes(folder.id));
        
        for (const folder of foldersToSave) {
          const album: ImageAlbum = {
            id: folder.id,
            name: folder.name,
            images: folder.images.map(img => ({
              id: img.id,
              name: img.name,
              size: img.size,
              type: img.type,
              url: '', // 不存储Data URL，只存储本地文件路径
              width: img.width,
              height: img.height,
              addedAt: img.dateAdded.getTime(),
              filePath: img.path || '',
              tags: img.tags
            })),
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          
          await GalleryStorage.saveAlbum(baseStoragePath, album);
        }
      }
    };
    
    saveImagesToStorage();
  }, [folders, storagePath]);

  // 当前文件夹


  // 过滤和排序后的图片
  const filteredImages = useMemo(() => {
    let result = [...activeFolder.images];

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(img => 
        img.name.toLowerCase().includes(query) ||
        img.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
          break;
        case 'size':
          comparison = b.size - a.size;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [activeFolder, searchQuery, sortBy, sortOrder]);

  // 处理图片选择
  const handleSelect = (id: string, multi: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (multi) {
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
      } else {
        newSet.clear();
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 处理全选
  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredImages.map(img => img.id)));
  };

  // 处理取消全选
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // 处理删除选中
  const handleDeleteSelected = () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length > 0) {
      // 调用删除图片函数
      handleDelete(idsToDelete);
      // 清空选中状态
      setSelectedIds(new Set());
    }
  };

  // 处理图片查看
  const handleView = (index: number) => {
    setViewerIndex(index);
    setShowViewer(true);
  };

  // 处理图片编辑
  const handleEdit = (image: ImageItem) => {
    setEditingImage(image);
    setShowEditor(true);
  };

  // 处理切换收藏
  const handleToggleFavorite = (id: string) => {
    // 更新图片的收藏状态
    setFolders(prevFolders => {
      return prevFolders.map(folder => {
        return {
          ...folder,
          images: folder.images.map(img => {
            if (img.id === id) {
              return {
                ...img,
                favorite: !img.favorite
              };
            }
            return img;
          })
        };
      });
    });
  };

  // 处理删除图片
  const handleDelete = async (ids: string[]) => {
    // 更新文件夹数据，移除删除的图片
    setFolders(prevFolders => {
      return prevFolders.map(folder => {
        // 过滤出未删除的图片
        const remainingImages = folder.images.filter(img => !ids.includes(img.id));
        
        // 如果有存储路径，删除本地文件系统中的图片文件
        if (storagePath) {
          ids.forEach(async imgId => {
            const imgToDelete = folder.images.find(img => img.id === imgId);
            if (imgToDelete && imgToDelete.path) {
              try {
                // 使用GalleryStorage删除图片文件
                // 这里需要知道图片所属的相册ID，我们简化处理，使用默认相册
                await GalleryStorage.deleteImageFile(storagePath, imgId, 'default');
              } catch (error) {
                console.error('删除图片文件失败:', error);
              }
            }
          });
        }
        
        return {
          ...folder,
          images: remainingImages
        };
      });
    });
  };

  // 生成唯一ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // 提取图片元数据
  const extractImageMetadata = async (filePath: string): Promise<{ width: number; height: number; aspectRatio: number }> => {
    try {
      // 在web环境中，我们使用一个简单的方法来模拟元数据提取
      // 在实际的Electron环境中，我们会使用sharp
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          resolve({ width: img.width, height: img.height, aspectRatio });
        };
        img.onerror = () => {
          resolve({ width: 0, height: 0, aspectRatio: 1 });
        };
        img.src = filePath;
      });
    } catch (error) {
      console.error('提取图片元数据失败:', error);
      return { width: 0, height: 0, aspectRatio: 1 };
    }
  };

  // 创建图片项
  const createImageItem = async (file: File): Promise<ImageItem> => {
    try {
      // 使用FileReader API读取文件
      const fileName = file.name;
      const fileExt = path.extname(fileName).toLowerCase().substring(1);
      
      // 读取文件为Data URL
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      
      // 提取图片元数据
      const metadata = await extractImageMetadata(url);
      
      return {
        id: generateId(),
        name: fileName,
        url: url,
        path: file.path || '',
        width: metadata.width,
        height: metadata.height,
        size: file.size,
        type: fileExt,
        tags: [],
        favorite: false,
        isLongImage: metadata.aspectRatio < 0.5 || metadata.aspectRatio > 2,
        aspectRatio: metadata.aspectRatio,
        dateAdded: new Date()
      };
    } catch (error) {
      console.error('创建图片项失败:', error);
      throw error;
    }
  };

  // 处理图片导入
  const handleImport = async () => {
    try {
      setImporting(true);
      setImportProgress(0);

      // 打开文件选择对话框
      const { canceled, files } = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
        ]
      });

      if (canceled || files.length === 0) {
        setImporting(false);
        return;
      }

      // 导入图片
      const newImages: ImageItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 首先创建图片项
        const imageItem = await createImageItem(file);
        
        // 如果有存储路径，保存图片到本地文件系统
          if (storagePath) {
            try {
              // 使用GalleryStorage保存图片文件
              const metadata = await GalleryStorage.saveImageFile(storagePath, file);
              if (metadata) {
                // 更新图片项的ID和本地文件路径，确保ID与IndexedDB中存储的一致
                imageItem.id = metadata.id;
                imageItem.path = metadata.filePath || '';
              }
            } catch (error) {
              console.error('保存图片文件失败:', error);
              // 即使保存失败，也继续添加图片项，只是使用Data URL
            }
          }
        
        newImages.push(imageItem);
        setImportProgress(Math.round((i + 1) / files.length * 100));
      }

      // 更新文件夹数据
      setFolders(prevFolders => {
        // 检查是否存在默认相册
        let hasDefaultAlbum = false;
        const updatedFolders = prevFolders.map(folder => {
          if (folder.id === 'all') {
            return { ...folder, images: [...folder.images, ...newImages] };
          }
          // 检查是否存在默认相册
          if (folder.id === 'default') {
            hasDefaultAlbum = true;
            return { ...folder, images: [...folder.images, ...newImages] };
          }
          return folder;
        });
        
        // 如果不存在默认相册，创建一个
        if (!hasDefaultAlbum) {
          const defaultAlbum: ImageFolder = {
            id: 'default',
            name: '默认相册',
            images: [...newImages]
          };
          return [...updatedFolders, defaultAlbum];
        }
        
        return updatedFolders;
      });

      setImporting(false);
      toast.success(`成功导入 ${newImages.length} 张图片。`);
    } catch (error) {
      console.error('导入图片失败:', error);
      setImporting(false);
      toast.error('导入图片失败，请重试。');
    }
  };

  // 处理导入文件夹
  const handleImportFolder = async () => {
    try {
      setImporting(true);
      setImportProgress(0);

      // 打开文件夹选择对话框
      const { canceled, files } = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });

      if (canceled || files.length === 0) {
        setImporting(false);
        return;
      }

      // 过滤出图片文件
      const imageFiles = files.filter((file: File) => {
        const ext = path.extname(file.name).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
      });

      if (imageFiles.length === 0) {
        setImporting(false);
        toast.info('所选文件夹中没有找到图片文件。');
        return;
      }

      // 导入图片
      const newImages: ImageItem[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        
        // 首先创建图片项
        const imageItem = await createImageItem(file);
        
        // 如果有存储路径，保存图片到本地文件系统
        if (storagePath) {
          try {
            // 使用GalleryStorage保存图片文件
            const metadata = await GalleryStorage.saveImageFile(storagePath, file);
            if (metadata) {
              // 更新图片项的ID和本地文件路径，确保ID与IndexedDB中存储的一致
              imageItem.id = metadata.id;
              imageItem.path = metadata.filePath || '';
            }
          } catch (error) {
            console.error('保存图片文件失败:', error);
            // 即使保存失败，也继续添加图片项，只是使用Data URL
          }
        }
        
        newImages.push(imageItem);
        setImportProgress(Math.round((i + 1) / imageFiles.length * 100));
      }

      // 更新文件夹数据
      setFolders(prevFolders => {
        // 检查是否存在默认相册
        let hasDefaultAlbum = false;
        const updatedFolders = prevFolders.map(folder => {
          if (folder.id === 'all') {
            return { ...folder, images: [...folder.images, ...newImages] };
          }
          // 检查是否存在默认相册
          if (folder.id === 'default') {
            hasDefaultAlbum = true;
            return { ...folder, images: [...folder.images, ...newImages] };
          }
          return folder;
        });
        
        // 如果不存在默认相册，创建一个
        if (!hasDefaultAlbum) {
          const defaultAlbum: ImageFolder = {
            id: 'default',
            name: '默认相册',
            images: [...newImages]
          };
          return [...updatedFolders, defaultAlbum];
        }
        
        return updatedFolders;
      });

      setImporting(false);
      toast.success(`成功导入 ${newImages.length} 张图片。`);
    } catch (error) {
      console.error('导入文件夹失败:', error);
      setImporting(false);
      toast.error('导入文件夹失败，请重试。');
    }
  };

  return (
    <div className="relative flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* 工具栏 */}
      <GalleryToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCount={selectedIds.size}
        totalCount={filteredImages.length}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onDeleteSelected={handleDeleteSelected}
        onImport={handleImport}
        onImportFolder={handleImportFolder}
        folderName={activeFolder.name}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        showSidebar={showSidebar}
      />

      {/* 加载状态 */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>正在载入图片数据...</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>请稍候，正在处理图片信息</p>
          </div>
        </div>
      ) : (
        /* 主要内容区 */
        <div className="flex-1 overflow-hidden relative">
          {/* 图片网格 */}
          <div className="h-full overflow-auto">
            <ImageGrid
              images={lazyImages}
              viewMode={viewMode}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onView={handleView}
              onEdit={handleEdit}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
            />
          </div>

          {/* 侧边栏 */}
          <div className={`fixed right-0 top-1/4 bottom-1/4 w-60 transition-all duration-300 ease-in-out transform ${showSidebar ? 'translate-x-0' : 'translate-x-full'} z-40 rounded-l-lg shadow-xl`}>
            <GallerySidebar
              folders={folders}
              activeFolderId={activeFolderId}
              onSelectFolder={setActiveFolderId}
            />
          </div>
        </div>
      )}

      {/* 图片查看器 */}
      {showViewer && (
        <ImageViewer
          images={filteredImages}
          currentIndex={viewerIndex}
          onClose={() => setShowViewer(false)}
          onEdit={handleEdit}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* 图片编辑器 */}
      {showEditor && editingImage && (
        <ImageEditor
          image={editingImage}
          onClose={() => setShowEditor(false)}
        />
      )}

      {/* 导入进度指示器 */}
      {importing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-lg font-medium mb-4">导入中...</h3>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div 
                className="bg-violet-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center">{importProgress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
