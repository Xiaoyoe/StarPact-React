import { useStore } from '@/store';
import { Sidebar } from '@/layouts/Sidebar';
import { ChatPage } from '@/pages/Chat';
import { ModelsPage } from '@/pages/Models';
import { SettingsPage } from '@/pages/Settings';
import { LogsPage } from '@/pages/Logs';
import { ComparePage } from '@/pages/Compare';
import { IniConfigPage } from '@/pages/IniConfig';
import { LogsPanel } from '@/components/LogsPanel';
import { OllamaModal } from '@/components/OllamaModal';
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
        {activePage === 'ini-config' && <IniConfigPage />}
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
      <OllamaModal />
    </div>
  );
}
