output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.web.id
}

output "public_ip" {
  description = "EC2 public IP address"
  value       = aws_eip.web.public_ip
}

output "public_dns" {
  description = "EC2 public DNS name"
  value       = aws_instance.web.public_dns
}

output "instance_role_arn" {
  description = "IAM instance role ARN"
  value       = aws_iam_role.instance.arn
}
