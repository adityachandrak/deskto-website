# DESKTO — Phase 0: End-to-End Execution Plan & Validation

## ✅ What Needs to Happen

```
[1] Create IAM policy   (github-actions-deploy)       ~1 min
[2] Create IAM user     (github-actions-deploy)       ~1 min
[3] Attach policy to user                                <1 min
[4] Create OIDC provider (GitHub → AWS)                ~1 min
[5] Create IAM role     (GitHubActionsDeployRole)      ~1 min
[6] Attach policy to role                               <1 min
[7] Add repo secrets    (AWS_ROLE_ARN, AWS_REGION)    ~2 min
[8] Document branching   in CLAUDE.md                  ~1 min
```

## Commands to Execute (copy-paste into terminal)

### [1] Create IAM Policy

```bash
aws iam create-policy \
  --policy-name github-actions-deploy \
  --policy-document '{
    "Version":"2012-10-17",
    "Statement":[
      {"Effect":"Allow","Action":["ecr:CreateRepository","ecr:DeleteRepository","ecr:PushImage","ecr:DescribeRepositories","ecr:ListImages","ecr:GetAuthorizationToken"],"Resource":"*"},
      {"Effect":"Allow","Action":["ec2:DescribeInstances","ec2:DescribeSecurityGroups","ec2:DescribeVpcs","ec2:DescribeSubnets"],"Resource":"*"},
      {"Effect":"Allow","Action":["ssm:SendCommand","ssm:DescribeInstanceInformation","ssm:StartSession","ssm:TerminateSession"],"Resource":"*"},
      {"Effect":"Allow","Action":["cloudwatch:PutMetricData"],"Resource":"*"}
    ]
  }' \
  --description "Scoped CI/CD permissions for GitHub Actions" \
  --region ap-south-1
```

**Expected output:** `Policy` object with `Arn`. Copy the ARN for Step [3].

### [2] Create IAM User

```bash
aws iam create-user \
  --user-name github-actions-deploy \
  --region ap-south-1
```

**Expected output:** `User` object with `UserId`, `Arn`.

### [3] Create Access Key

```bash
aws iam create-access-key \
  --user-name github-actions-deploy \
  --region ap-south-1
```

**Expected output:** `AccessKey` with `AccessKeyId` and `SecretAccessKey`.
⚠️ **Save the secret now** — it won't be shown again.

### [4] Attach Policy to User

```bash
# Replace <ACCOUNT_ID> with your AWS account ID
aws iam attach-user-policy \
  --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/github-actions-deploy \
  --user-name github-actions-deploy \
  --region ap-south-1
```

**Expected output:** Empty (success).

### [5] Verify User Has Policy

```bash
aws iam list-attached-user-policies \
  --user-name github-actions-deploy \
  --region ap-south-1
```

**Expected output:** Shows `github-actions-deploy` policy in `AttachedPolicies`.

---

### [6] Create OIDC Provider

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list token.actions.githubusercontent.com \
  --thumbprint-list 6938fd4d98bab03faadd08f2dbbd7629bc97ec8d \
  --region ap-south-1
```

**Expected output:** `OpenIDConnectProviderArn` — save this.

### [7] Create IAM Role for GitHub OIDC

```bash
# Replace <ACCOUNT_ID> and <GH_ORG_OR_USER> below
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --description "Role assumed by GitHub Actions via OIDC" \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Principal":{"Federated":"arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"},
      "Action":"sts:AssumeRoleWithWebIdentity",
      "Condition":{
        "StringEquals":{
          "token.actions.githubusercontent.com:aud":"sts.amazonaws.com"
        },
        "StringLike":{
          "token.actions.githubusercontent.com:sub":"repo:<GH_ORG_OR_USER>/deskto-website:*"
        }
      }
    }]
  }' \
  --region ap-south-1
```

**Expected output:** `Role` with `Arn`. Copy the full ARN.

### [8] Attach Policy to Role

```bash
aws iam attach-role-policy \
  --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/github-actions-deploy \
  --role-name GitHubActionsDeployRole \
  --region ap-south-1
```

**Expected output:** Empty (success).

### [9] Verify Role

```bash
aws iam list-attached-role-policies \
  --role-name GitHubActionsDeployRole \
  --region ap-south-1
```

**Expected output:** Shows `github-actions-deploy` policy attached.

---

### [10] Add GitHub Repository Secrets

Go to: **GitHub → Your Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name          | Value                                                  |
|----------------------|--------------------------------------------------------|
| `AWS_ROLE_ARN`       | `arn:aws:iam::<ACCOUNT_ID>:role/GitHubActionsDeployRole` |
| `AWS_REGION`         | `ap-south-1`                                           |
| `EC2_SSH_PRIVATE_KEY`| *(Optional — use SSM instead for no open port 22)*    |

### [11] Branching Decision

| Branch  | Purpose            |
|---------|--------------------|
| `main`  | Testing / staging  |
| *(none)*| No prod branch yet |

Add to `CLAUDE.md`:
```md
## Branching Strategy
- `main` = testing/staging deploy target
- No production branch (site is still in testing phase)
```

---

## ✅ Validation Checklist

- [ ] `aws iam get-policy --policy-arn <ARN>` → `github-actions-deploy` exists
- [ ] `aws iam list-attached-user-policies --user-name github-actions-deploy` → shows policy
- [ ] `aws iam get-role --role-name GitHubActionsDeployRole` → role exists
- [ ] `aws iam list-attached-role-policies --role-name GitHubActionsDeployRole` → shows policy
- [ ] GitHub repo has secret `AWS_ROLE_ARN`
- [ ] GitHub repo has secret `AWS_REGION`
- [ ] `CLAUDE.md` updated with branching strategy
