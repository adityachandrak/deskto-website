output "alb_security_group_id" {
  description = "Security group ID for ALB"
  value       = aws_security_group.alb.id
}

output "backend_security_group_id" {
  description = "Security group ID for backend EC2"
  value       = aws_security_group.backend.id
}

output "web_security_group_id" {
  description = "Backward-compatible backend security group output"
  value       = aws_security_group.backend.id
}
