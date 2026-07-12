# DESKTO Phase 0 — Repo & Account Prep
# Execute these steps in order. Each step is independently verifiable.

## Prerequisites
- AWS account with admin/least-privilege access to create IAM entities
- GitHub repository access with admin permissions to set Actions secrets

## Step 1 — Create IAM Policy: github-actions-deploy
Create a scoped policy with only the permissions needed for CI/CD:
- ECR push for the Docker image
- EC2 describe to discover the instance / target group
- Optional: SSM Session Manager access (preferred over SSH)

## Step 2 — Create IAM User for CI
Create user: github-actions-deploy
Attach the policy from Step 1
Generate access key and secret access key

## Step 3 — Create AWS OIDC Identity Provider for GitHub Actions
Provider URL: sts.amazonaws.com
Audience: sts.amazonaws.com

## Step 4 — Create IAM Role for GitHub OIDC
Trusted entity: the OIDC provider from Step 3
Conditions:
  - StringEquals:
      sts:ExternalId: <your GitHub org/repo>
  - StringLike:
      token.actions.githubusercontent.com:sub: repo:<org>/<repo>:*
Attach the policy from Step 1
Note the role ARN — you will need it for Step 6

## Step 5 — Add GitHub Repository Secrets
Settings → Secrets and variables → Actions → New repository secret

Required secrets:
- AWS_ROLE_ARN: <role ARN from Step 4>
- AWS_REGION: ap-south-1
- EC2_SSH_PRIVATE_KEY: <SSH private key for EC2 — or use SSM instead>

Note: To avoid open port 22 entirely, prefer AWS SSM Session Manager.
If using SSM, store the EC2 instance ID and use aws ssm start-session from the GitHub runner.
You do not need EC2_SSH_PRIVATE_KEY in that case.

## Step 6 — Branching Strategy
Main branch = testing / staging deploy target
No production branch yet; site is still in testing phase.

## Step 7 — Create GitHub Actions Workflow
Create .github/workflows/deploy.yml in the repo with:
- Trigger: push to main
- Steps:
  - Checkout code
  - Configure AWS credentials via OIDC
  - Build Docker image
  - Push to ECR
  - Deploy to EC2 (via SSM or SSH)
  - Health check
