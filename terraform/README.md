# Terraform Layout

This folder provisions AWS infrastructure for the Jenkins-driven CI/CD flow.

## Environments

- `environments/dev`
- `environments/staging`
- `environments/prod`

Each environment uses shared modules:
- `modules/network`: VPC, subnet, routing, security group
- `modules/compute`: EC2 host for app deployment

## Local Run

```bash
cd terraform/environments/dev
terraform init
terraform validate
terraform plan
```

Use the same sequence for staging and prod.

## Notes

- This repository defaults to local state for classroom/demo simplicity.
- For team use, move to an S3 backend with DynamoDB locking.
