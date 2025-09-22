import { RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import { useAuthStore } from '../store/auth';

// 路由守卫
export function authGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): void {
  const authStore = useAuthStore();
  
  // 检查路由是否需要认证
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // 检查用户是否已认证
    if (!authStore.isAuthenticated) {
      // 未认证，重定向到登录页面
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      });
    } else {
      // 已认证，允许访问
      next();
    }
  } else {
    // 不需要认证的路由，直接允许访问
    next();
  }
}