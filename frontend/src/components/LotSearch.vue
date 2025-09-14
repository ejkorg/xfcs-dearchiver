<template>
  <div class="container">
    <h2>Exensio Dearchive</h2>
    <div class="steps">
      <button :class="{active: step===1}" @click="step=1">1) Search</button>
      <button :class="{active: step===2}" :disabled="!searchResults.length" @click="step=2">2) Review</button>
      <button :class="{active: step===3}" :disabled="!selectedFiles.length" @click="step=3">3) Reload/Monitor</button>
    </div>

    <section v-if="step===1">
      <form class="form" @submit.prevent="doSearch">
        <label>
          Lot IDs (comma or newline separated)
          <textarea v-model="lotInput" rows="3" placeholder="C123456, C123457"></textarea>
        </label>
        <label>
          Envs
          <select v-model="selectedEnv">
            <option value="All">All</option>
            <option v-for="e in envs" :key="e.name" :value="e.name">{{ e.name }} ({{ e.tester ?? 'tester' }})</option>
          </select>
        </label>
        <label>
          Year
          <select v-model="year">
            <option value="All">All</option>
            <option v-for="y in yearsForEnv" :key="y" :value="y">{{ y }}</option>
          </select>
        </label>
        <label>
          Month
          <select v-model="month">
            <option value="All">All</option>
            <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
          </select>
        </label>
        <div>
          <button type="submit" :disabled="loading">Search</button>
        </div>
      </form>

      <div v-if="loading">Searching…</div>
      <div v-if="!loading && searchResults.length">
        <h3>Results</h3>
        <div v-for="r in searchResults" :key="r.lot_id" class="lot-result">
          <strong>{{ r.lot_id }}</strong>
          <small> | raw: {{ r.raw_count }} | active: {{ r.active ? 'Y' : 'N' }}</small>
        </div>
        <button @click="step=2">Next: Review</button>
      </div>
    </section>

    <section v-else-if="step===2">
      <div class="panes">
        <div class="pane">
          <h3>Files to Exclude</h3>
          <select multiple size="12" v-model="excludedSelection">
            <option v-for="f in excludedFiles" :key="f.path" :value="f.path">{{ displayFile(f.path) }} — {{ f.size }}</option>
          </select>
          <button @click="moveRight"> &lt; </button>
        </div>
        <div class="pane">
          <h3>Files to Restore/Download</h3>
          <select multiple size="12" v-model="selectedSelection">
            <option v-for="f in selectedFiles" :key="f.path" :value="f.path">{{ displayFile(f.path) }} — {{ f.size }}</option>
          </select>
          <button @click="moveLeft"> &gt; </button>
        </div>
      </div>
      <div class="actions">
        <button @click="step=1">Back</button>
        <button :disabled="!selectedFiles.length" @click="triggerDownload">Download Files</button>
        <button :disabled="!selectedFiles.length" @click="startReload">Next: Reload</button>
      </div>
    </section>

    <section v-else>
      <h3>Monitoring</h3>
      <div v-if="monitoring.length===0">No updates yet.</div>
      <table v-else class="status">
        <thead><tr><th>File</th><th>Size</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="it in monitoring" :key="it.file_name">
            <td>{{ it.file_name }}</td>
            <td>{{ it.file_size }}</td>
            <td :style="{color: it.status_color}">{{ it.status }}</td>
          </tr>
        </tbody>
      </table>
      <div class="actions">
        <button @click="step=2">Back</button>
      </div>
    </section>
  </div>
  
</template>

<script setup>
import { onMounted, computed, ref } from 'vue'
import { fetchEnvs, searchArchive, downloadFiles, reloadFiles, monitor } from '../api'

