# 🎨 Tailwind CSS + 动画库使用指南

## 📦 已集成的库

### 1. **Tailwind CSS** (v3.4.19)
- 原子化CSS框架
- 提供丰富的预设样式和动画
- 支持暗色模式

### 2. **@formkit/auto-animate** (v0.9.0)
- 超轻量级动画库（~2KB）
- 自动为列表和元素添加动画
- 零配置即可使用

### 3. **@vueuse/motion** (v3.0.3)
- Vue版Framer Motion
- 提供流畅的进入/离开动画
- 支持弹簧动画和手势

---

## 🚀 快速开始

### Tailwind CSS 使用

#### 基础类名
```vue
<template>
  <!-- 使用 Tailwind 类名 -->
  <div class="flex items-center justify-center p-4 bg-white rounded-lg shadow-soft">
    <button class="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-all">
      按钮
    </button>
  </div>
</template>
```

#### 自定义动画类
```vue
<template>
  <!-- 淡入动画 -->
  <div class="animate-fade-in">淡入内容</div>
  
  <!-- 滑入动画 -->
  <div class="animate-slide-in">滑入内容</div>
  
  <!-- 缩放动画 -->
  <div class="animate-scale-in">缩放内容</div>
  
  <!-- 弹跳动画 -->
  <div class="animate-bounce-in">弹跳内容</div>
</template>
```

---

### Auto-animate 使用

#### 列表动画
```vue
<script setup lang="ts">
import { useAutoAnimate } from '@formkit/auto-animate/vue';

const [animate] = useAutoAnimate();

const items = ref([1, 2, 3]);
</script>

<template>
  <!-- 列表自动添加动画 -->
  <div ref="animate">
    <div v-for="item in items" :key="item">
      {{ item }}
    </div>
  </div>
</template>
```

#### 全局启用
已在 `main.ts` 中全局注册，所有组件自动支持：
```vue
<template>
  <!-- 添加 v-auto-animate 指令 -->
  <ul v-auto-animate>
    <li v-for="item in items" :key="item.id">{{ item.name }}</li>
  </ul>
</template>
```

---

### @vueuse/motion 使用

#### 基础动画
```vue
<template>
  <!-- 使用预设动画 -->
  <div v-motion-slide-in>滑入动画</div>
  <div v-motion-fade-in>淡入动画</div>
  <div v-motion-scale-in>缩放动画</div>
  <div v-motion-pop>弹出动画</div>
</template>
```

#### 自定义动画
```vue
<script setup lang="ts">
import { motionPresets } from '@/config/animation';
</script>

<template>
  <div
    v-motion
    :initial="motionPresets.bounceIn.initial"
    :enter="motionPresets.bounceIn.enter"
  >
    自定义动画内容
  </div>
</template>
```

#### 弹簧动画
```vue
<template>
  <div
    v-motion
    :initial="{ opacity: 0, y: 100 }"
    :enter="{
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
    }"
  >
    弹簧动画效果
  </div>
</template>
```

---

## 🎯 实际应用示例

### 1. 卡片悬停效果
```vue
<template>
  <div class="group p-6 bg-white rounded-xl shadow-soft hover:shadow-glow transition-all duration-300 cursor-pointer">
    <h3 class="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
      标题
    </h3>
    <p class="text-text-secondary">描述文字</p>
  </div>
</template>
```

### 2. 按钮动画
```vue
<template>
  <button 
    v-motion-pop
    class="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:scale-105 active:scale-95 transition-transform"
  >
    点击我
  </button>
</template>
```

### 3. 列表项动画
```vue
<script setup lang="ts">
import { useAutoAnimate } from '@formkit/auto-animate/vue';

const [animate] = useAutoAnimate();
const items = ref(['Item 1', 'Item 2', 'Item 3']);

const addItem = () => {
  items.value.push(`Item ${items.value.length + 1}`);
};

const removeItem = (index: number) => {
  items.value.splice(index, 1);
};
</script>

<template>
  <div>
    <button @click="addItem" class="mb-4 px-4 py-2 bg-primary text-white rounded-lg">
      添加项目
    </button>
    
    <ul ref="animate" class="space-y-2">
      <li 
        v-for="(item, index) in items" 
        :key="item"
        class="p-4 bg-background-secondary rounded-lg flex justify-between items-center animate-slide-in"
      >
        {{ item }}
        <button @click="removeItem(index)" class="text-red-500 hover:text-red-600">
          删除
        </button>
      </li>
    </ul>
  </div>
</template>
```

### 4. 模态框动画
```vue
<script setup lang="ts">
import { motionPresets } from '@/config/animation';

const showModal = ref(false);
</script>

<template>
  <button @click="showModal = true" class="px-4 py-2 bg-primary text-white rounded-lg">
    打开模态框
  </button>
  
  <Teleport to="body">
    <Transition
      enter-active-class="animate-fade-in"
      leave-active-class="animate-fade-out"
    >
      <div 
        v-if="showModal" 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        @click="showModal = false"
      >
        <div
          v-motion-scale-in
          class="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-soft"
          @click.stop
        >
          <h2 class="text-xl font-semibold mb-4">模态框标题</h2>
          <p class="text-text-secondary mb-4">模态框内容</p>
          <button 
            @click="showModal = false" 
            class="px-4 py-2 bg-primary text-white rounded-lg"
          >
            关闭
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

---

## 🎨 自定义主题色

在 `src/styles/main.css` 中定义：
```css
:root {
  --primary-color: #3b82f6;
  --primary-light: rgba(59, 130, 246, 0.1);
  --primary-hover: #2563eb;
}

.dark {
  --primary-color: #60a5fa;
  --primary-light: rgba(96, 165, 250, 0.1);
  --primary-hover: #3b82f6;
}
```

使用：
```vue
<template>
  <div class="bg-primary text-white">主题色背景</div>
  <div class="text-primary">主题色文字</div>
  <div class="border-primary">主题色边框</div>
</template>
```

---

## 📚 最佳实践

### 1. 性能优化
- 优先使用 CSS 动画（Tailwind）
- 列表使用 Auto-animate
- 复杂动画使用 @vueuse/motion
- 避免同时使用多个动画库

### 2. 可访问性
- 尊重用户动画偏好设置
- 提供动画开关选项
- 避免过度使用动画

### 3. 代码组织
```vue
<script setup lang="ts">
// 1. 导入动画配置
import { motionPresets } from '@/config/animation';
import { useAutoAnimate } from '@formkit/auto-animate/vue';

// 2. 设置动画
const [animate] = useAutoAnimate();

// 3. 组件逻辑
const items = ref([]);
</script>

<template>
  <!-- 4. 使用动画 -->
  <div ref="animate" class="space-y-2">
    <div 
      v-for="item in items" 
      :key="item.id"
      v-motion-slide-in
      class="p-4 bg-white rounded-lg"
    >
      {{ item.name }}
    </div>
  </div>
</template>
```

---

## 🔧 故障排除

### 动画不生效？
1. 检查是否正确导入插件
2. 确认元素是否有正确的 key
3. 检查 CSS 变量是否定义

### 性能问题？
1. 减少同时播放的动画数量
2. 使用 `will-change` 优化
3. 避免动画大型元素

### 样式冲突？
1. 使用 Tailwind 的 `@apply` 指令
2. 检查 CSS 优先级
3. 使用 scoped 样式

---

## 📖 参考资源

- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Auto-animate 文档](https://auto-animate.formkit.com/)
- [@vueuse/motion 文档](https://motion.vueuse.org/)
- [项目动画配置](./src/config/animation.ts)
