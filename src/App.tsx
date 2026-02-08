import { useStore } from '@/store';
import { Sidebar } from '@/components/Sidebar';
import { ChatPage } from '@/components/ChatPage';
import { ModelsPage } from '@/components/ModelsPage';
import { SettingsPage } from '@/components/SettingsPage';
import { LogsPage } from '@/components/LogsPage';
import { ComparePage } from '@/components/ComparePage';
import { LogsPanel } from '@/components/LogsPanel';
import { motion, AnimatePresence } from 'framer-motion';

function PageContent() {
  const { activePage } = useStore();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activePage}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="h-full"
      >
        {activePage === 'chat' && <ChatPage />}
        {activePage === 'models' && <ModelsPage />}
        {activePage === 'settings' && <SettingsPage />}
        {activePage === 'logs' && <LogsPage />}
        {activePage === 'compare' && <ComparePage />}
      </motion.div>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar />
      <main className="min-w-0 flex-1">
        <PageContent />
      </main>
      <LogsPanel />
    </div>
  );
}
