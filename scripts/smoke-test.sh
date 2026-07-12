#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3001}"

echo "Testing backend health at ${BASE_URL}/health"
curl -fsS "${BASE_URL}/health" | tee /tmp/health.json

echo "\nTesting products endpoint"
curl -fsS "${BASE_URL}/api/products?page=1&limit=2" | tee /tmp/products.json

echo "\nTesting auth login endpoint"
curl -fsS -X POST "${BASE_URL}/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@deskto.com","password":"admin123"}' | tee /tmp/auth.json
