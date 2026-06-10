import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Profile from '../views/Profile.vue'
import Redeem from '../views/Redeem.vue'
import AdminEvents from '../views/admin/Events.vue'
import AdminBadges from '../views/admin/Badges.vue'
import AdminDashboard from '../views/admin/Dashboard.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'login', component: Login, meta: { public: true } },
  { path: '/register', name: 'register', component: Register, meta: { public: true } },
  { path: '/profile', name: 'profile', component: Profile, meta: { requiresAuth: true } },
  {
    path: '/redeem/:eventId/:token',
    name: 'redeem',
    component: Redeem,
    meta: { requiresAuth: true },
  },
  {
    path: '/admin/events',
    name: 'admin-events',
    component: AdminEvents,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/events/:eventId/badges',
    name: 'admin-badges',
    component: AdminBadges,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/events/:eventId/dashboard',
    name: 'admin-dashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Guards por rol y sesión
router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    const next = to.fullPath
    return { name: 'login', query: { next } }
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'profile' }
  }

  // Si ya está autenticado y va a login/register, mandarlo a su home por rol
  if (to.meta.public && auth.isAuthenticated) {
    return auth.isAdmin ? { name: 'admin-events' } : { name: 'profile' }
  }

  return true
})

export default router
