# Live Terraform Configuration - brings together all modules

# AWS Provider
provider "aws" {
  region = "ap-south-1"
}

# Network Module
module "network" {
  source       = "../modules/network"
  project_name = var.project_name
  region       = var.region
}

# Security Module
module "security" {
  source       = "../modules/security"
  project_name = var.project_name
  vpc_id       = module.network.vpc_id
}

# ECR Module (reuse the one we already created, or import it)
# For now, reference the existing ECR repo

# Compute Module
module "compute" {
  source            = "../modules/compute"
  project_name      = var.project_name
  subnet_id         = module.network.public_subnet_id
  security_group_id = module.security.web_security_group_id
}
