variable "project_name" {
  type        = string
  description = "Project name prefix for resource naming"
  default     = "deskto-website"
}

variable "subnet_id" {
  type        = string
  description = "Public subnet ID"
}

variable "security_group_id" {
  type        = string
  description = "Security group ID"
}
