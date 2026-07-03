variable "project_name" {
  type        = string
  description = "Project name prefix for resource naming"
  default     = "deskto-website"
}

variable "region" {
  type        = string
  description = "AWS region for deployment"
  default     = "ap-south-1"
}
