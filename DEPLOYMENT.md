# Deskto Website - Complete CI/CD Setup Summary

**Repository:** https://github.com/adityachandrak/deskto-website
**AWS Account:** 898322960338
**Region:** ap-south-1 (Mumbai)
**Branching:** `main` = testing/staging

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                CI/CD PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GitHub Push to main                                                        │
│       │                                                                     │
│       ▼                                                                     │
│  ┌──────────────────┐                                                       │
│  │   build-test     │  npm ci → validate:catalog → validate:auth → build   │
│  └────────┬─────────┘                                                       │
│           │ (needs: success)                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │     docker       │  Build → ECR push :sha-<sha> + :latest               │
│  └────────┬─────────┘                                                       │
│           │ (needs: success)                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │     deploy       │  OIDC → Ansible deploy.yml → docker compose up -d     │
│  └────────┬─────────┘                                                       │
│           │ (success)                                                        │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │   smoke-test     │  curl localhost → HTTP 200 + content marker           │
│  └──────────────────┘                                                       │
│                                                                             │
│  Concurrency: group deploy-main → cancel-in-progress                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS INFRASTRUCTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│  │    VPC      │    │  SG (web)   │    │    EIP      │                    │
│  │10.0.0.0/16  │    │80/443 only   │    │ (Elastic)   │                    │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                    │
│         │                  │                   │                           │
│         │         ┌────────▼───────────────────▼──────┐                   │
│         │         │        EC2 t4g.micro              │                   │
│         └────────▶│  (Graviton ARM, gp3 20GB)         │                   │
│                   │  IAM Role: EC2ContainerRegistry   │                   │
│                   │             ReadOnly + SSM        │                   │
│                   │  Docker CE + SSM Agent             │                   │
│                   └────────────────────────────────────┘                   │
│                                    │                                       │
│                                    ▼                                       │
│                         ┌──────────────────┐                               │
│                         │   deskto-web     │                               │
│                         │   (ECR Private)  │                               │
│                         │  Lifecycle: 14d  │                               │
│                         │  untagged, 90d   │                               │
│                         │  any             │                               │
│                         └──────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DEPLOYMENT                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Bootstrap (once): Install Docker, deploy user, CloudWatch               │
│  2. Deploy (each release): ECR login → pull sha-<sha> → compose up -d       │
│  3. Health Check: curl http://localhost/ → HTTP 200                          │
│  4. Auto-Rollback: on failure → switch to :latest                             │
│  5. Idempotent: safe re-run on every deploy                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0 — Repo & Account Prep ✅

| Item | Status | Details |
|------|--------|---------|
| **GitHub Repo** | ✅ Created | `adityachandrak/deskto-website` (public) |
| **Branch** | ✅ Configured | `main` = testing/staging target |
| **Git Status** | ✅ Clean | All committed to main |
| **AWS Account** | ✅ Connected | 898322960338 (ap-south-1) |
| **IAM User** | ✅ Created | `github-actions-deploy` with scoped policies |
| **IAM Role** | ✅ Created | `github-actions-deploy-role` with OIDC trust |
| **OIDC Provider** | ✅ Exists | `token.actions.githubusercontent.com` |
| **GitHub Secrets** | ✅ Set | `AWS_ROLE_ARN`, `AWS_REGION` |
| **SSH/Port 22** | ✅ Not needed | Using SSM Session Manager |

**Files:** [`.github/workflows/`](.github/workflows/ci-cd.yml), [`scripts/validate-setup.sh`](scripts/validate-setup.sh)

---

## Phase 1 — Containerize (Docker) ✅

### Dockerfile
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf Highlights
- SPA fallback: `try_files $uri /index.html`
- Gzip compression: `gzip on` for text assets
- Cache headers: `expires 1y, immutable` for hashed assets
- API proxy: `/api/` → `localhost:3001`

### .dockerignore
```
node_modules, dist, .git, .env, .env.local, .DS_Store, *.log, .vscode, .idea
```

### Validation Results
| Step | Result |
|------|--------|
| `docker build -t deskto-website:test .` | ✅ Built successfully |
| `docker run -d -p 8080:80` | ✅ Container running |
| `curl localhost:8080` | ✅ HTTP 200, `index.html` + `index.js` + `index.css` |

**Files:** [`Dockerfile`](Dockerfile), [`nginx.conf`](nginx.conf), [`.dockerignore`](.dockerignore)

---

## Phase 2 — Amazon ECR ✅

| Item | Details |
|------|---------|
| **Repository** | `deskto-web` |
| **URI** | `898322960338.dkr.ecr.ap-south-1.amazonaws.com/deskto-web` |
| **Visibility** | Private |
| **Scan on Push** | Enabled |
| **Encryption** | AES256 |

