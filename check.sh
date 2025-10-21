#!/bin/bash
set -e

echo "🔍 Running ESLint..."
npm run lint -- --fix

echo ""
echo "🧪 Running tests with coverage..."
npm run test:coverage

echo ""
echo "✅ All checks passed!"
