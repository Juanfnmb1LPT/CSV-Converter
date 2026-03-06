<template>
  <div class="card spacious tool-card home-card">
    <div class="hero">
      <div class="hero-title">CSV Converter Dashboard</div>
      <p class="home-sub-large">Choose a guided flow for the standard process, or jump straight to the individual tools if you already know what you need.</p>
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
          <router-link class="btn secondary" to="/update-quantity">Update Quantity</router-link>
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
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: stretch;
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
  margin-top: 0;
}

@media (max-width: 900px) {
  .home-grid {
    grid-template-columns: 1fr;
  }
}
</style>

