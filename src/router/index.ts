import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import { authGuard } from './guard';

// 路由组件懒加载
const Login = () => import('../components/Login/Login.vue');
const Trade = () => import('../components/OrderForm/OrderForm.vue');
const Websocket = () => import('../components/WebsocketConnector/WebsocketConnector.vue');
const TradingStrategy = () => import('../components/TradingStrategy/TradingStrategy.vue');

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/trade',
    name: 'Trade',
    component: Trade,
    meta: { requiresAuth: true }
  },
  {
    path: '/websocket',
    name: 'Websocket',
    component: Websocket,
    meta: { requiresAuth: true }
  },
  {
    path: '/strategy',
    name: 'Strategy',
    component: TradingStrategy,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// 添加路由守卫
router.beforeEach(authGuard);

export default router;