# Database Module Outputs

output "db_instance_id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.this.identifier
}

output "db_instance_endpoint" {
  description = "RDS instance endpoint (host:port)"
  value       = aws_db_instance.this.endpoint
}

output "db_instance_host" {
  description = "RDS instance host"
  value       = aws_db_instance.this.address
}

output "db_instance_port" {
  description = "RDS instance port"
  value       = aws_db_instance.this.port
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.this.db_name
}

output "db_username" {
  description = "Database master username"
  value       = aws_db_instance.this.username
}

output "db_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "database_url_parameter" {
  description = "SSM parameter name for database URL"
  value       = aws_ssm_parameter.database_url.name
}

output "database_host_parameter" {
  description = "SSM parameter name for database host"
  value       = aws_ssm_parameter.database_host.name
}

output "database_port_parameter" {
  description = "SSM parameter name for database port"
  value       = aws_ssm_parameter.database_port.name
}

output "database_name_parameter" {
  description = "SSM parameter name for database name"
  value       = aws_ssm_parameter.database_name.name
}

output "database_user_parameter" {
  description = "SSM parameter name for database user"
  value       = aws_ssm_parameter.database_user.name
}

output "database_password_parameter" {
  description = "SSM parameter name for database password"
  value       = aws_ssm_parameter.database_password.name
}

output "jwt_secret_parameter" {
  description = "SSM parameter name for JWT secret"
  value       = aws_ssm_parameter.jwt_secret.name
}
