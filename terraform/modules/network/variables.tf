variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
}

variable "app_ingress_cidr" {
  description = "CIDR allowed to access the app"
  type        = string
  default     = "0.0.0.0/0"
}

variable "ssh_ingress_cidr" {
  description = "CIDR allowed to SSH into instances"
  type        = string
  default     = "0.0.0.0/0"
}

variable "monitoring_ingress_cidr" {
  description = "CIDR allowed to access Prometheus, Grafana, and Alertmanager"
  type        = string
  default     = "0.0.0.0/0"
}
