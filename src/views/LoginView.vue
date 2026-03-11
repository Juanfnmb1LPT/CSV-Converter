<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { loginWithCredentials } from '../lib/auth';

const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const errorMessage = ref('');

function onSubmit() {
  errorMessage.value = '';

  const isValid = loginWithCredentials(username.value, password.value);
  if (!isValid) {
    errorMessage.value = 'Invalid username or password.';
    return;
  }

  const redirectTarget = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
  router.replace(redirectTarget);
}
</script>

<template>
  <div class="card login-card">
    <div class="hero">
      <div class="hero-title">Login</div>
      <div class="hero-sub">Sign in to access CSV Converter tools.</div>
    </div>

    <form class="login-form" @submit.prevent="onSubmit">
      <label class="login-label" for="username">Username</label>
      <input id="username" v-model="username" class="login-input" type="text" autocomplete="username" required />

      <label class="login-label" for="password">Password</label>
      <input id="password" v-model="password" class="login-input" type="password" autocomplete="current-password" required />

      <p v-if="errorMessage" class="login-error" role="alert">{{ errorMessage }}</p>

      <button class="btn login-submit" type="submit">Sign In</button>
    </form>
  </div>
</template>

<style scoped>
.login-card {
  max-width: 520px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 360px;
  margin: 8px auto 0;
}

.login-label {
  color: #0f1f46;
  font-size: 14px;
  font-weight: 700;
}

.login-input {
  width: 100%;
  height: 42px;
  padding: 10px 12px;
  border: 1px solid rgba(18, 58, 138, 0.2);
  border-radius: 10px;
  font: inherit;
  color: #082145;
}

.login-input:focus {
  outline: 2px solid rgba(14, 165, 255, 0.35);
  outline-offset: 1px;
}

.login-error {
  margin: 4px 0 0;
  color: #b42318;
  font-size: 13px;
  font-weight: 600;
}

.login-submit {
  margin-top: 6px;
}
</style>
