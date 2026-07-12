# DESKTO Phase 0 — Manual Execution Commands
# Run these commands on your local machine when AWS CLI is available

## Step 1 — Create IAM Policy (Required scoped permissions)
```bash
aws iam create-policy \
  --policy-name github-actions-deploy \
  --policy-document '{
    "Version":"2012-10-17",
    "Statement":[
      {
        "Effect":"Allow",
        "Action":[
          "ecr:CreateRepository",
          "ecr:DeleteRepository",
          "ecr:PushImage",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:GetAuthorizationToken"
        ],
        "Resource":"*"
      },
      {
        "Effect":"Allow",
        "Action":[
          "ec2:DescribeInstances",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeVpcs",
          "ec2:DescribeSubnets"
        ],
        "Resource":"*"
      },
      {
        "Effect":"Allow",
        "Action":[
          "ssm:SendCommand",
          "ssm:DescribeInstanceInformation",
          "ssm:StartSession",
          "ssm:TerminateSession"
        ],
        "Resource":"*",
        "Condition":{
          "StringEquals":{
            "ssm:ResourceTag/deskto":"true"
          }
        }
      },
      {
        "Effect":"Allow",
        "Action":"cloudwatch:PutMetricData",
        "Resource":"*"
      }
    ]
  }' \
  --description "Scoped permissions for GitHub Actions CI/CD deploy" \
  --region ap-south-1
```

## Step 2 — Create IAM User for CI
```bash
aws iam create-user \
  --user-name github-actions-deploy \
  --region ap-south-1

aws iam create-access-key \
  --user-name github-actions-deploy \
  --region ap-south-1 > github-access-key.json

aws iam attach-user-policy \
  --policy-arn arn:aws:iam::<AWS_ACCOUNT_ID>:policy/github-actions-deploy \
  --user-name github-actions-deploy \
  --region ap-south-1
```

## Step 3 — Create GitHub OIDC Identity Provider
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list token.actions.githubusercontent.com \
  --thumbprint-list 6938fd4d98bab03faadd08f2dbbd7629bc97ec8d \
  --region ap-south-1
```
Note: Save the thumbprint and URL for Step 4.

## Step 4 — Create IAM Role for GitHub OIDC
```bash
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            "token.actions.githubusercontent.com:sub": "repo:your-org/deskto-repo:*"
          }
        }
      }
    ]
  }' \
  --region ap-south-1

aws iam attach-role-policy \
  --policy-arn arn:aws:iam::<AWS_ACCOUNT_ID>:policy/github-actions-deploy \
  --role-name GitHubActionsDeployRole \
  --region ap-south-1
```

## Step 5 — Update EC2 Tags (Required for SSM policy)
```bash
aws ec2 create-tags \
  --resources i-0b652e38103c7635a \
  --tags Key=deskto,Value=true \
  --region ap-south-1
```

## Phase 0 Completion Validation
```bash
aws iam get-policy --policy-arn arn:aws:iam::<AWS_ACCOUNT_ID>:policy/github-actions-deploy --region ap-south-1
aws iam get-role --role-name GitHubActionsDeployRole --region ap-south-1
aws ec2 describe-tags --filters Name=resource-id,Values=i-0b652e38103c7635a Name=key,Values=deskto --region ap-south-1
```

## Step 6 — GitHub Repository Secrets
Settings → Secrets and variables → Actions → New repository secret:
- AWS_ROLE_ARN: arn:aws:iam::<AWS_ACCOUNT_ID>:role/GitHubActionsDeployRole
- AWS_REGION: ap-south-1
- GITHUB_TOKEN: (automatically provided by GitHub Actions)
