variable "project_name" {
  type        = string
  description = "Project name prefix for resource naming"
  default     = "deskto-website"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID for security group"
}
