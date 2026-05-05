import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/chat',
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { title: 'AI 聊天' },
  },
  {
    path: '/models',
    name: 'Models',
    component: () => import('@/views/ModelsView.vue'),
    meta: { title: '模型管理' },
  },
  {
    path: '/media-tools',
    name: 'MediaTools',
    component: () => import('@/views/MediaToolsView.vue'),
    meta: { title: '媒体工具' },
  },
  {
    path: '/gallery',
    name: 'Gallery',
    component: () => import('@/views/GalleryView.vue'),
    meta: { title: '图库' },
  },
  {
    path: '/video-player',
    name: 'VideoPlayer',
    component: () => import('@/views/VideoPlayerView.vue'),
    meta: { title: '视频播放' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: '设置' },
  },
  {
    path: '/ini-config',
    name: 'IniConfig',
    component: () => import('@/views/IniConfigView.vue'),
    meta: { title: 'INI配置' },
  },
  {
    path: '/prompt-templates',
    name: 'PromptTemplates',
    component: () => import('@/views/PromptTemplatesView.vue'),
    meta: { title: '提示词模板' },
  },
  {
    path: '/compare',
    name: 'Compare',
    component: () => import('@/views/CompareView.vue'),
    meta: { title: '文本对比' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '星约'} - Starpact`;
  next();
});

export default router;
