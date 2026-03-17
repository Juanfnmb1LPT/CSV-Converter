<template>
  <div class="card spacious tool-card home-card">
    <div class="hero">
      <div class="hero-title">Inventory Management Dashboard</div>
      <p class="home-sub-large">Choose a guided flow for the standard process, or jump straight to the individual tools if you already know what you need.</p>
    </div>

    <div class="home-primary-action">
      <router-link class="btn" to="/search-inventory">Search Inventory</router-link>
    </div>

    <div class="home-grid">
      <section class="home-section">
        <div class="home-section-title">Step By Step Flow:</div>
        <p class="home-section-copy">
          A step-by-step breakdown for exporting from Shopify, converting the file for Square, then updating Shopify again after you have the latest quantity data from Square.
        </p>
        <div class="home-options">
          <router-link class="btn" to="/pre-con">Pre-Con Steps</router-link>
          <router-link class="btn secondary" to="/post-con">Post-Con Steps</router-link>
        </div>
      </section>

      <section class="home-section home-section-advanced">
        <div class="home-section-title">Advanced Users:</div>
        <p class="home-section-copy">
          For those who are comfortable using the tools directly, jump straight to the converters without the guided workflow.
        </p>
        <div class="home-options home-options-advanced">
          <router-link class="btn" to="/shopify-to-square">Shopify to Square</router-link>
          <router-link class="btn secondary" to="/update-quantity">Update Shopify Quantity</router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home-card {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 48px;
  text-align: center;
}

.home-sub-large {
  margin: 12px auto 0;
  font-size: 20px;
  line-height: 1.45;
  font-weight: 300;
  color: #0b2545;
  animation: home-fade-up 0.5s ease 0.08s both;
}

.home-primary-action {
  display: flex;
  justify-content: center;
  animation: home-fade-up 0.5s ease 0.12s both;
}

.home-options {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: auto;
  padding-top: 12px;
  flex-wrap: wrap;
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: stretch;
  animation: home-fade-up 0.55s ease 0.16s both;
}

.home-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
  justify-content: flex-start;
  padding: 24px 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(18, 58, 138, 0.08);
  transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  animation: home-fade-up 0.55s ease both;
}

.home-section:first-child {
  animation-delay: 0.22s;
}

.home-section:last-child {
  animation-delay: 0.32s;
}

.home-section:hover {
  background: rgba(232, 240, 255, 0.9);
  border-color: rgba(37, 99, 235, 0.18);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.08);
}

.home-section-advanced {
  border-top: 1px solid rgba(18, 58, 138, 0.08);
}

.home-section-title {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0b63d6;
}

.home-section-copy {
  margin: 0;
  max-width: 700px;
  text-align: center;
  color: #4b5563;
  font-size: 16px;
  line-height: 1.6;
}

.home-options-advanced {
  padding-top: 12px;
}

@keyframes home-fade-up {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-sub-large,
  .home-grid,
  .home-section {
    animation: none;
  }
}

@media (max-width: 900px) {
  .home-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .home-options {
    flex-direction: column;
    align-items: center;
  }

  .home-options .btn {
    width: 100%;
    max-width: 320px;
  }
}
</style>

