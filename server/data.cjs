const customers = [
  { id: 'rahul', name: 'Rahul Kapoor', email: 'rahul@example.com', phone: '+91 98765 43210', cartValue: 4999, totalOrders: 3, totalSpent: 28500, productViews: 5, lastActive: 'Today, 10:42 AM', paymentStatus: 'failed', opportunity: 'payment_recovery', product: 'Wireless headphones', intentScore: 92 },
  { id: 'priya', name: 'Priya Shah', email: 'priya@example.com', phone: '+91 98989 11223', cartValue: 2499, totalOrders: 1, totalSpent: 2499, productViews: 3, lastActive: 'Today, 8:14 AM', paymentStatus: 'pending', opportunity: 'cart_recovery', product: 'Running shoes', intentScore: 76 },
  { id: 'aman', name: 'Aman Mehta', email: 'aman@example.com', phone: '+91 98111 22110', cartValue: 8999, totalOrders: 4, totalSpent: 74900, productViews: 7, lastActive: 'Yesterday', paymentStatus: 'none', opportunity: 'product_recommendation', product: 'Laptop bag', intentScore: 84 },
  { id: 'neha', name: 'Neha Verma', email: 'neha@example.com', phone: '+91 97654 88990', cartValue: 1299, totalOrders: 0, totalSpent: 0, productViews: 1, lastActive: '60 days ago', paymentStatus: 'none', opportunity: 'reengagement', product: 'Home essentials', intentScore: 31 },
  { id: 'shrishti', name: 'Shrishti Rao', email: 'shrishti@example.com', phone: '+91 99887 66554', cartValue: 6000, totalOrders: 4, totalSpent: 96800, productViews: 7, lastActive: 'Today, 9:28 AM', paymentStatus: 'failed', opportunity: 'payment_recovery', product: 'Smart watch', intentScore: 94 },
  { id: 'kabir', name: 'Kabir Malhotra', email: 'kabir@example.com', phone: '+91 98990 77881', cartValue: 3299, totalOrders: 2, totalSpent: 12700, productViews: 4, lastActive: 'Yesterday', paymentStatus: 'paid', opportunity: 'none', product: 'Travel backpack', intentScore: 68 },
  { id: 'tara', name: 'Tara Iyer', email: 'tara@example.com', phone: '+91 98220 44112', cartValue: 1799, totalOrders: 1, totalSpent: 1799, productViews: 2, lastActive: '3 days ago', paymentStatus: 'pending', opportunity: 'cart_recovery', product: 'Ceramic set', intentScore: 59 },
  { id: 'vikram', name: 'Vikram Joshi', email: 'vikram@example.com', phone: '+91 98000 33221', cartValue: 7499, totalOrders: 5, totalSpent: 115400, productViews: 6, lastActive: 'Today, 7:10 AM', paymentStatus: 'none', opportunity: 'product_recommendation', product: 'Mechanical keyboard', intentScore: 81 },
  { id: 'simran', name: 'Simran Kaur', email: 'simran@example.com', phone: '+91 98700 11882', cartValue: 899, totalOrders: 0, totalSpent: 0, productViews: 1, lastActive: '45 days ago', paymentStatus: 'none', opportunity: 'reengagement', product: 'Desk lamp', intentScore: 26 },
  { id: 'arjun', name: 'Arjun Bhat', email: 'arjun@example.com', phone: '+91 99110 22334', cartValue: 4199, totalOrders: 2, totalSpent: 18700, productViews: 5, lastActive: 'Today, 11:02 AM', paymentStatus: 'paid', opportunity: 'none', product: 'Noise cancelling earbuds', intentScore: 72 },
]
const orders = [
  { id: 'PP-2049', customer: 'Kabir Malhotra', item: 'Travel backpack', amount: 3299, status: 'Paid', date: 'Aug 20, 2026', source: 'Organic' },
  { id: 'PP-2048', customer: 'Arjun Bhat', item: 'Noise cancelling earbuds', amount: 4199, status: 'Paid', date: 'Aug 20, 2026', source: 'AI recommendation' },
  { id: 'PP-2047', customer: 'Rahul Kapoor', item: 'Wireless headphones', amount: 4749, status: 'Payment failed', date: 'Aug 20, 2026', source: 'AI recovery' },
  { id: 'PP-2046', customer: 'Shrishti Rao', item: 'Smart watch', amount: 5700, status: 'Payment failed', date: 'Aug 19, 2026', source: 'AI recovery' },
  { id: 'PP-2045', customer: 'Vikram Joshi', item: 'Mechanical keyboard', amount: 7499, status: 'Paid', date: 'Aug 19, 2026', source: 'Organic' },
]
const actions = [
  { id: 'act_seed_1', customerId: 'rahul', customerName: 'Rahul Kapoor', type: 'payment_recovery', decision: '5% offer', offer: 5, status: 'converted', revenueRecovered: 4749, discountCost: 250, reason: 'High purchase intent with a recent failed payment.', createdAt: '2026-08-20T10:32:00.000Z' },
  { id: 'act_seed_2', customerId: 'priya', customerName: 'Priya Shah', type: 'cart_recovery', decision: '5% offer', offer: 5, status: 'pending_approval', revenueRecovered: 0, discountCost: 125, reason: 'Active cart with repeated product views.', createdAt: '2026-08-20T10:25:00.000Z' },
  { id: 'act_seed_3', customerId: 'aman', customerName: 'Aman Mehta', type: 'product_recommendation', decision: 'No discount', offer: 0, status: 'rejected', revenueRecovered: 0, discountCost: 0, reason: 'High-value customer is better served by a complementary recommendation.', createdAt: '2026-08-20T10:12:00.000Z' },
]
module.exports = { customers, orders, actions }
