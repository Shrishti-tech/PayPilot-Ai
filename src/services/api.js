const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data
}

export { API_URL }
