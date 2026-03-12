<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import logoUrl from '../assets/lpt_realty.png';
import { isAuthenticated, logout } from './lib/auth';

const isNavOpen = ref(false);
const route = useRoute();
const router = useRouter();
const shouldShowShell = computed(() => route.name !== 'login');

function toggleNav() {
  isNavOpen.value = !isNavOpen.value;
}

function closeNav() {
  isNavOpen.value = false;
}

function handleLogout() {
  if (!isAuthenticated()) {
    return;
  }

  logout();
  closeNav();
  router.replace('/login');
}
</script>

<template>
  <div class="app-layout">
    <header v-if="shouldShowShell" class="mobile-topbar">
      <div class="mobile-topbar-brand">
        <img :src="logoUrl" alt="LPT Realty logo" width="44" height="44" />
        <div class="mobile-topbar-title">CSV Converter</div>
      </div>

      <button
        type="button"
        class="mobile-nav-trigger"
        @click="toggleNav"
        aria-label="Open navigation menu"
        :aria-expanded="isNavOpen ? 'true' : 'false'"
      >
        <span class="nav-toggle-bar"></span>
        <span class="nav-toggle-bar"></span>
        <span class="nav-toggle-bar"></span>
      </button>
    </header>

    <aside v-if="shouldShowShell" class="dashboard" :class="{ 'is-mobile-open': isNavOpen }">
      <div class="dashboard-header">
        <div class="dashboard-brand">
          <img :src="logoUrl" alt="LPT Realty logo" width="88" height="88" />
          <div class="dashboard-title">CSV Converter</div>
        </div>

        <button
          type="button"
          class="nav-collapse-btn"
          aria-label="Close navigation menu"
          @click="closeNav"
        >
          Close
        </button>

      </div>

      <nav class="dashboard-nav" :class="{ 'is-open': isNavOpen }">
        <router-link class="dash-link" to="/" @click="closeNav">Home</router-link>
        <router-link class="dash-link" to="/pre-con" @click="closeNav">Pre-Con Steps</router-link>
        <router-link class="dash-link" to="/post-con" @click="closeNav">Post-Con Steps</router-link>
        <router-link class="dash-link" to="/shopify-to-square" @click="closeNav">Shopify to Square</router-link>
        <router-link class="dash-link" to="/update-quantity" @click="closeNav">Update Quantity</router-link>
        <router-link class="dash-link" to="/search-inventory" @click="closeNav">Search Inventory</router-link>
        <button class="dash-link" type="button" @click="handleLogout">Logout</button>
      </nav>
    </aside>

    <button
      v-if="shouldShowShell && isNavOpen"
      type="button"
      class="nav-overlay"
      aria-label="Close navigation menu"
      @click="closeNav"
    ></button>

    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>
