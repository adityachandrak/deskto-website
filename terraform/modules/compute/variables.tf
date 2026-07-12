variable "project_name" {
  type        = string
  description = "Project name prefix for resource naming"
  default     = "deskto-website"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
  default     = "production"
}

variable "subnet_id" {
  type        = string
  description = "Private subnet ID for backend EC2"
}

variable "security_group_id" {
  type        = string
  description = "Backend EC2 security group ID"
}

variable "instance_type" {
  type        = string
  description = "Backend EC2 instance type"
  default     = "t4g.micro"
}
