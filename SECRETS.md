# Deskto Website - Secrets & Configuration Management

This document outlines the secrets and configuration management strategy for the Deskto Website.

## Philosophy

**Zero Secrets in Repository** - Our security principle is to ensure no secrets or credentials are ever committed to the git repository. All sensitive information is managed through external, secure mechanisms.

---

## 1. CI-Time Secrets (GitHub Actions)

### Purpose
Secrets required during CI/CD pipeline execution (building, testing, deploying).

### Mechanism
**GitHub Repository Secrets** - Stored in GitHub repository settings.

| Secret Name | Description | Source | Usage |
|-------------|-------------|---------|-------|
| `AWS_ROLE_ARN` | OIDC role ARN for GitHub Actions to assume | IAM console | CI/CD workflows |
| `AWS_REGION` | AWS region for infrastructure | User preference | All AWS operations |

### Validation
```bash
# Check GitHub secrets
gh secret list --repo adityachandrak/deskto-website

# Check usage in workflows
grep -r "secrets\.AWS_" .github/workflows/
```

### Security
- ✅ Secrets never leave GitHub
- ✅ OIDC minimizes AWS permissions
- ✅ Secrets not visible in workflow logs
- ✅ Automatic rotation on secret updates

---

## 2. Runtime Secrets (AWS SSM Parameter Store)

### Purpose
Secrets required during application runtime (database credentials, API keys, etc.).

### Mechanism
**AWS SSM Parameter Store** - Serverless, cost-effective, tiered storage.

#### Parameter Hierarchy
```
/deskto-website/
├── deploy/                    # Deployment-time secrets
│   ├── username = "deploy"
│   └── region = "ap-south-1"
├── staging/                  # Environment-specific secrets
│   └── database-url = "postgresql://..." (SecureString)
└── production/               # Future production secrets
    └── api-keys = [...] (SecureString)
```

#### Types
| Type | Description | Cost | Use Case |
|------|-------------|------|----------|
| `String` | Plaintext text | $0.01/million requests | Usernames, regions, config |
| `SecureString` | Encrypted with KMS | $0.015/million requests | API keys, passwords, URLs |

#### Examples
```bash
# Store parameter (admin only)
aws ssm put-parameter \
  --name "/deskto-website/staging/database-url" \
  --value "postgresql://user:pass@host:port/db" \
  --type "SecureString" \
  --region ap-south-1

# Retrieve parameter (EC2 instance only)
aws ssm get-parameter \
  --name "/deskto-website/deploy/username" \
  --query "Parameter.Value" \
  --output text \
  --region ap-south-1
```

### Advantages vs Secrets Manager
- **Cost**: 10x cheaper at this scale
- **Simplicity**: No KMS costs for tier 1
- **Integration**: Native AWS support in EC2/Lambda
- **Simplicity**: Easier environment management

---

## 3. Current Secret Architecture

### CI/CD Pipeline Secrets
```yaml
# .github/workflows/ci-cd.yml
jobs:
  deploy:
    steps:
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ secrets.AWS_REGION }}
```

### Runtime Secrets Access
```javascript
// Future application code
const AWS = require('aws-sdk');
const ssm = new AWS.SSM({ region: 'ap-south-1' });

async function getSecret(path) {
  const param = await ssm.getParameter({
    Name: path,
    WithDecryption: true // Required for SecureString
  }).promise();
  return param.Parameter.Value;
}

// Example usage
const dbUrl = await getSecret('/deskto-website/staging/database-url');
```

---

## 4. Security Validation

### Repository Scanning
All files scanned for:
- Hardcoded credentials
- API keys
- AWS access keys
- Passwords

Validation commands:
```bash
# Scan source files
grep -r "password\|secret\|api[_-]key" src/

# Check for AWS keys
grep -r "AKIA\|ASIA" .

# Validate gitignore
cat .gitignore | grep -E "env|secret|key"

# Check for env files
find . -name ".env*" -o -name "credentials*"
```

### Access Control
- **GitHub Secrets**: Repository-scoped, per-workflow
- **SSM Parameters**: IAM role-scoped (EC2 only)
- **IAM Roles**: Least privilege for GitHub Actions role

### Audit Trail
- GitHub secret access logged in GitHub audit
- SSM parameter access logged in CloudTrail
- Terraform state encrypted and versioned

---

## 5. Future Enhancement Path

### Scale Considerations
1. **SSM Hierarchical Parameter Groups**
   - Better organization for large deployments
   - Tag-based access control

2. **KMS Integration**
   - Central key management
   - Cross-account access

3. **Parameter Rotation**
   - Automatic key rotation
   - Certificate renewal

### Security Hardening
1. **Secrets Manager Migration**
   - When scale exceeds SSM cost efficiency
   - Need for more advanced features

2. **CloudWatch Alarms**
   - Unauthorized access attempts
   - Parameter access patterns

3. **Parameter Validation**
   - Schema validation for new parameters
   - Approval workflow for production updates

---

## 6. Cost Analysis

### Current SSM Usage
```
3 parameters:
- 2x String: $0.01/million requests = $0.02/month
- 1x SecureString: $0.015/million requests = $0.03/month
Total: ~$0.05/month
```

### Scaling Projections
| Scale | SSM Cost | Secrets Manager Cost | Savings |
|-------|----------|---------------------|---------|
| 100 req/day | $1.50/month | $15/month | 10x |
| 1000 req/day | $15/month | $150/month | 10x |

---

## 7. Best Practices

### For Developers
1. **Never commit credentials** - Use `git add -p` to avoid staging secrets
2. **Use environment-specific paths** - `/staging/`, `/production/`
3. **SecureString for sensitive data** - Passwords, API keys, URLs
4. **Regular secret audits** - Quarterly review of parameter store

### For Ops
1. **IAM role least privilege** - Restrict EC2 instance roles to only necessary parameters
2. **Parameter naming conventions** - Hierarchical and descriptive
3. **Regular rotation** - Update database passwords quarterly
4. **Monitoring setup** - CloudTrail logging for parameter access

### For Security
1. **Regular scans** - Automated secret scanning in PRs
2. **Access review** - Quarterly review of GitHub repository secrets
3. **Emergency procedures** - Secret revocation and key rotation processes

---

## 8. Emergency Procedures

### Secret Compromise
1. **GitHub Secrets**: Rotate immediately in repository settings
2. **SSM Parameters**: Create new parameters, update IAM roles
3. **CI/CD**: Temporarily disable workflows during rotation

### Access Revocation
```bash
# Revoke all access to a parameter
aws ssm delete-parameter \
  --name "/deskto-website/staging/database-url" \
  --region ap-south-1

# Revoke GitHub secret
# Update in GitHub repo settings → Secrets → Actions
```

### Recovery
1. **Backup parameters regularly**:
```bash
aws ssm get-parameters-by-path \
  --path "/deskto-website/" \
  --region ap-south-1 \
  --query "Parameters" > backup.json
```

---

## Validation Checklist

- [x] No secrets in repository (scanned)
- [x] GitHub Actions secrets configured
- [x] SSM Parameter Store setup
- [x] Documentation created
- [x] Cost analysis documented
- [x] Emergency procedures documented
- [x] Access controls validated

**Last Updated:** 2026-07-04
**Responsible:** Claude
**Review Date:** 2026-10-04