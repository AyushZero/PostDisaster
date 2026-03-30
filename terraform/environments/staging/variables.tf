variable "project_name" {
  type    = string
  default = "post-disaster-alert"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "public_subnet_cidr" {
  type    = string
  default = "10.20.1.0/24"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "key_name" {
  type    = string
  default = "disaster"
}

variable "ssh_user" {
  type    = string
  default = "ec2-user"
}

variable "app_ingress_cidr" {
  type    = string
  default = "0.0.0.0/0"
}

variable "ssh_ingress_cidr" {
  type    = string
  default = "0.0.0.0/0"
}
