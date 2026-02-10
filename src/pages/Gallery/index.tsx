import { useState, useEffect, useMemo } from 'react';
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

// 模拟图片数据
const mockImages: ImageItem[] = [
  {
    id: '1',
    name: '风景照片1.jpg',
    url: 'https://picsum.photos/id/10/800/600',
    width: 800,
    height: 600,
    size: 1024 * 1024 * 2, // 2MB
    type: 'jpg',
    tags: ['风景', '自然'],
    favorite: true,
    isLongImage: false,
    aspectRatio: 4/3,
    dateAdded: new Date('2024-01-01')
  },
  {
    id: '2',
    name: '城市建筑.jpg',
    url: 'https://picsum.photos/id/20/800/600',
    width: 800,
    height: 600,
    size: 1024 * 1024 * 1.5, // 1.5MB
    type: 'jpg',
    tags: ['城市', '建筑'],
    favorite: false,
    isLongImage: false,
    aspectRatio: 4/3,
    dateAdded: new Date('2024-01-02')
  },
  {
    id: '3',
    name: '长图测试.png',
    url: 'https://picsum.photos/id/30/600/1200',
    width: 600,
    height: 1200,
    size: 1024 * 1024 * 3, // 3MB
    type: 'png',
    tags: ['长图', '测试'],
    favorite: false,
    isLongImage: true,
    aspectRatio: 1/2,
    dateAdded: new Date('2024-01-03')
  },
  {
    id: '4',
    name: '海滩日落.jpg',
    url: 'https://picsum.photos/id/40/800/600',
    width: 800,
    height: 600,
    size: 1024 * 1024 * 2.5, // 2.5MB
    type: 'jpg',
    tags: ['海滩', '日落'],
    favorite: true,
    isLongImage: false,
    aspectRatio: 4/3,
    dateAdded: new Date('2024-01-04')
  },
  {
    id: '5',
    name: '山脉风景.jpg',
    url: 'https://picsum.photos/id/50/800/600',
    width: 800,
    height: 600,
    size: 1024 * 1024 * 2, // 2MB
    type: 'jpg',
    tags: ['山脉', '自然'],
    favorite: false,
    isLongImage: false,
    aspectRatio: 4/3,
    dateAdded: new Date('2024-01-05')
  },
  {
    id: '6',
    name: '城市夜景.jpg',
    url: 'https://picsum.photos/id/60/800/600',
    width: 800,
    height: 600,
    size: 1024 * 1024 * 3, // 3MB
    type: 'jpg',
    tags: ['城市', '夜景'],
    favorite: true,
    isLongImage: false,
    aspectRatio: 4/3,
    dateAdded: new Date('2024-01-06')
  }
];

// 模拟文件夹数据
const mockFolders: ImageFolder[] = [
  {
    id: 'all',
    name: '全部图片',
    images: mockImages
  },
  {
    id: 'nature',
    name: '自然风景',
    images: mockImages.filter(img => img.tags.includes('自然'))
  },
  {
    id: 'city',
    name: '城市建筑',
    images: mockImages.filter(img => img.tags.includes('城市'))
  },
  {
    id: 'travel',
    name: '旅行',
    images: mockImages.filter(img => img.tags.includes('海滩') || img.tags.includes('山脉'))
  },
  {
    id: 'long',
    name: '长图',
    images: mockImages.filter(img => img.isLongImage)
  },
  {
    id: 'favorites',
    name: '收藏',
    images: mockImages.filter(img => img.favorite)
  }
];

export function GalleryPage() {
  const { storagePath } = useStore();
  
  // 状态管理
  const [folders, setFolders] = useState<ImageFolder[]>(mockFolders);
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

  // 从存储加载图片数据
  useEffect(() => {
    if (storagePath) {
      const albums = GalleryStorage.getAllAlbums(storagePath);
      if (albums.length > 0) {
        // 将相册转换为文件夹格式
        const loadedFolders: ImageFolder[] = albums.map(album => ({
          id: album.id,
          name: album.name,
          images: album.images.map(img => ({
            id: img.id,
            name: img.name,
            url: img.url,
            width: img.width,
            height: img.height,
            size: img.size,
            type: img.type,
            tags: img.tags || [],
            favorite: false, // 可以根据需要从元数据中获取
            isLongImage: img.height > img.width * 1.5,
            aspectRatio: img.width / img.height,
            dateAdded: new Date(img.addedAt)
          }))
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
  }, [storagePath]);

  // 保存图片数据到存储
  useEffect(() => {
    if (storagePath) {
      // 将文件夹转换为相册格式
      const foldersToSave = folders.filter(folder => !['all', 'favorites'].includes(folder.id));
      
      foldersToSave.forEach(folder => {
        const album: ImageAlbum = {
          id: folder.id,
          name: folder.name,
          images: folder.images.map(img => ({
            id: img.id,
            name: img.name,
            size: img.size,
            type: img.type,
            url: img.url,
            width: img.width,
            height: img.height,
            addedAt: img.dateAdded.getTime(),
            filePath: img.url.replace('file://', ''),
            tags: img.tags
          })),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        GalleryStorage.saveAlbum(storagePath, album);
      });
    }
  }, [folders, storagePath]);

  // 当前文件夹
  const activeFolder = useMemo(() => {
    return folders.find(folder => folder.id === activeFolderId) || folders[0];
  }, [folders, activeFolderId]);

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
    // 这里应该实现实际的删除逻辑
    console.log('删除选中的图片:', idsToDelete);
    setSelectedIds(new Set());
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
    // 这里应该实现实际的收藏逻辑
    console.log('切换收藏状态:', id);
  };

  // 处理删除图片
  const handleDelete = (ids: string[]) => {
    // 这里应该实现实际的删除逻辑
    console.log('删除图片:', ids);
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
        const imageItem = await createImageItem(file);
        newImages.push(imageItem);
        setImportProgress(Math.round((i + 1) / files.length * 100));
      }

      // 更新文件夹数据
      setFolders(prevFolders => {
        const updatedFolders = prevFolders.map(folder => {
          if (folder.id === 'all') {
            return { ...folder, images: [...folder.images, ...newImages] };
          }
          return folder;
        });
        return updatedFolders;
      });

      setImporting(false);
    } catch (error) {
      console.error('导入图片失败:', error);
      setImporting(false);
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
        alert('所选文件夹中没有找到图片文件。');
        return;
      }

      // 导入图片
      const newImages: ImageItem[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const imageItem = await createImageItem(file);
        newImages.push(imageItem);
        setImportProgress(Math.round((i + 1) / imageFiles.length * 100));
      }

      // 更新文件夹数据
      setFolders(prevFolders => {
        const updatedFolders = prevFolders.map(folder => {
          if (folder.id === 'all') {
            return { ...folder, images: [...folder.images, ...newImages] };
          }
          return folder;
        });
        return updatedFolders;
      });

      setImporting(false);
      alert(`成功导入 ${newImages.length} 张图片。`);
    } catch (error) {
      console.error('导入文件夹失败:', error);
      setImporting(false);
      alert('导入文件夹失败，请重试。');
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

      {/* 主要内容区 */}
      <div className="flex-1 overflow-hidden relative">
        {/* 图片网格 */}
        <div className="h-full overflow-auto">
          <ImageGrid
            images={filteredImages}
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
