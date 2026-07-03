output "web_security_group_id" {
  description = "Security group ID for web server"
  value       = aws_security_group.web.id
}
