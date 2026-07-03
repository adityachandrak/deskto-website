# Outputs from Terraform - feed Ansible inventory and GitHub Actions

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = module.compute.instance_id
}

output "ec2_public_ip" {
  description = "EC2 public IP address"
  value       = module.compute.public_ip
}

output "ec2_public_dns" {
  description = "EC2 public DNS name"
  value       = module.compute.public_dns
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.network.vpc_id
}

output "public_subnet_id" {
  description = "Public subnet ID"
  value       = module.network.public_subnet_id
}

output "security_group_id" {
  description = "Security group ID"
  value       = module.security.web_security_group_id
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = "898322960338.dkr.ecr.ap-south-1.amazonaws.com/deskto-web"
}

output "ansible_inventory" {
  description = "Ansible inventory from Terraform output"
  value = {
    webservers = {
      hosts = {
        web = {
          ansible_host            = module.compute.public_ip
          ansible_user            = "ec2-user"
          ansible_connection      = "ssm"
          ansible_ssh_common_args = "-o StrictHostKeyChecking=no"
        }
      }
    }
  }
}
