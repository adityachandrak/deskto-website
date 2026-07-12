# Live Terraform Configuration - production backend/database infrastructure

provider "aws" {
  region = var.region
}

module "network" {
  source       = "../modules/network"
  project_name = var.project_name
  region       = var.region
}

module "security" {
  source       = "../modules/security"
  project_name = var.project_name
  vpc_id       = module.network.vpc_id
  app_port     = var.app_port
}

module "ecr" {
  source              = "../modules/ecr"
  project_name        = var.project_name
  region              = var.region
  ecr_repository_name = var.ecr_repository_name
}

module "compute" {
  source            = "../modules/compute"
  project_name      = var.project_name
  environment       = var.environment
  subnet_id         = module.network.private_subnet_id
  security_group_id = module.security.backend_security_group_id
  instance_type     = var.backend_instance_type
}

module "database" {
  source                = "../modules/database"
  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.network.vpc_id
  subnet_ids            = module.network.private_subnet_ids
  ec2_security_group_id = module.security.backend_security_group_id
  db_name               = var.db_name
  db_username           = var.db_username
}

resource "aws_lb" "backend" {
  name               = "${var.project_name}-backend-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [module.security.alb_security_group_id]
  subnets            = module.network.public_subnet_ids

  enable_deletion_protection = false

  tags = {
    Name        = "${var.project_name}-backend-alb"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_lb_target_group" "backend" {
  name        = "${var.project_name}-backend-tg"
  port        = var.app_port
  protocol    = "HTTP"
  target_type = "instance"
  vpc_id      = module.network.vpc_id

  health_check {
    enabled             = true
    path                = "/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name        = "${var.project_name}-backend-tg"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_lb_target_group_attachment" "backend" {
  target_group_arn = aws_lb_target_group.backend.arn
  target_id        = module.compute.instance_id
  port             = var.app_port
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.backend.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

resource "aws_lb_listener" "https" {
  count             = var.acm_certificate_arn == "" ? 0 : 1
  load_balancer_arn = aws_lb.backend.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}
