const { spawn } = require('child_process')
const base = 'http://127.0.0.1:4123'
const server = spawn(process.execPath, ['-e', "process.env.PORT='4123'; process.env.MONGODB_URI=''; process.env.GROQ_API_KEY=''; process.env.RAZORPAY_KEY_ID=''; process.env.RAZORPAY_KEY_SECRET=''; require('./server/index.cjs')"], { env: { ...process.env }, stdio: 'ignore' })
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const request = async (path, options) => { const response = await fetch(`${base}${path}`, options); const body = await response.json(); return { status: response.status, body } }
async function run() {
  try {
    let ready = false
    for (let attempt = 0; attempt < 20 && !ready; attempt += 1) { try { ready = (await fetch(`${base}/api/health`)).ok } catch { await wait(250) } }
    if (!ready) throw new Error('API did not start on port 4123')
    const health = await request('/api/health')
    const simulation = await request('/api/ai/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cartValue: 8000, previousOrders: 4, productViews: 6, paymentStatus: 'failed', lastActive: 'Today' }) })
    const invalid = await request('/api/ai/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cartValue: -1 }) })
    const created = await request('/api/ai/actions/rahul', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const approved = await request(`/api/ai/actions/${created.body.action.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (health.body.status !== 'ok' || simulation.body.intentScore < 0 || invalid.status !== 400 || approved.body.action.status !== 'approved') throw new Error('API smoke assertion failed')
    console.log('API smoke passed: health, simulation, validation, action creation, approval.')
  } finally { server.kill() }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1 })
