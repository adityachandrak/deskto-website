output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.web.id
}

output "ec2_instance_id" {
  description = "Backward-compatible EC2 instance ID"
  value       = aws_instance.web.id
}

output "private_ip" {
  description = "EC2 private IP address"
  value       = aws_instance.web.private_ip
}

output "public_ip" {
  description = "EC2 public IP address, null because backend is private"
  value       = aws_instance.web.public_ip
}

output "public_dns" {
  description = "EC2 public DNS hostname, empty because backend is private"
  value       = aws_instance.web.public_dns
}

output "instance_role_arn" {
  description = "IAM instance role ARN"
  value       = aws_iam_role.instance.arn
}
