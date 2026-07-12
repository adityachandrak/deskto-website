output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs for ALB"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs for backend and database"
  value       = aws_subnet.private[*].id
}

output "public_subnet_id" {
  description = "First public subnet ID, kept for backward compatibility"
  value       = aws_subnet.public[0].id
}

output "private_subnet_id" {
  description = "First private subnet ID"
  value       = aws_subnet.private[0].id
}

output "private_subnet_2_id" {
  description = "Second private subnet ID, kept for backward compatibility"
  value       = aws_subnet.private[1].id
}

output "nat_gateway_id" {
  description = "NAT Gateway ID"
  value       = aws_nat_gateway.main.id
}