### Lifecycle Policy
| Rule | Action |
|------|--------|
| Untagged images, >14 days | Expire |
| Any images, >90 days | Expire |

### Image Tagging Strategy
| Tag | When | Purpose |
|-----|------|---------|
| `:sha-7a5d2dc1` | Every build | Immutable — instant rollback target |
| `:latest` | After successful deploy | Running version indicator |

**Test Push:** ✅ Both `:sha-7a5d2dc1` and `:latest` pushed successfully

**Files:** [`scripts/ecr-login.sh`](scripts/ecr-login.sh), [`scripts/build-and-push.sh`](scripts/build-and-push.sh), [`scripts/ecr-lifecycle-policy.json`](scripts/ecr-lifecycle-policy.json)

---

## Phase 3 — Terraform (Infrastructure) ✅

### Remote State
| Resource | Details |
|----------|---------|
| **S3 Bucket** | `deskto-website-terraform-state` (versioning + encryption) |
| **DynamoDB Table** | `deskto-website-terraform-lock` (ACTIVE) |

### Network Module
```hcl
VPC:    10.0.0.0/16
Subnet: 10.0.1.0/24 (ap-south-1a, public, map_public_ip)
IGW:    Yes, attached to VPC
Routes: 0.0.0.0/0 → IGW
```

### Security Module
| Rule | From | To |
|------|------|-----|
| HTTP | 0.0.0.0/0 | :80 |
| HTTPS | 0.0.0.0/0 | :443 |
| **SSH (22)** | **—** | **—** |

### Compute Module
| Item | Details |
|------|---------|
| **Type** | `t4g.micro` (Graviton ARM, ~$3.50/mo) |
| **AMI** | Amazon Linux 2023 (arm64) |
| **Volume** | 20GB gp3 (delete on termination) |
| **IAM Role** | `deskto-website-instance-role` |
| **Policies** | `AmazonSSMManagedInstanceCore`, `AmazonEC2ContainerRegistryReadOnly` |
| **User Data** | Install Docker CE + enable SSM agent |

### Terraform Plan
```
Plan: 12 to add, 0 to change, 0 to destroy
Resources: VPC, Subnet, IGW, Route Table, Route Table Assoc, SG, EC2, EIP, IAM Role, IAM Profile, Policy Attachment x2
```

**Files:** [`terraform/main.tf`](terraform/main.tf), [`terraform/live/`](terraform/live/main.tf), [`terraform/modules/`](terraform/modules/network/main.tf)

---

## Phase 4 — Ansible (Configuration + Deploy) ✅

### Inventory Generation
```bash
# From Terraform output
terraform output -json ansible_inventory
# Or run helper script
./scripts/generate-inventory.sh
```

### Bootstrap Playbook (`bootstrap.yml`)
| Task | Action |
|------|--------|
| Install Docker CE | `yum` install + `docker-compose-plugin` |
| Create deploy user | Non-root, docker group access |
| Unattended security updates | `yum-cron` with security-only mode |
| CloudWatch Agent | Download RPM, install, configure |
| Log rotation | `/etc/logrotate.d/docker-containers` |
| Generate facts | `/etc/deskto-website/ansible-facts.yml` |

### Deploy Playbook (`deploy.yml`)
| Step | Action |
|------|--------|
| 1 | ECR login via `ECR_PASSWORD` env var |
| 2 | Pull `:sha-<gitsha>` image from ECR |
| 3 | Generate `docker-compose.yml` dynamically |
| 4 | `docker compose up -d` (idempotent) |
| 5 | Health check: `curl localhost/` |
| 6 | **Auto-rollback** on failure → `:latest` |

### Idempotency Guarantees
- Re-running bootstrap is safe (all tasks are idempotent)
- Re-running deploy pulls the latest image and restarts cleanly

**Files:** [`ansible/inventory/`](ansible/inventory/hosts.yml), [`ansible/playbooks/bootstrap.yml`](ansible/playbooks/bootstrap.yml), [`ansible/playbooks/deploy.yml`](ansible/playbooks/deploy.yml)

---

## Phase 5 — CI/CD (GitHub Actions) ✅

### Workflow 1: CI/CD (`ci-cd.yml`)

```yaml
Trigger: push to main + manual workflow_dispatch
Concurrency: group: deploy-${{ github.ref }}, cancel-in-progress: true
```

| Job | Steps | Needs |
|-----|-------|-------|
| **build-test** | npm ci → validate:catalog → validate:auth → vite build | — |
| **docker** | Build → ECR login → Push `:sha-<sha>` + `:latest` | build-test |
| **deploy** | OIDC → EC2 describe → Ansible deploy.yml → health wait | build-test, docker |
| **smoke-test** | `curl /` → HTTP 200 + content marker | deploy |

### Workflow 2: Terraform (`terraform.yml`)

