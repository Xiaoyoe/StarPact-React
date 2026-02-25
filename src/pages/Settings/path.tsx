import { motion } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { IndexedDBStorageStatus } from '@/components/IndexedDBStorageStatus';
import { Shield } from 'lucide-react';

export function PathPage() {
  const toast = useToast();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <IndexedDBStorageStatus onRefresh={() => toast.success('存储状态已刷新')} />

      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
      >
        <h3 className="mb-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          <Shield size={14} className="mr-1 inline" /> 安全提示
        </h3>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          IndexedDB 数据仅存储在本地浏览器中，不会上传至任何远程服务器。
          清空浏览器数据可能会导致数据丢失，建议定期导出备份。
        </p>
      </div>
    </motion.div>
  );
}
