#!/bin/bash
# Phase 3 & 4 Validation Script
# Run this to verify all Phase 3 & 4 setup is complete

set -e

echo "=========================================="
echo "PHASE 3 & 4 - VALIDATION REPORT"
echo "=========================================="
echo ""

echo "1. TERRAFORM BACKEND"
echo "   S3 Bucket: deskto-website-terraform-state"
aws s3 ls s3://deskto-website-terraform-state 2>/dev/null || echo "   ❌ Bucket not found"
echo ""
echo "   DynamoDB Table: deskto-website-terraform-lock"
aws dynamodb describe-table --table-name deskto-website-terraform-lock 2>/dev/null | jq -r '.Table | "   Status: \(.TableStatus), Items: \(.ItemCount)"' || echo "   ❌ Table not found"
echo ""

echo "2. TERRAFORM MODULES"
cd terraform/live && terraform fmt -recursive -check=true && echo "   ✅ Terraform format valid" || echo "   ❌ Format issues detected"
terraform validate 2>/dev/null && echo "   ✅ Terraform configuration valid" || echo "   ❌ Validation failed"
cd ../..
echo ""

echo "3. TERRAFORM PLAN RESOURCES"
cd terraform/live && RESOURCES=$(terraform plan -no-color 2>/dev/null | grep -c "to add" || echo "0")
echo "   Resources to create: ${RESOURCES}"
cd ../..
echo ""

echo "4. TERRAFORM MODULE STRUCTURE"
echo "   Network module:"
ls -1 terraform/modules/network/*.tf 2>/dev/null | sed 's/^/   - /' || echo "   ❌ Not found"
echo "   Security module:"
ls -1 terraform/modules/security/*.tf 2>/dev/null | sed 's/^/   - /' || echo "   ❌ Not found"
echo "   Compute module:"
ls -1 terraform/modules/compute/*.tf 2>/dev/null | sed 's/^/   - /' || echo "   ❌ Not found"
echo ""

echo "5. TERRAFORM OUTPUTS"
cd terraform/live && terraform output -json 2>/dev/null | jq -r 'keys | .[]' | sed 's/^/   - /' || echo "   ❌ No outputs defined (run terraform apply first)"
cd ../..
echo ""

echo "6. ANSIBLE INVENTORY"
echo "   Inventory files:"
ls -1 ansible/inventory/*.yml 2>/dev/null | sed 's/^/   - /' || echo "   ❌ No inventory found"
echo ""

echo "7. ANSIBLE PLAYBOOKS"
echo "   Bootstrap playbook:"
ls -1 ansible/playbooks/bootstrap.yml 2>/dev/null | sed 's/^/   - /' || echo "   ❌ Not found"
echo "   Deploy playbook:"
ls -1 ansible/playbooks/deploy.yml 2>/dev/null | sed 's/^/   - /' || echo "   ❌ Not found"
echo ""

echo "8. SCRIPTS"
echo "   Inventory generation:"
ls -1 scripts/generate-inventory.sh 2>/dev/null | sed 's/^/   - /' || echo "   ❌ Not found"
chmod +x scripts/generate-inventory.sh 2>/dev/null
echo ""

echo "=========================================="
echo "VALIDATION COMPLETE"
echo "=========================================="
echo ""
echo "NEXT STEPS:"
echo "1. Run terraform apply (manually review plan first):"
echo "   cd terraform/live"
echo "   terraform plan"
echo "   terraform apply"
echo ""
echo "2. Generate Ansible inventory:"
echo "   ./scripts/generate-inventory.sh"
echo ""
echo "3. Run bootstrap playbook (once per new instance):"
echo "   ansible-playbook -i ansible/inventory/generated.yml ansible/playbooks/bootstrap.yml"
echo ""
echo "4. Run deploy playbook (for each release):"
echo "   ECR_PASSWORD=\$(aws ecr get-login-password --region ap-south-1) \\"
echo "   ansible-playbook -i ansible/inventory/generated.yml ansible/playbooks/deploy.yml"
