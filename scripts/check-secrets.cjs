const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const ignored = new Set(['node_modules', 'dist', '.git', '.env', '.env.example', 'package-lock.json'])
const patterns = [/RAZORPAY_KEY_SECRET\s*=\s*(?!your_|\.\.\.|$)[^\s'"`]+/i, /GROQ_API_KEY\s*=\s*(?!your_|\.\.\.|$)[^\s'"`]+/i, /MONGODB_URI\s*=\s*(?!mongodb\+srv:\/\/\.\.\.|\.\.\.|$)[^\s'"`]+/i, /JWT_SECRET\s*=\s*(?!your_|replace_|\.\.\.|$)[^\s'"`]+/i, /rzp_(live|test)_[a-z0-9]{12,}/i]
let findings = []
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) scan(fullPath)
    else if (/\.(js|cjs|jsx|json|md|env|html|css)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8')
      patterns.forEach((pattern) => { if (pattern.test(content)) findings.push(path.relative(root, fullPath)) })
    }
  }
}
scan(root)
if (findings.length) { console.error(`Potential secrets found in: ${[...new Set(findings)].join(', ')}`); process.exit(1) }
console.log('Security check passed: no credential values detected.')
