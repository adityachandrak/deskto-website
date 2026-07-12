# Database Module Variables

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "vpc_id" {
  description = "VPC ID to deploy RDS in"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for DB subnet group"
  type        = list(string)
}

variable "ec2_security_group_id" {
  description = "EC2 security group ID to allow access from"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "deskto_db"
}

variable "db_username" {
  description = "Master database username"
  type        = string
  default     = "deskto_admin"
}

# No password variable - generated randomly for security
