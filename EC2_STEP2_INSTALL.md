# Step 2: Install Everything on EC2 (Copy-Paste Safe)

Use this file directly on your EC2 setup process.

## 1) SSH into EC2

Replace with your real key path and public IP:

ssh -i /path/to/postdisaster.pem ubuntu@EC2_PUBLIC_IP

## 2) Install all required tools

You are currently using `ec2-user`, which means Amazon Linux.
Use the Amazon Linux block below (not Ubuntu apt commands).

### 2A) Amazon Linux 2023 (for ec2-user)

Run this full block on the EC2 host:

```bash
set -e

sudo dnf update -y
sudo dnf install -y git wget unzip tar dnf-plugins-core

# Amazon Linux ships with curl-minimal. If you ever hit curl conflicts, run:
# sudo dnf install -y curl --allowerasing

# Docker
sudo dnf install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Terraform
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo
sudo dnf install -y terraform

# Ansible
sudo dnf install -y ansible-core

# Java + Jenkins
sudo dnf install -y java-17-amazon-corretto
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
sudo dnf install -y jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins

# Jenkins can run Docker
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

### 2B) Ubuntu 22.04 (only if your host user is ubuntu)

```bash
set -e
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release software-properties-common unzip git fontconfig openjdk-17-jre

# Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list > /dev/null
sudo apt-get update
sudo apt-get install -y terraform

# Ansible
sudo apt-get install -y ansible

# Jenkins
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt-get update
sudo apt-get install -y jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

## 3) Quick verify

docker --version
node -v
npm -v
terraform -v
ansible --version | head -n 1
java -version
sudo systemctl status jenkins --no-pager -l | head -n 20

## 4) Get Jenkins unlock password

sudo cat /var/lib/jenkins/secrets/initialAdminPassword

## 5) Open Jenkins

http://EC2_PUBLIC_IP:8080
