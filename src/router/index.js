import { createRouter, createWebHashHistory } from 'vue-router';
import { isAuthenticated } from '../lib/auth';

const HomeView = () => import('../views/HomeView.vue');
const LoginView = () => import('../views/LoginView.vue');
const PreConView = () => import('../views/PreConView.vue');
const PostConView = () => import('../views/PostConView.vue');
const ShopifyToSquareView = () => import('../views/ShopifyToSquareView.vue');
const UpdateQuantityView = () => import('../views/UpdateQuantityView.vue');
const UpdateInventoryView = () => import('../views/UpdateInventoryView.vue');
const SearchInventoryView = () => import('../views/SearchInventoryView.vue');
const BinDetailView = () => import('../views/BinDetailView.vue');

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/login', name: 'login', component: LoginView },
        { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
        { path: '/pre-con', name: 'pre-con', component: PreConView, meta: { requiresAuth: true } },
        { path: '/post-con', name: 'post-con', component: PostConView, meta: { requiresAuth: true } },
        { path: '/shopify-to-square', name: 'shopify-to-square', component: ShopifyToSquareView, meta: { requiresAuth: true } },
        { path: '/update-quantity', name: 'update-quantity', component: UpdateQuantityView, meta: { requiresAuth: true } },
        { path: '/update-inventory', name: 'update-inventory', component: UpdateInventoryView, meta: { requiresAuth: true } },
        { path: '/search-inventory', name: 'search-inventory', component: SearchInventoryView, meta: { requiresAuth: true } },
        { path: '/search-inventory/:id', name: 'bin-detail', component: BinDetailView, meta: { requiresAuth: true } },
        { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
});

router.beforeEach((to) => {
    const loggedIn = isAuthenticated();

    if (to.name === 'login') {
        return loggedIn ? { name: 'home' } : true;
    }

    if (to.meta.requiresAuth && !loggedIn) {
        return {
            name: 'login',
            query: { redirect: to.fullPath },
        };
    }

    return true;
});

export default router;
