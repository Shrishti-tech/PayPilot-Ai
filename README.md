# PayPilot AI

PayPilot AI is an AI-powered commerce growth agent for recovering abandoned carts, failed payments, and missed repeat purchases.

The MVP demonstrates this loop:

`Customer signals -> intent score -> validated recommendation -> recovery order -> payment verification -> recovered revenue`

## Run locally

```bash
npm install
npm run dev:all
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000`.

The app works without external services using seeded demo data and an in-memory store. Use the sidebar to explore:

- Overview: revenue, AI activity, and current opportunities
- Customers: intent scores and next actions for 10 demo customers
- Orders: commerce and payment outcomes
- AI Agent: recommendation queue with discount guardrails
- Payments: Razorpay readiness and recovery flow
- Analytics: AI contribution and conversion lift
- Settings: store profile and agent guardrails

## Optional integrations

Copy `.env.example` to `.env` and provide:

```env
MONGODB_URI=mongodb+srv://...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
GROQ_API_KEY=...
GROQ_MODEL=llama-3.1-8b-instant
JWT_SECRET=replace_with_a_long_random_secret
```

Razorpay secrets stay server-side. The API creates an order before Checkout and verifies the payment signature. `payment.captured` and `order.paid` webhook events are accepted at `/api/webhook/razorpay`.

Groq is optional. When `GROQ_API_KEY` is absent or unavailable, the backend uses a deterministic intent policy so the demo remains usable.

When `MONGODB_URI` is configured, customers, orders, and AI actions hydrate into MongoDB through the schemas in `server/models.cjs`. Registration and login are available at `/api/auth/register` and `/api/auth/login`; protected mutations require the returned Bearer token. Without MongoDB, the app intentionally stays in open demo-memory mode.

## API surface

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/customers`
- `GET /api/orders`
- `GET /api/ai/opportunities`
- `POST /api/ai/analyze/:customerId`
- `POST /api/ai/actions/:customerId`
- `GET /api/ai/actions`
- `POST /api/ai/actions/:actionId/approve`
- `POST /api/ai/actions/:actionId/reject`
- `POST /api/ai/simulate`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/payments/create-order`
- `POST /api/payments/verify`
- `POST /api/webhook/razorpay`

## Guardrails

The server clamps every AI-supplied discount to a maximum of 10%. The AI recommends; the backend validates. This remains true whether the recommendation came from Groq or the deterministic fallback.

## Validation

```bash
npm run test:api
npm run security:check
npm run lint
npm run build
```

The API smoke test covers health, input validation, simulation, action creation, and approval. The security check scans source files for credential-shaped values while excluding `.env` and `.env.example`.
