import { createRouter, createWebHashHistory } from 'vue-router';
import ShopifyToSquareView from '../views/ShopifyToSquareView.vue';
import UpdateQuantityView from '../views/UpdateQuantityView.vue';

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', redirect: '/shopify-to-square' },
        { path: '/shopify-to-square', name: 'shopify-to-square', component: ShopifyToSquareView },
        { path: '/update-quantity', name: 'update-quantity', component: UpdateQuantityView },
    ],
});

export default router;
