#!/bin/bash
# Comprehensive Phase 0-5 Validation Script
# Run this to verify all setup is complete end-to-end

set -e

echo "=========================================="
echo "COMPREHENSIVE PHASE 0-5 VALIDATION"
echo "=========================================="
echo ""

echo "PHASE 0 - REPO & ACCOUNT PREP"
./scripts/validate-setup.sh 2>/dev/null || echo "  ⚠️  Phase 0 validation failed"
echo ""

echo "PHASE 1 & 2 - DOCKER & ECR"
./scripts/validate-phase1-2.sh 2>/dev/null || echo "  ⚠️  Phase 1 & 2 validation failed"
echo ""

echo "PHASE 3 & 4 - TERRAFORM & ANSIBLE"
./scripts/validate-phase3-4.sh 2>/dev/null || echo "  ⚠️  Phase 3 & 4 validation failed"
echo ""

echo "PHASE 5 - CI/CD (GITHUB ACTIONS)"
./scripts/validate-phase5.sh 2>/dev/null || echo "  ⚠️  Phase 5 validation failed"
echo ""

echo "=========================================="
echo "FINAL CHECKLIST"
echo "=========================================="
echo ""

echo "1. GITHUB REPOSITORY"
git remote -v | grep origin || echo "  ❌ No GitHub remote configured"
echo ""

echo "2. GIT BRANCH"
git branch --show-current || echo "  ❌ Not on a branch"
echo ""

echo "3. GIT STATUS"
STATUS=$(git status --porcelain | wc -l)
if [ "$STATUS" -eq 0 ]; then
  echo "  ✅ Working directory clean"
else
  echo "  ⚠️  $STATUS uncommitted changes"
fi
echo ""

echo "4. AWS CREDENTIALS"
aws sts get-caller-identity 2>/dev/null | jq -r '.Account' || echo "  ❌ AWS not configured"
echo ""

echo "5. GITHUB SECRETS"
gh secret list --repo adityachandrak/deskto-website 2>/dev/null | grep AWS_ROLE_ARN || echo "  ❌ AWS_ROLE_ARN not set"
gh secret list --repo adityachandrak/deskto-website 2>/dev/null | grep AWS_REGION || echo "  ❌ AWS_REGION not set"
echo ""

echo "6. WORKFLOW FILES (to be pushed to GitHub)"
ls -1 .github/workflows/*.yml 2>/dev/null | sed 's/^/  - /' || echo "  ❌ No workflow files found"
echo ""

echo "=========================================="
echo "READY FOR DEPLOYMENT?"
echo "=========================================="
echo ""
echo "REMAINING MANUAL STEPS:"
echo "1. terraform apply (create EC2 infrastructure)"
echo "2. ./scripts/generate-inventory.sh"
echo "3. ansible-playbook -i ansible/inventory/generated.yml ansible/playbooks/bootstrap.yml"
echo "4. git push origin main (triggers CI/CD workflow)"
echo ""
echo "AFTER FIRST DEPLOYMENT:"
echo "1. Check EC2 public IP: aws ec2 describe-instances"
echo "2. Test website: curl http://<public-ip>/"
echo "3. Verify GitHub Actions workflow: https://github.com/adityachandrak/deskto-website/actions"
