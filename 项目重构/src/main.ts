import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { MotionPlugin } from '@vueuse/motion';
import { autoAnimatePlugin } from '@formkit/auto-animate/vue';
import App from './App.vue';
import router from './router';
import './styles/main.css';
import { autoAnimateOptions } from './config/animation';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(MotionPlugin);
app.use(autoAnimatePlugin, autoAnimateOptions);

app.mount('#app');
