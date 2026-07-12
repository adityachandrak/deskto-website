variable "project_name" {
  type        = string
  description = "Project name prefix for resource naming"
  default     = "deskto-website"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID for security group"
}

variable "app_port" {
  type        = number
  description = "Backend application port"
  default     = 3001
}
