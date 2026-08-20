const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { User } = require('./models.cjs')

const jwtSecret = () => process.env.JWT_SECRET || 'paypilot-demo-secret-change-me'
const tokenFor = (user) => jwt.sign({ sub: user._id?.toString() || user.id, role: user.role, email: user.email }, jwtSecret(), { expiresIn: '8h' })
const hashPassword = (password) => bcrypt.hash(password, 12)
const comparePassword = (password, hash) => bcrypt.compare(password, hash)
const requireAuth = (request, response, next) => {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) return response.status(401).json({ error: 'Authentication required' })
  try { request.user = jwt.verify(header.slice(7), jwtSecret()); next() } catch { response.status(401).json({ error: 'Invalid or expired token' }) }
}
const findUser = (email) => User.findOne({ email: email.toLowerCase() })
module.exports = { tokenFor, hashPassword, comparePassword, requireAuth, findUser }
