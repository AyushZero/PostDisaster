terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  environment = "staging"
}

module "network" {
  source             = "../../modules/network"
  project_name       = var.project_name
  environment        = local.environment
  vpc_cidr           = var.vpc_cidr
  public_subnet_cidr = var.public_subnet_cidr
  app_ingress_cidr   = var.app_ingress_cidr
  ssh_ingress_cidr   = var.ssh_ingress_cidr
  monitoring_ingress_cidr = var.monitoring_ingress_cidr
  k8s_app_ingress_cidr = var.k8s_app_ingress_cidr
}

module "compute" {
  source            = "../../modules/compute"
  project_name      = var.project_name
  environment       = local.environment
  instance_type     = var.instance_type
  subnet_id         = module.network.public_subnet_id
  security_group_id = module.network.app_security_group_id
  key_name          = var.key_name
  ssh_user          = var.ssh_user
}
