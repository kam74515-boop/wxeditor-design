import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import NProgress from 'nprogress';

const routes: RouteRecordRaw[] = [
  // ========== 官网首页 ==========
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '首页', requiresAuth: false },
  },

  // ========== 认证页面（仅未登录用户可见）==========
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { title: '登录', requiresAuth: false, guestOnly: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { title: '注册', requiresAuth: false, guestOnly: true },
  },
  {
    path: '/auth/wechat/callback',
    name: 'WechatCallback',
    component: () => import('@/views/auth/WechatCallbackView.vue'),
    meta: { title: '微信登录', requiresAuth: false, guestOnly: true },
  },

  // ========== 仪表盘布局包裹的路由 ==========
  {
    path: '/dashboard',
    component: () => import('@/layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/DashboardHomeView.vue'),
        meta: { title: '仪表盘', isDashboardHome: true },
      },
    ],
  },

  // ========== 编辑器（不动） ==========
  {
    path: '/editor',
    name: 'Editor',
    component: () => import('@/views/EditorView.vue'),
    meta: { title: '编辑器', requiresAuth: true },
  },
  {
    path: '/editor/:documentId',
    name: 'EditorDoc',
    component: () => import('@/views/EditorView.vue'),
    meta: { title: '编辑器', requiresAuth: true },
  },

  // ========== 项目管理 ==========
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('@/views/ProjectsView.vue'),
    meta: { title: '我的项目', requiresAuth: true },
  },

  // ========== 模板库 ==========
  {
    path: '/templates',
    name: 'Templates',
    component: () => import('@/views/TemplatesView.vue'),
    meta: { title: '模板库', requiresAuth: true },
  },

  // ========== 素材库 ==========
  {
    path: '/materials',
    name: 'Materials',
    component: () => import('@/views/MaterialsView.vue'),
    meta: { title: '素材库', requiresAuth: true },
  },

  // ========== AI 写作 ==========
  {
    path: '/ai-writing',
    name: 'AIWriting',
    component: () => import('@/views/EditorView.vue'),
    meta: { title: 'AI 写作', requiresAuth: true },
  },

  // ========== 个人中心 ==========
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: '个人中心', requiresAuth: true },
  },

  // ========== 设置 ==========
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: '设置', requiresAuth: true },
  },

  // ========== 微信公众号管理 ==========
  {
    path: '/wechat-accounts',
    name: 'WechatAccounts',
    component: () => import('@/views/wechat/WechatAccountsView.vue'),
    meta: { title: '我的公众号', requiresAuth: true },
  },

  // ========== 团队 ==========
  {
    path: '/teams',
    name: 'Teams',
    component: () => import('@/views/teams/TeamsView.vue'),
    meta: { title: '我的团队', requiresAuth: true },
  },
  {
    path: '/teams/:id',
    name: 'TeamDetail',
    component: () => import('@/views/teams/TeamDetailView.vue'),
    meta: { title: '团队详情', requiresAuth: true },
  },
  {
    path: '/invitations',
    name: 'Invitations',
    component: () => import('@/views/teams/InvitationsView.vue'),
    meta: { title: '邀请管理', requiresAuth: true },
  },

  // ========== 会员与定价 ==========
  {
    path: '/pricing',
    name: 'Pricing',
    component: () => import('@/views/membership/PricingView.vue'),
    meta: { title: '定价', requiresAuth: false },
  },
  {
    path: '/membership',
    name: 'Membership',
    component: () => import('@/views/membership/MembershipView.vue'),
    meta: { title: '会员', requiresAuth: true },
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: () => import('@/views/membership/CheckoutView.vue'),
    meta: { title: '结算', requiresAuth: true },
  },

  // ========== 图文合集（仪表盘子路由） ==========
  {
    path: '/dashboard',
    component: () => import('@/layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'article-batches',
        name: 'ArticleBatches',
        component: () => import('@/views/articles/BatchListView.vue'),
        meta: { title: '图文合集', requiresAuth: true },
      },
      {
        path: 'article-batches/:id',
        name: 'BatchEditor',
        component: () => import('@/views/articles/BatchEditorView.vue'),
        meta: { title: '编辑图文合集', requiresAuth: true },
      },
      {
        path: 'scheduled-posts',
        name: 'ScheduledPosts',
        component: () => import('@/views/scheduled/ScheduledPostsView.vue'),
        meta: { title: '定时发布' },
      },
    ],
  },

  // ========== 定时发布 ==========
  {
    path: '/scheduled-posts',
    name: 'ScheduledPostsFull',
    component: () => import('@/views/scheduled/ScheduledPostsView.vue'),
    meta: { title: '定时发布', requiresAuth: true },
  },
  {
    path: '/scheduled-posts/create',
    name: 'ScheduledPostCreate',
    component: () => import('@/views/scheduled/ScheduledPostCreateView.vue'),
    meta: { title: '创建定时任务', requiresAuth: true },
  },
  {
    path: '/scheduled-posts/:id/edit',
    name: 'ScheduledPostEdit',
    component: () => import('@/views/scheduled/ScheduledPostCreateView.vue'),
    meta: { title: '编辑定时任务', requiresAuth: true },
  },

  // ========== 管理后台（嵌套路由） ==========
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { title: '管理后台', requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/DashboardView.vue'),
        meta: { title: '系统概览' },
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/UsersView.vue'),
        meta: { title: '用户管理' },
      },
      {
        path: 'membership',
        name: 'AdminMembership',
        component: () => import('@/views/admin/MembershipView.vue'),
        meta: { title: '会员管理' },
      },
      {
        path: 'products',
        name: 'AdminProducts',
        component: () => import('@/views/admin/ProductsView.vue'),
        meta: { title: '商品管理' },
      },
      {
        path: 'content',
        name: 'AdminContent',
        component: () => import('@/views/admin/ContentReviewView.vue'),
        meta: { title: '内容审核' },
      },
      {
        path: 'comments',
        name: 'AdminComments',
        component: () => import('@/views/admin/CommentsView.vue'),
        meta: { title: '评论管理' },
      },
      {
        path: 'wechat-accounts',
        name: 'AdminWechatAccounts',
        component: () => import('@/views/admin/WechatAccountsView.vue'),
        meta: { title: '公众号管理' },
      },
      {
        path: 'ai-config',
        name: 'AdminAIConfig',
        component: () => import('@/views/admin/AIConfigView.vue'),
        meta: { title: 'AI 配置' },
      },
      {
        path: 'analytics',
        name: 'AdminAnalytics',
        component: () => import('@/views/admin/AnalyticsView.vue'),
        meta: { title: '数据统计' },
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('@/views/admin/SettingsView.vue'),
        meta: { title: '系统设置' },
      },
    ],
  },

  // ========== 404 ==========
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面不存在' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

