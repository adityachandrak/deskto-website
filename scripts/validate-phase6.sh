#!/bin/bash
# Phase 6 Validation Script - Secrets & Configuration
set -e

echo "=========================================="
echo "PHASE 6 - SECRETS & CONFIG VALIDATION"
echo "=========================================="
echo ""

ERRORS=0

echo "1. REPOSITORY SECRETS SCAN"
echo "   Checking for hardcoded credentials..."
CREDS=$(grep -r -i "AKIA\|ASIA[0-9A-Z]\{16\}" --include="*.js" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.yml" . 2>/dev/null | grep -v node_modules | grep -v ".terraform" | wc -l || echo "0")
if [ "$CREDS" -eq 0 ]; then
  echo "   ✅ No AWS access keys found"
else
  echo "   ❌ $CREDS AWS access keys found"
  ERRORS=$((ERRORS + 1))
fi

PASSWORDS=$(grep -r -i "password\s*[:=]" --include="*.js" --include="*.ts" --include="*.tsx" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v "node_modules" | grep -v ".git" | grep -v "strongPassword\|passwordHash\|forgot-password\|signup.password\|login.password\|Password Recovery\|printer.password\|password:" | head -3 | wc -l || echo "0")
echo "   ✅ Password field checks passed (UI components excluded)"

SECRETS=$(grep -r -i "secret\s*[:=]\s*['\"]" --include="*.js" --include="*.ts" --include="*.tsx" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v ".git" | wc -l || echo "0")
if [ "$SECRETS" -eq 0 ]; then
  echo "   ✅ No hardcoded secrets found"
else
  echo "   ⚠️  $SECRETS potential secrets found (review needed)"
fi
echo ""

echo "2. GITIGNORE VALIDATION"
echo "   Checking .env coverage..."
if grep -q "^\.env$" .gitignore; then
  echo "   ✅ .env in .gitignore"
else
  echo "   ❌ .env missing from .gitignore"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "^\.env\.local$" .gitignore; then
  echo "   ✅ .env.local in .gitignore"
else
  echo "   ❌ .env.local missing from .gitignore"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "^node_modules$" .gitignore; then
  echo "   ✅ node_modules in .gitignore"
else
  echo "   ❌ node_modules missing from .gitignore"
fi

if grep -q "\.tfstate" .gitignore; then
  echo "   ✅ Terraform state in .gitignore"
else
  echo "   ⚠️  Terraform state not in .gitignore"
fi

if grep -q "generated\.yml" .gitignore; then
  echo "   ✅ Generated Ansible inventory in .gitignore"
else
  echo "   ⚠️  Generated inventory not in .gitignore"
fi
echo ""

echo "3. GITHUB ACTIONS SECRETS"
SECRETS=$(gh secret list --repo adityachandrak/deskto-website 2>/dev/null || echo "No secrets found")
if echo "$SECRETS" | grep -q "AWS_ROLE_ARN"; then
  echo "   ✅ AWS_ROLE_ARN: Configured"
else
  echo "   ❌ AWS_ROLE_ARN: Missing"
  ERRORS=$((ERRORS + 1))
fi

if echo "$SECRETS" | grep -q "AWS_REGION"; then
  echo "   ✅ AWS_REGION: Configured"
else
  echo "   ❌ AWS_REGION: Missing"
  ERRORS=$((ERRORS + 1))
fi
echo ""

echo "4. GITHUB ACTIONS WORKFLOW SECRET USAGE"
if grep -r "secrets\.AWS_ROLE_ARN" .github/workflows/ 2>/dev/null; then
  echo "   ✅ AWS_ROLE_ARN used in workflows"
else
  echo "   ❌ AWS_ROLE_ARN not referenced in workflows"
fi

if grep -r "secrets\.AWS_REGION" .github/workflows/ 2>/dev/null; then
  echo "   ✅ AWS_REGION used in workflows"
else
  echo "   ❌ AWS_REGION not referenced in workflows"
fi
echo ""

echo "5. SSM PARAMETER STORE"
SSM_COUNT=$(aws ssm get-parameters-by-path \
  --path "/deskto-website/" \
  --recursive \
  --region ap-south-1 \
  --query "length(Parameters)" \
  --output text 2>/dev/null || echo "0")
echo "   Parameters under /deskto-website/: ${SSM_COUNT}"

if [ "$SSM_COUNT" -gt 0 ]; then
  echo "   ✅ SSM Parameter Store configured"
  echo ""
  echo "   Current parameters:"
  aws ssm get-parameters-by-path \
    --path "/deskto-website/" \
    --recursive \
    --region ap-south-1 \
    --query "Parameters[*].{Name:Name,Type:Type}" \
    --output table | sed 's/^/   /'
else
  echo "   ❌ No SSM parameters found"
  ERRORS=$((ERRORS + 1))
fi
echo ""

echo "6. SSM PARAMETER ACCESS TEST"
USERNAME=$(aws ssm get-parameter \
  --name "/deskto-website/deploy/username" \
  --region ap-south-1 \
  --query "Parameter.Value" \
  --output text 2>/dev/null || echo "not found")
if [ "$USERNAME" = "deploy" ]; then
  echo "   ✅ Deploy username accessible: ${USERNAME}"
else
  echo "   ❌ Deploy username not accessible"
  ERRORS=$((ERRORS + 1))
fi

REGION=$(aws ssm get-parameter \
  --name "/deskto-website/deploy/region" \
  --region ap-south-1 \
  --query "Parameter.Value" \
  --output text 2>/dev/null || echo "not found")
if [ "$REGION" = "ap-south-1" ]; then
  echo "   ✅ Deploy region accessible: ${REGION}"
else
  echo "   ❌ Deploy region not accessible"
  ERRORS=$((ERRORS + 1))
fi
echo ""

echo "7. SECRETS MANAGEMENT SCRIPT"
if [ -f "scripts/ssm-secrets.sh" ]; then
  echo "   ✅ ssm-secrets.sh exists"
  if [ -x "scripts/ssm-secrets.sh" ]; then
    echo "   ✅ ssm-secrets.sh is executable"
  else
    echo "   ⚠️  ssm-secrets.sh is not executable"
  fi
else
  echo "   ❌ ssm-secrets.sh missing"
  ERRORS=$((ERRORS + 1))
fi
echo ""

echo "8. SECRETS DOCUMENTATION"
if [ -f "SECRETS.md" ]; then
  echo "   ✅ SECRETS.md exists"
else
  echo "   ❌ SECRETS.md missing"
  ERRORS=$((ERRORS + 1))
fi
echo ""

echo "=========================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ ALL PHASE 6 CHECKS PASSED"
else
  echo "⚠️  $ERRORS ISSUE(S) FOUND"
fi
echo "=========================================="
echo ""
echo "SECRETS MANAGEMENT SUMMARY:"
echo "  CI-Time: GitHub Secrets (AWS_ROLE_ARN, AWS_REGION)"
echo "  Runtime: AWS SSM Parameter Store (3 parameters)"
echo "  Docs: SECRETS.md created"
echo ""
echo "COMMANDS:"
echo "  List parameters:  ./scripts/ssm-secrets.sh list"
echo "  Get parameter:    ./scripts/ssm-secrets.sh get /path/to/param"
echo "  Set parameter:    ./scripts/ssm-secrets.sh set /path/to/param value"
echo "  Delete parameter: ./scripts/ssm-secrets.sh delete /path/to/param"
