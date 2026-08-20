require('dotenv').config()
const crypto = require('crypto')
const express = require('express')
const cors = require('cors')
const Razorpay = require('razorpay')
const { customers, orders, actions } = require('./data.cjs')
const { connectDatabase } = require('./db.cjs')
const { User, Customer, Order, AIAction } = require('./models.cjs')
const { tokenFor, hashPassword, comparePassword, requireAuth } = require('./auth.cjs')

const app = express()
const port = process.env.PORT || 4000
const maxDiscount = 10
const maxDailyActions = 50
const maxOfferValue = 1000
let databaseConnected = false
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET }) : null
app.use(cors())
app.post('/api/webhook/razorpay', express.raw({ type: 'application/json' }), async (request, response) => {
  const signature = request.headers['x-razorpay-signature']
  const expected = process.env.RAZORPAY_WEBHOOK_SECRET ? crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(request.body).digest('hex') : null
  if (expected && signature !== expected) return response.status(401).json({ error: 'Invalid webhook signature' })
  const event = JSON.parse(request.body.toString())
  if (event.event === 'payment.captured' || event.event === 'order.paid' || event.event === 'payment.failed') {
    const paymentId = event.payload?.payment?.entity?.id || event.payload?.order?.entity?.id
    const razorpayOrderId = event.payload?.payment?.entity?.order_id || event.payload?.order?.entity?.id
    const order = orders.find((item) => item.razorpayOrderId === razorpayOrderId)
    if (order) { Object.assign(order, { status: event.event === 'payment.failed' ? 'Payment failed' : 'Paid', razorpayPaymentId: paymentId }); await persistOrder(order) }
  }
  response.json({ received: true })
})
app.use(express.json())
const persistAction = async (action) => { if (!databaseConnected) return; await AIAction.findOneAndUpdate({ externalId: action.id }, { ...action, externalId: action.id }, { upsert: true, new: true }) }
const persistOrder = async (order) => { if (!databaseConnected) return; await Order.findOneAndUpdate({ externalId: order.id }, { ...order, externalId: order.id }, { upsert: true, new: true }) }
const hydrateDatabase = async () => {
  const storedCustomers = await Customer.find().lean()
  if (!storedCustomers.length) await Customer.insertMany(customers.map((customer) => ({ ...customer, externalId: customer.id })))
  else { customers.splice(0, customers.length, ...storedCustomers.map(({ _id, __v, externalId, ...customer }) => ({ ...customer, id: externalId }))) }
  const storedOrders = await Order.find().lean()
  if (!storedOrders.length) await Order.insertMany(orders.map((order) => ({ ...order, externalId: order.id })))
  else { orders.splice(0, orders.length, ...storedOrders.map(({ _id, __v, externalId, ...order }) => ({ ...order, id: externalId }))) }
  const storedActions = await AIAction.find().lean()
  if (storedActions.length) actions.splice(0, actions.length, ...storedActions.map(({ _id, __v, externalId, ...action }) => ({ ...action, id: externalId })))
}
const protectWhenConfigured = (request, response, next) => databaseConnected ? requireAuth(request, response, next) : next()
const findCustomer = (id) => customers.find((customer) => customer.id === id)
const actionFor = (customer) => {
  const discount = customer.paymentStatus === 'failed' || customer.opportunity === 'cart_recovery' ? 5 : 0
  const opportunity = customer.opportunity === 'none' ? 'reengagement' : customer.opportunity
  const labels = { payment_recovery: 'Recover failed payment', cart_recovery: 'Recover abandoned cart', product_recommendation: 'Recommend a complementary product', reengagement: 'Re-engage customer' }
  const messages = { payment_recovery: `Hi ${customer.name.split(' ')[0]}! Your ${customer.product} is still waiting for you. Complete your purchase today and get ${discount}% off.`, cart_recovery: `Hi ${customer.name.split(' ')[0]}! Your ${customer.product} is still in your cart. Complete your order today with a ${discount}% offer.`, product_recommendation: `Hi ${customer.name.split(' ')[0]}! Complete your setup with a product chosen for your ${customer.product}.`, reengagement: `Hi ${customer.name.split(' ')[0]}! We have missed you. Here is a personal offer based on your previous shopping.` }
  const strategy = opportunity === 'payment_recovery' ? 'Payment recovery' : opportunity === 'product_recommendation' ? 'Product recommendation' : opportunity === 'reengagement' ? 'Re-engagement' : 'Cart recovery'
  return { customer: customer.name, intentScore: customer.intentScore, opportunity, strategy, action: labels[opportunity], discountPercentage: Math.min(discount, maxDiscount), offer: discount ? `${discount}% offer` : 'No discount', message: messages[opportunity], reason: customer.paymentStatus === 'failed' ? 'High purchase intent with a recent failed payment.' : `Intent is driven by ${customer.productViews} product views and a ${customer.cartValue ? `₹${customer.cartValue} cart` : 'recent purchase history'}.`, factors: [`Cart value: ₹${customer.cartValue.toLocaleString('en-IN')}`, `${customer.totalOrders} previous purchases`, `${customer.productViews} product views`, customer.paymentStatus === 'failed' ? 'Payment failed recently' : 'No recent payment failure', customer.lastActive?.includes('Today') ? 'Customer active today' : `Last active ${customer.lastActive}`] }
}
app.get('/api/health', (request, response) => response.json({ status: 'ok', service: 'PayPilot AI API', razorpayConfigured: Boolean(razorpay), database: databaseConnected ? 'connected' : 'demo-memory', auth: databaseConnected ? 'required' : 'demo-open' }))
app.post('/api/auth/register', async (request, response) => {
  const { name, email, password } = request.body
  if (!name || !email || typeof password !== 'string' || password.length < 8) return response.status(400).json({ error: 'name, email, and a password of at least 8 characters are required' })
  if (!databaseConnected) return response.status(503).json({ error: 'MongoDB is required for account registration' })
  try { const user = await User.create({ name, email, passwordHash: await hashPassword(password) }); response.status(201).json({ token: tokenFor(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } }) } catch (error) { response.status(409).json({ error: error.code === 11000 ? 'Email already registered' : 'Unable to create account' }) }
})
app.post('/api/auth/login', async (request, response) => {
  const { email, password } = request.body
  if (!email || !password || !databaseConnected) return response.status(401).json({ error: 'Invalid credentials' })
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user || !(await comparePassword(password, user.passwordHash))) return response.status(401).json({ error: 'Invalid credentials' })
  response.json({ token: tokenFor(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } })
})
app.get('/api/dashboard', (request, response) => response.json({ stats: { totalRevenue: 245000, recoveredRevenue: 38500 + actions.filter((action) => action.status === 'converted').reduce((sum, action) => sum + action.revenueRecovered, 0), abandonedCarts: 124, failedPayments: 18, aiActions: 87 + actions.length, conversionRate: 18.4 }, revenue: [28000, 36000, 31000, 44000, 39000, 52000, 47000], activity: { paymentRecovery: 42, cartRecovery: 28, recommendations: 17 }, roi: { generated: 38500, recovered: 25000, discountCost: 4200, netImpact: 34300, offersSent: 87, conversions: 31, conversionRate: 35.6, averageDiscount: 6.2 }, funnel: [{ label: 'Visitors', value: 10000, rate: 100 }, { label: 'Product views', value: 4200, rate: 42 }, { label: 'Added to cart', value: 1240, rate: 29.5 }, { label: 'Checkout started', value: 620, rate: 50 }, { label: 'Payment attempted', value: 410, rate: 66.1 }, { label: 'Payment successful', value: 255, rate: 62.2 }] }))
app.get('/api/customers', (request, response) => response.json({ customers }))
app.get('/api/customers/:id', (request, response) => { const customer = findCustomer(request.params.id); return customer ? response.json({ customer, recommendation: actionFor(customer) }) : response.status(404).json({ error: 'Customer not found' }) })
app.get('/api/orders', (request, response) => response.json({ orders: [...orders].reverse() }))
app.get('/api/ai/opportunities', (request, response) => response.json({ opportunities: customers.filter((customer) => customer.opportunity !== 'none').map((customer) => ({ ...customer, recommendation: actionFor(customer) })) }))
app.get('/api/ai/actions', (request, response) => response.json({ actions: [...actions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) }))
app.post('/api/ai/analyze/:customerId', async (request, response) => {
  const customer = findCustomer(request.params.customerId)
  if (!customer) return response.status(404).json({ error: 'Customer not found' })
  let recommendation = actionFor(customer)
  if (process.env.GROQ_API_KEY) {
    try {
      const llmResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant', temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'You are PayPilot, an AI commerce growth agent. Return only valid JSON with intentScore, opportunity, action, discountPercentage, message, reason. Never recommend more than 10 percent discount.' }, { role: 'user', content: JSON.stringify(customer) }] }) })
      const result = await llmResponse.json()
      const candidate = JSON.parse(result.choices?.[0]?.message?.content || '{}')
      recommendation = { ...recommendation, ...candidate, discountPercentage: Math.min(Number(candidate.discountPercentage) || 0, maxDiscount) }
    } catch { recommendation.source = 'deterministic-fallback' }
  }
  response.json({ recommendation, source: process.env.GROQ_API_KEY ? recommendation.source || 'groq' : 'deterministic' })
})
app.post('/api/ai/actions/:customerId', protectWhenConfigured, async (request, response) => {
  const customer = findCustomer(request.params.customerId)
  if (!customer) return response.status(404).json({ error: 'Customer not found' })
  const recommendation = actionFor(customer)
  const action = { id: `act_${Date.now()}`, customerId: customer.id, customerName: customer.name, type: recommendation.opportunity, decision: recommendation.offer, reason: recommendation.reason, factors: recommendation.factors, offer: recommendation.discountPercentage, message: recommendation.message, status: 'pending_approval', revenueRecovered: 0, discountCost: Math.round(customer.cartValue * recommendation.discountPercentage / 100), createdAt: new Date().toISOString() }
  actions.push(action)
  await persistAction(action)
  response.status(201).json({ action, recommendation })
})
app.post('/api/ai/actions/:actionId/approve', protectWhenConfigured, async (request, response) => {
  const action = actions.find((item) => item.id === request.params.actionId)
  if (!action) return response.status(404).json({ error: 'AI action not found' })
  const todayCount = actions.filter((item) => item.status !== 'rejected' && item.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length
  if (todayCount >= maxDailyActions) return response.status(409).json({ error: 'Daily AI action guardrail reached' })
  action.status = 'approved'
  action.approvedAt = new Date().toISOString()
  await persistAction(action)
  response.json({ action, guardrails: { maxDiscount, maxDailyActions, maxOfferValue } })
})
app.post('/api/ai/actions/:actionId/reject', protectWhenConfigured, async (request, response) => {
  const action = actions.find((item) => item.id === request.params.actionId)
  if (!action) return response.status(404).json({ error: 'AI action not found' })
  action.status = 'rejected'
  action.rejectedAt = new Date().toISOString()
  await persistAction(action)
  response.json({ action })
})
app.post('/api/ai/simulate', (request, response) => {
  const { cartValue = 0, previousOrders = 0, productViews = 0, paymentStatus = 'none', lastActive = 'Today' } = request.body
  if (![cartValue, previousOrders, productViews].every((value) => Number.isFinite(Number(value)) && Number(value) >= 0) || !['none', 'failed'].includes(paymentStatus) || !['Today', 'Yesterday'].includes(lastActive)) return response.status(400).json({ error: 'Invalid simulation inputs' })
  const intentScore = Math.min(100, Math.round(Number(cartValue) / 100 + Number(previousOrders) * 5 + Number(productViews) * 4 + (paymentStatus === 'failed' ? 20 : 0) + (lastActive === 'Today' ? 10 : 0)))
  const strategy = paymentStatus === 'failed' ? 'Payment recovery' : intentScore >= 70 ? 'Product recommendation' : intentScore >= 45 ? 'Cart recovery' : 'Re-engagement'
  const discountPercentage = strategy === 'Payment recovery' || strategy === 'Cart recovery' ? 5 : 0
  response.json({ intentScore, strategy, offer: discountPercentage ? `${discountPercentage}% discount` : 'No discount', expectedConversion: intentScore >= 75 ? 'High' : intentScore >= 45 ? 'Medium' : 'Low', reason: paymentStatus === 'failed' ? 'High purchase intent with a recent payment failure.' : `Score combines cart value, ${previousOrders} previous orders, and ${productViews} product views.` })
})
app.post('/api/payments/create-order', protectWhenConfigured, async (request, response) => {
  const { customerId, amount, discountPercentage = 0, actionId } = request.body
  const customer = findCustomer(customerId)
  if (!customer || !Number.isFinite(Number(amount))) return response.status(400).json({ error: 'customerId and numeric amount are required' })
  const discount = Math.min(Math.max(Number(discountPercentage), 0), maxDiscount)
  const finalAmount = Math.round(Number(amount) * (1 - discount / 100) * 100) / 100
  if (!razorpay) { const demoOrder = { id: `demo_order_${Date.now()}`, amount: Math.round(finalAmount * 100), currency: 'INR', receipt: `pp_${customer.id}` }; const orderRecord = { id: `PP-${Date.now()}`, customerId: customer.id, customer: customer.name, item: customer.product, amount: finalAmount, status: 'Pending', source: 'AI recovery', date: new Date().toLocaleDateString('en-IN'), razorpayOrderId: demoOrder.id }; orders.push(orderRecord); await persistOrder(orderRecord); return response.json({ demo: true, keyId: null, order: demoOrder, actionId, finalAmount, message: 'Razorpay is not configured. Add test keys to .env to open Checkout.' }) }
  try { const order = await razorpay.orders.create({ amount: Math.round(finalAmount * 100), currency: 'INR', receipt: `pp_${customer.id}_${Date.now()}` }); const orderRecord = { id: `PP-${Date.now()}`, customerId: customer.id, customer: customer.name, item: customer.product, amount: finalAmount, status: 'Pending', source: 'AI recovery', date: new Date().toLocaleDateString('en-IN'), razorpayOrderId: order.id }; orders.push(orderRecord); await persistOrder(orderRecord); response.status(201).json({ demo: false, keyId: process.env.RAZORPAY_KEY_ID, order, actionId, finalAmount }) } catch (error) { response.status(502).json({ error: 'Unable to create Razorpay order', detail: error.message }) }
})
app.post('/api/payments/verify', protectWhenConfigured, async (request, response) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, actionId, amount } = request.body
  if (!orderId || orderId.startsWith('demo_')) { const order = orders.find((item) => item.razorpayOrderId === orderId); if (order) { order.status = 'Paid'; await persistOrder(order) }; return response.json({ verified: true, demo: true, message: 'Demo payment recorded.' }) }
  const digest = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')
  if (digest !== signature) return response.status(400).json({ verified: false, error: 'Invalid payment signature' })
  const action = actions.find((item) => item.id === actionId)
  if (action) { Object.assign(action, { status: 'converted', revenueRecovered: Number(amount) || 0 }); await persistAction(action) }
  const order = orders.find((item) => item.razorpayOrderId === orderId)
  if (order) { Object.assign(order, { status: 'Paid', razorpayPaymentId: paymentId }); await persistOrder(order) }
  response.json({ verified: true, demo: false })
})
connectDatabase().then(async (connected) => { databaseConnected = connected; if (connected) await hydrateDatabase(); app.listen(port, () => console.log(`PayPilot AI API running on http://localhost:${port}`)) }).catch((error) => { console.error(`MongoDB unavailable, using demo-memory mode: ${error.message}`); app.listen(port, () => console.log(`PayPilot AI API running on http://localhost:${port}`)) })
