output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "Public IP for app host"
  value       = aws_instance.app.public_ip
}

output "private_ip" {
  description = "Private IP for app host"
  value       = aws_instance.app.private_ip
}

output "ssh_user" {
  description = "SSH username for the instance"
  value       = var.ssh_user
}
