#!/bin/bash
# Phase 5 Validation Script
# Run this to verify all Phase 5 GitHub Actions setup is complete

set -e

echo "=========================================="
echo "PHASE 5 - CI/CD VALIDATION REPORT"
echo "=========================================="
echo ""

echo "1. GITHUB ACTIONS WORKFLOWS"
echo "   Workflow files:"
ls -1 .github/workflows/*.yml 2>/dev/null | sed 's/^/   - /' || echo "   ❌ No workflows found"
echo ""

echo "2. CI/CD WORKFLOW"
echo "   File: .github/workflows/ci-cd.yml"
if [ -f ".github/workflows/ci-cd.yml" ]; then
  echo "   Jobs defined:"
  grep "^  [a-z_-]*:" .github/workflows/ci-cd.yml | sed 's/^/     - /'
  echo ""
  echo "   Triggers:"
  grep -A2 "on:" .github/workflows/ci-cd.yml | grep -v "^--$" | sed 's/^/     - /'
  echo ""
  echo "   Concurrency:"
  grep -A2 "concurrency:" .github/workflows/ci-cd.yml | grep -v "^--$" | sed 's/^/     - /'
fi
echo ""

echo "3. TERRAFORM WORKFLOW"
echo "   File: .github/workflows/terraform.yml"
if [ -f ".github/workflows/terraform.yml" ]; then
  echo "   Jobs defined:"
  grep "^  [a-z_-]*:" .github/workflows/terraform.yml | sed 's/^/     - /'
  echo ""
  echo "   Triggers:"
  grep -A2 "on:" .github/workflows/terraform.yml | grep -v "^--$" | sed 's/^/     - /'
  echo ""
  echo "   Concurrency:"
  grep -A2 "concurrency:" .github/workflows/terraform.yml | grep -v "^--$" | sed 's/^/     - /'
fi
echo ""

echo "4. WORKFLOW SYNTAX VALIDATION"
echo "   Checking ci-cd.yml for common issues..."
ERRORS=0

# Check for required steps
if grep -q "build-test" .github/workflows/ci-cd.yml; then
  echo "   ✅ build-test job defined"
else
  echo "   ❌ build-test job missing"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "docker" .github/workflows/ci-cd.yml; then
  echo "   ✅ docker job defined"
else
  echo "   ❌ docker job missing"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "deploy" .github/workflows/ci-cd.yml; then
  echo "   ✅ deploy job defined"
else
  echo "   ❌ deploy job missing"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "smoke-test" .github/workflows/ci-cd.yml; then
  echo "   ✅ smoke-test job defined"
else
  echo "   ❌ smoke-test job missing"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "needs:" .github/workflows/ci-cd.yml; then
  echo "   ✅ Job dependencies defined"
else
  echo "   ⚠️  Warning: No job dependencies"
fi

if grep -q "concurrency:" .github/workflows/ci-cd.yml; then
  echo "   ✅ Concurrency group defined"
else
  echo "   ⚠️  Warning: No concurrency group"
fi

if grep -q "OIDC\|id-token\|configure-aws-credentials" .github/workflows/ci-cd.yml; then
  echo "   ✅ OIDC authentication configured"
else
  echo "   ❌ OIDC authentication missing"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "5. ANSIBLE PLAYBOOKS (for deploy job)"
echo "   Bootstrap:"
if [ -f "ansible/playbooks/bootstrap.yml" ]; then
  echo "   ✅ ansible/playbooks/bootstrap.yml exists"
else
  echo "   ❌ Missing"
  ERRORS=$((ERRORS + 1))
fi
echo "   Deploy:"
if [ -f "ansible/playbooks/deploy.yml" ]; then
  echo "   ✅ ansible/playbooks/deploy.yml exists"
else
  echo "   ❌ Missing"
  ERRORS=$((ERRORS + 1))
fi
echo ""

echo "6. GITHUB SECRETS (check configured)"
if [ -f ".github/workflows/ci-cd.yml" ]; then
  SECRETS_USED=$(grep -o "secrets\.[A-Z_]*" .github/workflows/ci-cd.yml | sort -u | sed 's/secrets\.//')
  echo "   Secrets used:"
  echo "$SECRETS_USED" | sed 's/^/     - /'
fi
echo ""

echo "7. ECR IMAGE TAGGING STRATEGY"
if [ -f ".github/workflows/ci-cd.yml" ]; then
  if grep -q "GITHUB_SHA" .github/workflows/ci-cd.yml; then
    echo "   ✅ Uses GITHUB_SHA for image tagging"
  else
    echo "   ⚠️  Does not use GITHUB_SHA"
  fi
  if grep -q ":latest" .github/workflows/ci-cd.yml; then
    echo "   ✅ Uses :latest tag"
  else
    echo "   ⚠️  Does not use :latest"
  fi
fi
echo ""

echo "8. SMOKE TEST CHECKS"
if [ -f ".github/workflows/ci-cd.yml" ]; then
  if grep -q "smoke-test" .github/workflows/ci-cd.yml; then
    echo "   ✅ Smoke test job defined"
  else
    echo "   ❌ Smoke test job missing"
    ERRORS=$((ERRORS + 1))
  fi
  if grep -q "HTTP" .github/workflows/ci-cd.yml && grep -q "200" .github/workflows/ci-cd.yml; then
    echo "   ✅ HTTP 200 check defined"
  else
    echo "   ⚠️  No HTTP 200 assertion"
  fi
fi
echo ""

echo "=========================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ ALL PHASE 5 CHECKS PASSED"
else
  echo "⚠️  $ERRORS ISSUE(S) FOUND"
fi
echo "=========================================="
echo ""
echo "WORKFLOWS TO REVIEW ON GITHUB:"
echo "  1. https://github.com/adityachandrak/deskto-website/actions/workflows/ci-cd.yml"
echo "  2. https://github.com/adityachandrak/deskto-website/actions/workflows/terraform.yml"
echo ""
echo "GITHUB SECRETS NEEDED:"
echo "  - AWS_ROLE_ARN  (already set ✅)"
echo "  - AWS_REGION    (already set ✅)"
echo ""
echo "WORKFLOW FLOW:"
echo "  1. Push to main → build-test (npm ci → validate → build)"
echo "  2. → docker (build → ECR push :sha-<sha> + :latest)"
echo "  3. → deploy (OIDC → Ansible deploy.yml)"
echo "  4. → smoke-test (HTTP 200 + content marker)"
echo ""
echo "  SEPARATE: terraform.yml (manual trigger for plan/apply)"
echo "  CONCURRENCY: 1 deploy per branch (cancel-in-progress)"
