#!/bin/bash
# Quick Git Workflow Script

echo "🧪 Testing..."
npm test || exit 1

echo "📦 Building..."
npm run build || exit 1

echo "✅ All checks passed!"
echo ""
echo "Ready to commit. Run:"
echo "  git add ."
echo "  git commit -m 'your message'"
echo "  git push"
