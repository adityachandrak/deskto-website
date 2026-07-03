# Terraform remote state backend
terraform {
  backend "s3" {
    bucket         = "deskto-website-terraform-state"
    key            = "deskto-website/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "deskto-website-terraform-lock"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  required_version = ">= 1.5.0"
}

# AWS provider
provider "aws" {
  region = "ap-south-1"

  default_tags {
    tags = {
      Project     = "deskto-website"
      Environment = "staging"
      ManagedBy   = "terraform"
    }
  }
}
