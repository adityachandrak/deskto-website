#!/bin/bash
# Phase 0 Validation Script
# Run this to verify all Phase 0 setup is complete

echo "=========================================="
echo "PHASE 0 - VALIDATION REPORT"
echo "=========================================="
echo ""

echo "1. GIT STATUS"
echo "   Branch: $(git branch --show-current)"
echo "   Status: $(git status --porcelain | wc -l) changes"
echo ""

echo "2. GITHUB REPOSITORY"
echo "   Remote: $(git remote get-url origin)"
echo ""

echo "3. AWS IDENTITY"
aws sts get-caller-identity --output table 2>/dev/null || echo "   AWS not configured"
echo ""

echo "4. AWS REGION"
echo "   Region: $(aws configure get region)"
echo ""

echo "5. IAM USER (github-actions-deploy)"
aws iam get-user --user-name github-actions-deploy --output json 2>/dev/null | jq '.User | {UserName, Arn, UserId}' || echo "   User not found"
echo ""

echo "6. IAM POLICIES ATTACHED TO USER"
aws iam list-attached-user-policies --user-name github-actions-deploy --output json 2>/dev/null | jq '.AttachedPolicies[].PolicyName'
echo ""

echo "7. IAM ROLE (github-actions-deploy-role)"
aws iam get-role --role-name github-actions-deploy-role --output json 2>/dev/null | jq '.Role | {RoleName, Arn}' || echo "   Role not found"
echo ""

echo "8. IAM ROLE POLICIES"
aws iam list-attached-role-policies --role-name github-actions-deploy-role --output json 2>/dev/null | jq '.AttachedPolicies[].PolicyName'
echo ""

echo "9. OIDC PROVIDER"
aws iam list-open-id-connect-providers --output json 2>/dev/null | jq '.OpenIDConnectProviderList[].Arn'
echo ""

echo "10. GITHUB SECRETS"
gh secret list --repo adityachandrak/deskto-website 2>/dev/null || echo "   Not authenticated or no repo"
echo ""

echo "=========================================="
echo "VALIDATION COMPLETE"
echo "=========================================="
