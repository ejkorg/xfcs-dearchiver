<template>
  <div class="container">
    <h2>Lot Search</h2>
    <form @submit.prevent="search">
      <input v-model="q" placeholder="Enter lot id" />
      <button :disabled="loading">Search</button>
    </form>
    <ul v-if="results.length">
      <li v-for="r in results" :key="r.id">{{ r.name }}</li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const q = ref('')
const results = ref([])
const loading = ref(false)

async function search() {
  if (!q.value) return
  loading.value = true
  try {
    const res = await fetch(`/api/lotid?q=${encodeURIComponent(q.value)}`)
    const json = await res.json()
    results.value = json.results ?? []
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.container { max-width: 640px; margin: 2rem auto; }
input { padding: 0.5rem; margin-right: 0.5rem; }
button { padding: 0.5rem 1rem; }
</style>
