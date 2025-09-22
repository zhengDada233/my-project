// src/App.ts
import { defineComponent, onMounted } from 'vue';
import { useAuthStore } from './store/auth';
import AutoUpdater from './components/AutoUpdater/AutoUpdater.vue';

export default defineComponent({
  name: 'App',
  components: {
    AutoUpdater
  },
  setup() {
    const authStore = useAuthStore();
    
    onMounted(() => {
      // 初始化认证状态
      authStore.initializeAuth();
    });
  }
});