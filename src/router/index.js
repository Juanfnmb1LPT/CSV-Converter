import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import PreConView from '../views/PreConView.vue';
import PostConView from '../views/PostConView.vue';
import ShopifyToSquareView from '../views/ShopifyToSquareView.vue';
import UpdateQuantityView from '../views/UpdateQuantityView.vue';

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', name: 'home', component: HomeView },
        { path: '/pre-con', name: 'pre-con', component: PreConView },
        { path: '/post-con', name: 'post-con', component: PostConView },
        { path: '/shopify-to-square', name: 'shopify-to-square', component: ShopifyToSquareView },
        { path: '/update-quantity', name: 'update-quantity', component: UpdateQuantityView },
    ],
});

export default router;
