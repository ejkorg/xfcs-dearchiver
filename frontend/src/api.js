export async function fetchEnvs() {
  const res = await fetch('/api/envs')
  if (!res.ok) throw new Error('Failed to load envs')
  return res.json()
}

export async function searchArchive(criteria) {
  const res = await fetch('/api/archive/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ criteria })
  })
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

export async function downloadFiles(files) {
  const res = await fetch('/api/files/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files })
  })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  return blob
}

export async function reloadFiles(files, dataType = 'RAW', username = '') {
  const res = await fetch('/api/reload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, data_type: dataType, username })
  })
  if (!res.ok) throw new Error('Reload failed')
  return res.json()
}

export async function monitor(reload_time, envs, lotids) {
  const res = await fetch('/api/monitor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reload_time, envs, lotids })
  })
  if (!res.ok) throw new Error('Monitor failed')
  return res.json()
}
