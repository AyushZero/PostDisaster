# Jenkins + Terraform + Ansible + Docker Setup Guide

This guide configures and deploys this project from scratch using all four tools:
- Jenkins: CI/CD orchestration
- Docker: app image build and runtime
- Terraform: infrastructure provisioning
- Ansible: host provisioning and app deployment

## 1. Target Architecture

1. You push code to GitHub.
2. Jenkins runs CI (install, lint, build).
3. Jenkins builds and pushes Docker image to Docker Hub.
4. Jenkins runs Terraform for selected environment (`dev`, `staging`, `prod`).
5. Jenkins runs Ansible to provision host and deploy container.
6. Jenkins runs smoke check on `/api/health`.

Repository paths used by this flow:
- `Jenkinsfile`
- `scripts/jenkins/validate_stack.sh`
- `scripts/jenkins/tf_plan_apply.sh`
- `scripts/jenkins/ansible_deploy.sh`
- `terraform/environments/*`
- `ansible/playbooks/*`

---

## 2. Prerequisites

### 2.1 Accounts

1. AWS account (for Terraform provisioning)
2. Docker Hub account (for image push)
3. GitHub repository access
4. Supabase project with URL and anon key

### 2.2 Jenkins Host

Use one Linux VM (Ubuntu 22.04 or Amazon Linux 2023) with at least:
- 2 vCPU
- 4 GB RAM
- 30 GB disk

Open inbound ports:
- 22 (SSH)
- 8080 (Jenkins UI)
- 3000 (app traffic)

---

## 3. Install System Dependencies on Jenkins Host

SSH into your host and install tools.

### 3.1 Docker

Ubuntu example:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io
sudo systemctl enable docker
sudo systemctl start docker
```

### 3.2 Node.js and npm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

### 3.3 Terraform

```bash
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt-get update && sudo apt-get install -y terraform
terraform -v
```

### 3.4 Ansible

```bash
sudo apt-get update
sudo apt-get install -y ansible
ansible --version
```

### 3.5 Java + Jenkins

```bash
sudo apt-get install -y fontconfig openjdk-17-jre
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/ | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt-get update
sudo apt-get install -y jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins
```

### 3.6 Jenkins User Permissions

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

---

## 4. Configure Jenkins

### 4.1 First Login

1. Get initial password:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

2. Open `http://<jenkins-host-ip>:8080`
3. Install suggested plugins
4. Create admin user

### 4.2 Required Plugins

Install these if not already present:
- Git
- Pipeline
- Credentials Binding
- Docker Pipeline
- SonarQube Scanner (optional, only if `ENABLE_SONAR=true`)

### 4.3 Add Jenkins Credentials

Go to Manage Jenkins -> Credentials -> Global and add:

1. `SUPABASE_URL` (Secret text)
- value: your Supabase URL

2. `SUPABASE_ANON_KEY` (Secret text)
- value: your Supabase anon key

3. `DOCKERHUB_CREDENTIALS` (Username with password)
- username: Docker Hub username
- password: Docker Hub access token

4. `SLACK_ALERT_WEBHOOK` (Secret text)
- value: Slack incoming webhook URL used by Alertmanager
- required only when `DEPLOY_MONITORING=true`

5. `SONAR_TOKEN` (Secret text)
- value: SonarQube user token with project analysis permission
- required only when `ENABLE_SONAR=true`

6. AWS credentials
- Use one of these approaches:
- recommended: attach IAM role to Jenkins host
- alternative: add AWS access key credentials and export them in job environment
Test for push
---

## 5. Prepare Repository for Jenkins

On GitHub, ensure this repository contains:
- `Jenkinsfile`
- `terraform/`
- `ansible/`
- `scripts/jenkins/`

The pipeline already expects these parameters:
- `DEPLOY_SCOPE`: `dev|staging|prod|all`
- `DOCKERHUB_NAMESPACE`
- `APPLY_INFRA`: true/false
- `DEPLOY_MONITORING`: true/false
- `ENABLE_SONAR`: true/false
- `SONAR_HOST_URL`: SonarQube base URL (required when `ENABLE_SONAR=true`)
- `ENABLE_ZAP`: true/false
- `ZAP_TARGET_URL`: optional explicit target URL for ZAP scan
- `ZAP_FAIL_BUILD`: fail build on ZAP findings when true
- `ROLLBACK_DEPLOY`: true/false
- `ROLLBACK_TAG`

---

## 6. Create Jenkins Pipeline Job

1. New Item -> Pipeline
2. Name: `post-disaster-alert`
3. Pipeline definition: Pipeline script from SCM
4. SCM: Git
5. Repository URL: your repo URL
6. Branch: `*/main`
7. Script Path: `Jenkinsfile`
8. Save

