<script setup>
import logoUrl from '../assets/lpt_realty.png';
</script>

<template>
  <div class="app-layout">
    <aside class="dashboard">
      <div class="dashboard-brand">
        <img :src="logoUrl" alt="LPT Realty logo" />
        <div class="dashboard-title">CSV Converter</div>
      </div>

      <nav class="dashboard-nav">
        <router-link class="dash-link" to="/">Home</router-link>
        <router-link class="dash-link" to="/pre-con">Pre-Con Steps</router-link>
        <router-link class="dash-link" to="/post-con">Post-Con Steps</router-link>
        <router-link class="dash-link" to="/shopify-to-square">Shopify to Square</router-link>
        <router-link class="dash-link" to="/update-quantity">Update Quantity</router-link>
      </nav>
    </aside>

    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>