```yaml
Trigger: workflow_dispatch (manual) + PR plan comments
Concurrency: group: terraform-${{ github.ref }}, cancel-in-progress: true
```

| Job | Steps | Trigger |
|-----|-------|---------|
| **terraform** | init → fmt → validate → plan → (manual) apply | Manual only |

### Security Model
| Aspect | Implementation |
|--------|---------------|
| **Auth** | OIDC (`aws-actions/configure-aws-credentials@v4`) |
| **No long-lived keys** | ✅ No EC2_SSH_PRIVATE_KEY needed |
| **Secrets** | `AWS_ROLE_ARN`, `AWS_REGION` only |
| **Permissions** | `id-token: write`, `contents: read` (least privilege) |
| **Port 22** | Closed — SSM only |

**Files:** [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml), [`.github/workflows/terraform.yml`](.github/workflows/terraform.yml), [`scripts/validate-phase5.sh`](scripts/validate-phase5.sh)

---

## Remaining Manual Steps

### Step 1: Create Infrastructure
```bash
cd terraform/live
terraform plan
terraform apply
```
Expected: Creates VPC, EC2, EIP, IAM role (~3-5 min)

### Step 2: Bootstrap EC2
```bash
./scripts/generate-inventory.sh
ansible-playbook -i ansible/inventory/generated.yml ansible/playbooks/bootstrap.yml
```
Expected: Installs Docker, deploy user, CloudWatch, security updates

### Step 3: Push to GitHub (Triggers CI/CD)
```bash
git push origin main
```
Expected: GitHub Actions runs build → docker → deploy → smoke-test automatically

---

## File Structure

```
.
├── .github/
│   └── workflows/
│       ├── ci-cd.yml          # Build → Test → Docker → Deploy → Smoke Test
│       └── terraform.yml      # Manual Terraform plan/apply
├── ansible/
│   ├── inventory/
│   │   ├── hosts.yml          # Static inventory
│   │   └── template.yml       # Inventory template
│   └── playbooks/
│       ├── bootstrap.yml      # One-time EC2 setup
│       └── deploy.yml         # Deploy with health check + rollback
├── terraform/
│   ├── main.tf                # Remote state backend
│   ├── live/
│   │   ├── main.tf            # Module composition
│   │   ├── variables.tf
│   │   ├── outputs.tf         # EC2 IP, ECR URL, Ansible inventory
│   │   └── backend.tf
│   └── modules/
│       ├── network/           # VPC, subnet, IGW, routes
│       ├── security/          # SG 80/443, no SSH
│       ├── compute/           # EC2 t4g.micro, IAM, EIP
│       └── ecr/               # deskto-web + lifecycle policy
├── scripts/
│   ├── validate-all-phases.sh # Comprehensive validation
│   ├── validate-setup.sh      # Phase 0
│   ├── validate-phase1-2.sh   # Docker + ECR
│   ├── validate-phase3-4.sh   # Terraform + Ansible
│   ├── validate-phase5.sh     # GitHub Actions
│   ├── generate-inventory.sh  # From Terraform → Ansible
│   ├── ecr-login.sh           # ECR auth helper
│   ├── build-and-push.sh      # Manual build & push
│   ├── github-actions-policy.json
│   └── github-actions-trust-policy.json
├── Dockerfile                 # Multi-stage build
├── nginx.conf                 # SPA config
├── .dockerignore              # Exclusions
└── .gitignore                 # Sensitive file exclusions
```

---

## Cost Estimate (Monthly)

| Resource | Type | Cost |
|----------|------|------|
| EC2 | t4g.micro (Graviton) | ~$3.50 |
| EIP | Static IP | ~$3.60 |
| ECR | Storage | ~$1.00 |
| S3 | Terraform state | ~$0.05 |
| DynamoDB | Lock table | ~$0.25 |
| **Total** | | **~$8.40/mo** |

---

## Quick Commands Reference

```bash
# Validate everything
./scripts/validate-all-phases.sh

# Terraform
cd terraform/live && terraform plan && terraform apply

# Ansible
./scripts/generate-inventory.sh
ansible-playbook -i ansible/inventory/generated.yml ansible/playbooks/bootstrap.yml
ansible-playbook -i ansible/inventory/generated.yml ansible/playbooks/deploy.yml

# Manual Docker/ECR
./scripts/ecr-login.sh
./scripts/build-and-push.sh $(git rev-parse --short HEAD)

# Check EC2
aws ec2 describe-instances --filters "Name=tag:Name,Values=deskto-website-web"

# Smoke test after deploy
curl http://<EC2_IP>/
```

---

**Last Updated:** 2026-07-04
**Deployed By:** GitHub Actions CI/CD
**Status:** Ready for Phase 6 (terraform apply → bootstrap → first deploy)