Optional trigger:
- Enable GitHub webhook trigger for automatic builds

---

## 7. Configure Terraform Environments

Each environment is already scaffolded:
- `terraform/environments/dev`
- `terraform/environments/staging`
- `terraform/environments/prod`

Before real apply:

1. Set AWS region and CIDR values in each environment `variables.tf` if needed.
2. If you need SSH key pair access, set `key_name` variable in that environment.
3. Restrict `ssh_ingress_cidr` from `0.0.0.0/0` to your IP for safety.
4. Restrict `monitoring_ingress_cidr` to trusted IP ranges before exposing Grafana/Prometheus publicly.

---

## 8. Configure Ansible Deployment

Ansible does the following:
1. `playbooks/provision.yml` installs and starts Docker on target hosts.
2. `playbooks/deploy.yml` pulls image and runs container.
3. `playbooks/rollback.yml` deploys a previous image tag.

Jenkins script `tf_plan_apply.sh` generates environment inventory after Terraform apply:
- `ansible/inventories/<env>/hosts.generated.yml`

This generated inventory is consumed by `ansible_deploy.sh`.

---

## 9. First Deployment Walkthrough

### 9.1 Dry Run (No Infra Changes)

Run Jenkins job with:
- `DEPLOY_SCOPE=dev`
- `DOCKERHUB_NAMESPACE=<your-dockerhub-username>`
- `APPLY_INFRA=false`
- `ROLLBACK_DEPLOY=false`

Outcome:
- CI and image push run
- Terraform plan runs
- Ansible deploy is skipped by design when apply is false

### 9.2 Real Dev Deployment

Run Jenkins job with:
- `DEPLOY_SCOPE=dev`
- `DOCKERHUB_NAMESPACE=<your-dockerhub-username>`
- `APPLY_INFRA=true`
- `DEPLOY_MONITORING=true`
- `ROLLBACK_DEPLOY=false`

Outcome:
1. Terraform creates/updates dev infra
2. Inventory is generated
3. Ansible provisions host
4. Ansible deploys container
5. Jenkins validates `http://<dev-host-ip>:3000/api/health`
6. If `DEPLOY_MONITORING=true`, Jenkins deploys Prometheus, Grafana, Alertmanager, node-exporter, and blackbox-exporter
7. Monitoring endpoints are available on:
- `http://<dev-host-ip>:9090` (Prometheus)
- `http://<dev-host-ip>:3001` (Grafana)
- `http://<dev-host-ip>:9093` (Alertmanager)

### 9.3 Promote to Staging and Prod

Repeat with:
- `DEPLOY_SCOPE=staging`
- then `DEPLOY_SCOPE=prod`

Note:
- Prod stage has manual approval gate in the pipeline.

---

## 10. Rollback Procedure

If a deployment is unhealthy:

1. Identify previous good image tag from Jenkins logs/artifacts.
2. Re-run Jenkins job with:
- `DEPLOY_SCOPE=<env>`
- `APPLY_INFRA=true`
- `ROLLBACK_DEPLOY=true`
- `ROLLBACK_TAG=<known-good-tag>`

Pipeline will run Ansible rollback playbook with that tag.

---

## 11. Verification Checklist

After each deployment:

1. Jenkins build is green
2. Terraform apply succeeded for the environment
3. Ansible deploy completed without failed tasks
4. Health endpoint returns 200:

```bash
curl -i http://<host-ip>:3000/api/health
```

5. App UI loads at:
- `http://<host-ip>:3000`

---

## 12. Troubleshooting

### Jenkins cannot run Docker

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

### Terraform fails auth

1. Verify IAM permissions or AWS keys
2. Verify region in environment variables

### Ansible SSH failures

1. Verify security group allows SSH from Jenkins host
2. Verify `key_name` and SSH user
3. Verify generated inventory IPs

### Deployment health check fails

1. Check app container logs on target host:

```bash
docker logs post-disaster-alert-app --tail 200
```

2. Confirm env vars are set correctly (Supabase URL/key)

---

## 13. Suggested Next Hardening Steps

1. Move Terraform state to S3 + DynamoDB lock.
2. Restrict app ingress with load balancer and HTTPS.
3. Restrict monitoring ingress CIDR (`monitoring_ingress_cidr`) to office/VPN IPs.
4. Use AWS Secrets Manager instead of plain secret injection.
5. Add smoke test script beyond health endpoint.
6. Split Jenkins controller and build agents.

This gives you a complete implementation path using Jenkins, Terraform, Ansible, and Docker together, from setup to deployment and rollback.
