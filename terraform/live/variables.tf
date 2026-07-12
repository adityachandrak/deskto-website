variable "project_name" {
  type        = string
  description = "Project name"
  default     = "deskto-website"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
  default     = "production"
}

variable "region" {
  type        = string
  description = "AWS region"
  default     = "ap-south-1"
}

variable "app_port" {
  type        = number
  description = "Backend application port"
  default     = 3001
}

variable "backend_instance_type" {
  type        = string
  description = "Backend EC2 instance type"
  default     = "t4g.micro"
}

variable "ecr_repository_name" {
  type        = string
  description = "ECR repository name for backend image"
  default     = "deskto-backend"
}

variable "db_name" {
  type        = string
  description = "PostgreSQL database name"
  default     = "deskto_db"
}

variable "db_username" {
  type        = string
  description = "PostgreSQL master username"
  default     = "deskto_admin"
}

variable "acm_certificate_arn" {
  type        = string
  description = "Optional ACM certificate ARN for HTTPS listener. Leave empty to create HTTP listener only."
  default     = ""
}
