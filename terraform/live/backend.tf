# Terraform remote state backend configuration
terraform {
  backend "s3" {
    bucket         = "deskto-website-terraform-state"
    key            = "deskto-website/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "deskto-website-terraform-lock"
  }
}
