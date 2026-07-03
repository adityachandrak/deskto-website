#!/bin/bash
# Generate Ansible inventory from Terraform output
# Usage: ./scripts/generate-inventory.sh

set -e

echo "Generating Ansible inventory from Terraform output..."

cd terraform/live

# Get the public IP from Terraform output
EC2_PUBLIC_IP=$(terraform output -raw ec2_public_ip 2>/dev/null || echo "")

if [ -z "$EC2_PUBLIC_IP" ]; then
  echo "❌ Error: Could not get EC2 public IP from Terraform output."
  echo "   Make sure you've run 'terraform apply' first."
  exit 1
fi

# Generate inventory file
cat > ../../ansible/inventory/generated.yml <<EOF
---
webservers:
  hosts:
    web:
      ansible_host: ${EC2_PUBLIC_IP}
      ansible_user: ec2-user
      ansible_connection: ssm
      ansible_ssh_common_args: "-o StrictHostKeyChecking=no"
      ansible_python_interpreter: /usr/bin/python3
  vars:
    project_name: deskto-website
    region: ap-south-1
    ecr_repo_url: 898322960338.dkr.ecr.ap-south-1.amazonaws.com/deskto-web
    ansible_host: ${EC2_PUBLIC_IP}
EOF

cd ../..

echo "✅ Inventory generated: ansible/inventory/generated.yml"
echo "   Host: ${EC2_PUBLIC_IP}"
echo ""
echo "You can now run Ansible playbooks:"
echo "  ansible-playbook -i ansible/inventory/generated.yml ansible/playbooks/bootstrap.yml"
echo "  ansible-playbook -i ansible/inventory/generated.yml ansible/playbooks/deploy.yml"
