output "environment" {
  value = "prod"
}

output "app_public_ip" {
  value = module.compute.public_ip
}

output "app_private_ip" {
  value = module.compute.private_ip
}

output "ssh_user" {
  value = module.compute.ssh_user
}
