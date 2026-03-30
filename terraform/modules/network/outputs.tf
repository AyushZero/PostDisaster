output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.this.id
}

output "public_subnet_id" {
  description = "Public subnet ID"
  value       = aws_subnet.public.id
}

output "app_security_group_id" {
  description = "Security group ID for app hosts"
  value       = aws_security_group.app.id
}
