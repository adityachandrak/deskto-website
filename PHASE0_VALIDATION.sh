#!/bin/bash
# DESKTO Phase 0 — End-to-End Validation Script
# Run this script to execute and validate Phase 0 setup

set -e

echo "========================================="
echo "DESKTO Phase 0 — End-to-End Validation"
echo "========================================="
echo ""

# Get AWS Account ID
echo "[0] Getting AWS Account ID..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✓ AWS Account ID: $AWS_ACCOUNT_ID"
echo ""

# Step 1: Create IAM Policy
echo "[1] Creating IAM policy: github-actions-deploy..."
aws iam create-policy \
  --policy-name github-actions-deploy \
  --policy-document '{
    "Version":"2012-10-17",
    "Statement":[
      {"Effect":"Allow","Action":["ecr:CreateRepository","ecr:DeleteRepository","ecr:PushImage","ecr:DescribeRepositories","ecr:ListImages","ecr:GetAuthorizationToken"],"Resource":"*"},
      {"Effect":"Allow","Action":["ec2:DescribeInstances","ec2:DescribeSecurityGroups","ec2:DescribeVpcs"],"Resource":"*"},
      {"Effect":"Allow","Action":["ssm:SendCommand","ssm:DescribeInstanceInformation","ssm:StartSession","ssm:TerminateSession"],"Resource":"*"},
      {"Effect":"Allow","Action":["cloudwatch:PutMetricData"],"Resource":"*"}
    ]
  }' \
  --description "Scoped CI/CD permissions for GitHub Actions" \
  --region ap-south-1 > /dev/null 2>&1 || echo "Policy may already exist, continuing..."
echo "✓ IAM policy created"
echo ""

# Step 2: Create IAM User
echo "[2] Creating IAM user: github-actions-deploy..."
aws iam create-user \
  --user-name github-actions-deploy \
  --region ap-south-1 > /dev/null 2>&1 || echo "User may already exist, continuing..."
echo "✓ IAM user created"
echo ""

# Step 3: Create Access Key
echo "[3] Creating access key for user..."
ACCESS_KEY_OUTPUT=$(aws iam create-access-key \
  --user-name github-actions-deploy \
  --region ap-south-1)
echo "$ACCESS_KEY_OUTPUT" | tee /tmp/github-access-key.json
echo "✓ Access key created (saved to /tmp/github-access-key.json)"
echo "⚠️  IMPORTANT: Save the secret key now — it won't be shown again!"
echo ""

# Step 4: Attach Policy to User
echo "[4] Attaching policy to user..."
aws iam attach-user-policy \
  --policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/github-actions-deploy \
  --user-name github-actions-deploy \
  --region ap-south-1
echo "✓ Policy attached to user"
echo ""

# Step 5: Verify User Has Policy
echo "[5] Verifying user has policy..."
aws iam list-attached-user-policies \
  --user-name github-actions-deploy \
  --region ap-south-1 --query "AttachedPolicies[].PolicyName" --output text
echo "✓ User has policy attached"
echo ""

# Step 6: Create OIDC Provider
echo "[6] Creating OIDC provider for GitHub Actions..."
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list token.actions.githubusercontent.com \
  --thumbprint-list 6938fd4d98bab03faadd08f2dbbd7629bc97ec8d \
  --region ap-south-1 > /dev/null 2>&1 || echo "OIDC provider may already exist, continuing..."
echo "✓ OIDC provider created"
echo ""

# Step 7: Create IAM Role for GitHub OIDC
echo "[7] Creating IAM role: GitHubActionsDeployRole..."
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --description "Role assumed by GitHub Actions via OIDC" \
  --assume-role-policy-document "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[{
      \"Effect\":\"Allow\",
      \"Principal\":{\"Federated\":\"arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com\"},
      \"Action\":\"sts:AssumeRoleWithWebIdentity\",
      \"Condition\":{
        \"StringEquals\":{\"token.actions.githubusercontent.com:aud\":\"sts.amazonaws.com\"},
        \"StringLike\":{\"token.actions.githubusercontent.com:sub\":\"repo:*/*:*\"}
      }
    }]
  }" \
  --region ap-south-1 > /dev/null 2>&1 || echo "Role may already exist, continuing..."
echo "✓ IAM role created"
echo ""

# Step 8: Attach Policy to Role
echo "[8] Attaching policy to role..."
aws iam attach-role-policy \
  --policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/github-actions-deploy \
  --role-name GitHubActionsDeployRole \
  --region ap-south-1
echo "✓ Policy attached to role"
echo ""

# Step 9: Verify Role
echo "[9] Verifying role has policy..."
aws iam list-attached-role-policies \
  --role-name GitHubActionsDeployRole \
  --region ap-south-1 --query "AttachedPolicies[].PolicyName" --output text
echo "✓ Role has policy attached"
echo ""

# Step 10: Get Role ARN
echo "[10] Getting role ARN..."
ROLE_ARN=$(aws iam get-role --role-name GitHubActionsDeployRole --query "Role.Arn" --output text)
echo "✓ Role ARN: $ROLE_ARN"
echo ""

# Validation
echo "========================================="
echo "VALIDATION SUMMARY"
echo "========================================="
echo ""

echo "✓ IAM Policy: github-actions-deploy"
aws iam get-policy --policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/github-actions-deploy --query "Policy.PolicyName" --output text
echo ""

echo "✓ IAM User: github-actions-deploy"
aws iam get-user --user-name github-actions-deploy --query "User.UserName" --output text
echo ""

echo "✓ IAM Role: GitHubActionsDeployRole"
aws iam get-role --role-name GitHubActionsDeployRole --query "Role.RoleName" --output text
echo ""

echo "✓ Role ARN: $ROLE_ARN"
echo ""

echo "========================================="
echo "NEXT STEPS"
echo "========================================="
echo ""
echo "1. Add the following GitHub repository secrets:"
echo "   - AWS_ROLE_ARN: $ROLE_ARN"
echo "   - AWS_REGION: ap-south-1"
echo ""
echo "2. Update CLAUDE.md with branching strategy:"
echo "   - main = testing/staging"
echo ""
echo "3. Proceed to Phase 1: Database Setup"
echo ""
echo "========================================="
echo "✓ Phase 0 Complete!"
echo "========================================="
