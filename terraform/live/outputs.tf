output "vpc_id" {
  description = "VPC ID"
  value       = module.network.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs for ALB"
  value       = module.network.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs for backend and database"
  value       = module.network.private_subnet_ids
}

output "nat_gateway_id" {
  description = "NAT Gateway ID for private backend outbound access"
  value       = module.network.nat_gateway_id
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.backend.dns_name
}

output "alb_zone_id" {
  description = "Application Load Balancer Route53 zone ID"
  value       = aws_lb.backend.zone_id
}

output "backend_target_group_arn" {
  description = "Backend target group ARN"
  value       = aws_lb_target_group.backend.arn
}

output "backend_health_check_path" {
  description = "Backend ALB target group health check path"
  value       = "/health"
}

output "ec2_instance_id" {
  description = "Backend EC2 instance ID"
  value       = module.compute.instance_id
}

output "ec2_private_ip" {
  description = "Backend EC2 private IP"
  value       = module.compute.private_ip
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = module.ecr.ecr_repository_url
}

output "db_instance_id" {
  description = "RDS instance identifier"
  value       = module.database.db_instance_id
}

output "db_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = module.database.db_instance_endpoint
}

output "db_name" {
  description = "Database name"
  value       = module.database.db_name
}

output "db_username" {
  description = "Database master username"
  value       = module.database.db_username
}

output "database_url_parameter" {
  description = "SSM SecureString parameter name for database URL"
  value       = module.database.database_url_parameter
}

output "database_host_parameter" {
  description = "SSM parameter name for database host"
  value       = module.database.database_host_parameter
}

output "database_port_parameter" {
  description = "SSM parameter name for database port"
  value       = module.database.database_port_parameter
}

output "database_name_parameter" {
  description = "SSM parameter name for database name"
  value       = module.database.database_name_parameter
}

output "database_user_parameter" {
  description = "SSM parameter name for database user"
  value       = module.database.database_user_parameter
}

output "database_password_parameter" {
  description = "SSM SecureString parameter name for database password"
  value       = module.database.database_password_parameter
}

output "jwt_secret_parameter" {
  description = "SSM SecureString parameter name for JWT secret"
  value       = module.database.jwt_secret_parameter
}

output "ansible_inventory" {
  description = "Ansible inventory for private backend host via SSM"
  value = {
    webservers = {
      hosts = {
        backend = {
          ansible_connection     = "aws_ssm"
          ansible_host           = module.compute.instance_id
          ansible_user           = "ec2-user"
          ansible_aws_ssm_region = var.region
        }
      }
    }
  }
}
