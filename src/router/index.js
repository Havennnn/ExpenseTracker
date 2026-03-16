import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('../views/AuthView.vue')
    }
  ]
})

// Navigation guard to check authentication
router.beforeEach((to, from, next) => {
  const userId = localStorage.getItem('userId')
  
  if (to.meta.requiresAuth && !userId) {
    // Redirect to auth page if not authenticated
    next({ name: 'auth' })
  } else if (to.name === 'auth' && userId) {
    // Redirect to home if already authenticated
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router