const step = ref(1)
const envs = ref([])
const lotInput = ref('')
const selectedEnv = ref('All')
const year = ref('All')
const month = ref('All')
const months = [ 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec' ]
const loading = ref(false)
const searchResults = ref([])

const selectedFiles = ref([]) // [{path,size}]
const excludedFiles = ref([])
const selectedSelection = ref([])
const excludedSelection = ref([])

const reloadMeta = ref({ reload_time: 0, selected_envs: [], monitor_lotids: [] })
const monitoring = ref([])
let monitorTimer = null

const yearsForEnv = computed(() => {
  const e = envs.value.find(x => x.name === selectedEnv.value)
  if (!e) return []
  const ys = []
  for (let y = e.yr_from; y <= e.yr_to; y++) ys.push(y)
  return ys
})

onMounted(async () => {
  try { envs.value = await fetchEnvs() } catch {}
})

function parseLots() {
  return lotInput.value
    .split(/\n|,/)
    .map(s => s.trim())
    .filter(Boolean)
}

function buildCriteria() {
  const lots = parseLots()
  const c = []
  for (const lot_id of lots) {
    c.push({ lot_id, env: selectedEnv.value, year: year.value, month: month.value })
  }
  return c
}

async function doSearch() {
  loading.value = true
  try {
    const resp = await searchArchive(buildCriteria())
    searchResults.value = resp.results || []
    // initialize right pane with all files
    const files = []
    for (const r of searchResults.value) {
      for (const f of r.raw_files || []) files.push(f)
    }
    selectedFiles.value = files
    excludedFiles.value = []
    step.value = 1
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function moveLeft() {
  // move from excluded to selected
  const toMove = new Set(excludedSelection.value)
  const moving = excludedFiles.value.filter(f => toMove.has(f.path))
  excludedFiles.value = excludedFiles.value.filter(f => !toMove.has(f.path))
  selectedFiles.value = [...selectedFiles.value, ...moving]
  excludedSelection.value = []
}

function moveRight() {
  // move from selected to excluded
  const toMove = new Set(selectedSelection.value)
  const moving = selectedFiles.value.filter(f => toMove.has(f.path))
  selectedFiles.value = selectedFiles.value.filter(f => !toMove.has(f.path))
  excludedFiles.value = [...excludedFiles.value, ...moving]
  selectedSelection.value = []
}

function displayFile(path) {
  const parts = path.split('/')
  const name = parts[parts.length-1]
  // shorten
  if (name.length > 45) {
    const dot = name.lastIndexOf('.')
    const base = name.slice(0, 40)
    const ext = dot > -1 ? name.slice(dot) : ''
    return base + '…' + ext
  }
  return name
}

async function triggerDownload() {
  try {
    const files = selectedFiles.value.map(f => f.path)
    const blob = await downloadFiles(files)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Exensio_Files_${Date.now()}.zip`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch(e) {
    console.error(e)
  }
}

async function startReload() {
  try {
    const files = selectedFiles.value.map(f => f.path)
    const meta = await reloadFiles(files, 'RAW', '')
    reloadMeta.value = meta
    step.value = 3
    startMonitoring()
  } catch (e) {
    console.error(e)
  }
}

async function pollOnce() {
  try {
    const { reload_time, selected_envs, monitor_lotids } = reloadMeta.value
    const resp = await monitor(reload_time, selected_envs, monitor_lotids)
    monitoring.value = resp.items || []
    const anyRefresh = monitoring.value.some(i => i.refresh)
    if (!anyRefresh) stopMonitoring()
  } catch (e) { console.error(e) }
}

function startMonitoring() {
  stopMonitoring()
  pollOnce()
  monitorTimer = setInterval(pollOnce, 15000)
}

function stopMonitoring() {
  if (monitorTimer) {
    clearInterval(monitorTimer)
    monitorTimer = null
  }
}

</script>

<style scoped>
.container { max-width: 900px; margin: 2rem auto; }
.steps { display: flex; gap: .5rem; margin-bottom: 1rem; }
.steps button { padding: .4rem .8rem; }
.steps .active { background: #eef; }
.form { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.form textarea, .form select { width: 100%; padding: .5rem; }
.panes { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.pane { display: flex; flex-direction: column; gap: .5rem; }
.pane select { width: 100%; }
.actions { display:flex; gap:.5rem; margin-top: 1rem; }
.lot-result { padding: .25rem 0; }
table.status { width: 100%; border-collapse: collapse; }
table.status th, table.status td { border: 1px solid #ddd; padding: .4rem; }
</style>
