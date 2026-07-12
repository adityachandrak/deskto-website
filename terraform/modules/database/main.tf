# RDS Database Module

# Random password for database
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "_%^" # Avoid characters that cause issues
}

# DB Subnet Group
resource "aws_db_subnet_group" "this" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name        = "${var.project_name}-db-subnet-group"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for RDS instance"
  vpc_id      = var.vpc_id

  tags = {
    Name        = "${var.project_name}-rds-sg"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Allow RDS access from EC2 security group
resource "aws_security_group_rule" "rds_from_ec2" {
  type                     = "ingress"
  description              = "Allow PostgreSQL from EC2"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = var.ec2_security_group_id
  security_group_id        = aws_security_group.rds.id
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "this" {
  identifier            = "${var.project_name}-postgres"
  engine                = "postgres"
  instance_class        = "db.t3.micro"
  allocated_storage     = 20
  max_allocated_storage = 0 # Disable autoscaling for free tier
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az                = false
  publicly_accessible     = false
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  skip_final_snapshot      = true
  delete_automated_backups = false
  apply_immediately        = true

  enabled_cloudwatch_logs_exports = ["postgresql"]

  performance_insights_enabled = false # Not available on db.t3.micro

  tags = {
    Name        = "${var.project_name}-postgres"
    Environment = var.environment
    Project     = var.project_name
  }

  lifecycle {
    prevent_destroy = true
  }
}

# SSM Parameter for database URL
resource "aws_ssm_parameter" "database_url" {
  name  = "/${var.project_name}/production/database-url"
  type  = "SecureString"
  value = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.this.endpoint}/${var.db_name}"

  tags = {
    Name        = "${var.project_name}-database-url"
    Environment = var.environment
    Project     = var.project_name
  }
}

# SSM Parameter for database host
resource "aws_ssm_parameter" "database_host" {
  name  = "/${var.project_name}/production/database-host"
  type  = "String"
  value = aws_db_instance.this.endpoint

  tags = {
    Name        = "${var.project_name}-database-host"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_ssm_parameter" "database_port" {
  name  = "/${var.project_name}/production/database-port"
  type  = "String"
  value = tostring(aws_db_instance.this.port)

  tags = {
    Name        = "${var.project_name}-database-port"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_ssm_parameter" "database_name" {
  name  = "/${var.project_name}/production/database-name"
  type  = "String"
  value = var.db_name

  tags = {
    Name        = "${var.project_name}-database-name"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_ssm_parameter" "database_user" {
  name  = "/${var.project_name}/production/database-user"
  type  = "String"
  value = var.db_username

  tags = {
    Name        = "${var.project_name}-database-user"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_ssm_parameter" "database_password" {
  name  = "/${var.project_name}/production/database-password"
  type  = "SecureString"
  value = random_password.db_password.result

  tags = {
    Name        = "${var.project_name}-database-password"
    Environment = var.environment
    Project     = var.project_name
  }
}

# SSM Parameter for JWT secret
resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${var.project_name}/production/jwt-secret"
  type  = "SecureString"
  value = random_password.jwt_secret.result

  tags = {
    Name        = "${var.project_name}-jwt-secret"
    Environment = var.environment
    Project     = var.project_name
  }
}
