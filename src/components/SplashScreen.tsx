import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  enabled: boolean;
  progress: number;
  currentStep: string;
  minDisplayTime?: number;
}

const quotes = [
  '每一次对话，都是思想的碰撞',
  '让 AI 成为你的智慧伙伴',
  '探索无限可能，从这里开始',
  '智能对话，启迪思维'
];

export const SplashScreen = memo(function SplashScreen({ 
  onComplete, 
  enabled, 
  progress, 
  currentStep,
  minDisplayTime = 800 
}: SplashScreenProps) {
  const [currentQuote, setCurrentQuote] = useState(0);
  const [canClose, setCanClose] = useState(false);
  const startTimeRef = useRef(Date.now());
  const displayProgress = useMemo(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const progressRatio = Math.min(elapsed / minDisplayTime, 1);
    return Math.max(progress, Math.round(progressRatio * 100));
  }, [progress, minDisplayTime]);

  useEffect(() => {
    if (!enabled) {
      onComplete();
      return;
    }
    
    const timer = setTimeout(() => {
      setCanClose(true);
    }, minDisplayTime);
    
    return () => clearTimeout(timer);
  }, [onComplete, enabled, minDisplayTime]);

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % quotes.length);
    }, 3000);

    return () => clearInterval(quoteInterval);
  }, []);

  useEffect(() => {
    if (progress >= 100 && canClose) {
      setTimeout(onComplete, 200);
    }
  }, [progress, canClose, onComplete]);

  if (!enabled) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-primary) 100%)'
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 30% 40%, var(--primary-light) 0%, transparent 50%)'
            }}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 70% 60%, var(--primary-light) 0%, transparent 40%)'
            }}
          />
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: 'spring',
            stiffness: 200,
            damping: 20,
            duration: 0.6 
          }}
          className="relative z-10 flex flex-col items-center"
        >
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="relative"
          >
            <div 
              className="flex h-24 w-24 items-center justify-center rounded-3xl shadow-2xl"
              style={{ 
                backgroundColor: 'var(--primary-color)',
                boxShadow: '0 20px 60px -15px var(--primary-color)'
              }}
            >
              <Bot size={48} color="white" />
            </div>
            
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles size={20} style={{ color: 'var(--warning-color)' }} />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            <h1 
              className="text-3xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Starpact
            </h1>
            <p 
              className="mt-2 text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              智能对话助手
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 w-64"
          >
            <div 
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(displayProgress, 100)}%` }}
                transition={{ duration: 0.3 }}
                className="h-full rounded-full"
                style={{ 
                  backgroundColor: 'var(--primary-color)',
                  boxShadow: '0 0 10px var(--primary-color)'
                }}
              />
            </div>
            
            <motion.p
              key={currentStep}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-3 text-xs text-center"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {currentStep}
            </motion.p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-12 text-center"
        >
          <motion.p
            key={currentQuote}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-sm italic"
            style={{ color: 'var(--text-tertiary)' }}
          >
            "{quotes[currentQuote]}"
          </motion.p>
          <p 
            className="mt-4 text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            © 2024 Starpact. All rights reserved.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ delay: 1 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at center, var(--primary-color) 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
});

export const SplashScreenMinimal = memo(function SplashScreenMinimal({ 
  onComplete, 
  enabled, 
  progress,
  minDisplayTime = 500 
}: Omit<SplashScreenProps, 'currentStep'>) {
  const [canClose, setCanClose] = useState(false);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) {
      onComplete();
      return;
    }
    
    const timer = setTimeout(() => {
      setCanClose(true);
    }, minDisplayTime);
    
    return () => clearTimeout(timer);
  }, [onComplete, enabled, minDisplayTime]);

  useEffect(() => {
    if (progress >= 100 && canClose) {
      setTimeout(onComplete, 150);
    }
  }, [progress, canClose, onComplete]);

  if (!enabled) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-3 border-t-transparent rounded-full"
            style={{ 
              borderColor: 'var(--primary-color)',
              borderTopColor: 'transparent'
            }}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {progress < 100 ? '加载中...' : '准备就绪'}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export const SplashScreenFade = memo(function SplashScreenFade({ 
  onComplete, 
  enabled,
  minDisplayTime = 300 
}: Omit<SplashScreenProps, 'progress' | 'currentStep'>) {
  const [canClose, setCanClose] = useState(false);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) {
      onComplete();
      return;
    }
    
    const timer = setTimeout(() => {
      setCanClose(true);
    }, minDisplayTime);
    
    return () => clearTimeout(timer);
  }, [onComplete, enabled, minDisplayTime]);

  useEffect(() => {
    if (canClose) {
      setTimeout(onComplete, 200);
    }
  }, [canClose, onComplete]);

  if (!enabled) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.1, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center"
        >
          <div 
            className="flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            <Bot size={40} color="white" />
          </div>
          <h1 
            className="mt-4 text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Starpact
          </h1>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export type SplashScreenType = 'full' | 'minimal' | 'fade' | 'none';
