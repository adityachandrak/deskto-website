# ECR Module

variable "project_name" {
  type        = string
  description = "Project name"
  default     = "deskto-website"
}

variable "region" {
  type        = string
  description = "AWS region"
  default     = "ap-south-1"
}

variable "ecr_repository_name" {
  type        = string
  description = "ECR repository name"
  default     = "deskto-web"
}

resource "aws_ecr_repository" "main" {
  name                 = var.ecr_repository_name
  image_scanning_configuration {
    scan_on_push = true
  }
  image_tag_mutability = "MUTABLE"
  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_lifecycle_policy" "main" {
  repository = aws_ecr_repository.main.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Remove untagged images after 14 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countNumber = 14
          countUnit   = "days"
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Expire images older than 90 days"
        selection = {
          tagStatus   = "any"
          countType   = "sinceImagePushed"
          countNumber = 90
          countUnit   = "days"
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