NProgress.configure({ showSpinner: false });

router.beforeEach(async (to, _from, next) => {
  NProgress.start();
  document.title = `${to.meta.title || 'WxEditor'} - 微信文章编辑器`;

  const requiresAuth = to.matched.some((record) => record.meta?.requiresAuth);
  const requiresAdmin = to.matched.some((record) => record.meta?.requiresAdmin);
  const guestOnly = to.matched.some((record) => record.meta?.guestOnly);
  const token = localStorage.getItem('token');

  // 已登录用户访问登录/注册页 → 自动跳转到项目管理
  if (guestOnly && token) {
    next({ name: 'Projects' });
    return;
  }

  // 未登录拦截 → 跳转登录页，并携带原始目标地址
  if (requiresAuth && !token) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
    return;
  }

  // 需要认证的路由：如果缓存的用户信息为空，先向后端验证
  if (requiresAuth && token) {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      try {
        // 动态导入，避免循环依赖
        const { useUserStore } = await import('@/stores/user');
        const userStore = useUserStore();
        const valid = await userStore.validateSession();
        if (!valid) {
          next({ name: 'Login', query: { redirect: to.fullPath } });
          return;
        }
      } catch {
        next({ name: 'Login', query: { redirect: to.fullPath } });
        return;
      }
    }
  }

  // 管理员权限拦截
  if (requiresAdmin) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (!['admin', 'superadmin'].includes(user.role)) {
          next({ name: 'Projects' });
          return;
        }
      } catch {
        next({ name: 'Login' });
        return;
      }
    } else {
      next({ name: 'Login' });
      return;
    }
  }

  next();
});

router.afterEach(() => {
  NProgress.done();
});

export default router;
