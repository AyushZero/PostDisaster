#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-}"
APPLY_MODE="${2:-false}"

if [[ -z "${ENVIRONMENT}" ]]; then
  echo "Usage: $0 <dev|staging|prod> <true|false>"
  exit 1
fi

if ! command -v terraform >/dev/null 2>&1; then
  echo "terraform is not installed on this agent"
  exit 1
fi

TF_DIR="terraform/environments/${ENVIRONMENT}"
if [[ ! -d "${TF_DIR}" ]]; then
  echo "Terraform directory not found: ${TF_DIR}"
  exit 1
fi

pushd "${TF_DIR}" >/dev/null

terraform init -input=false
terraform validate
terraform plan -out=tfplan -input=false

if [[ "${APPLY_MODE}" == "true" ]]; then
  terraform apply -input=false -auto-approve tfplan
fi

set +e
APP_IP="$(terraform output -raw app_public_ip 2>/dev/null)"
APP_IP_RC=$?
SSH_USER="$(terraform output -raw ssh_user 2>/dev/null)"
SSH_USER_RC=$?
set -e

popd >/dev/null

if [[ ${APP_IP_RC} -eq 0 && ${SSH_USER_RC} -eq 0 && -n "${APP_IP}" && -n "${SSH_USER}" ]]; then
  GENERATED_INVENTORY="ansible/inventories/${ENVIRONMENT}/hosts.generated.yml"
  cat > "${GENERATED_INVENTORY}" <<EOF
---
all:
  children:
    app:
      hosts:
        ${ENVIRONMENT}-app:
          ansible_host: ${APP_IP}
          ansible_user: ${SSH_USER}
EOF

  echo "Generated ${GENERATED_INVENTORY}"
  echo "App host IP: ${APP_IP}"
else
  echo "Terraform outputs not available for ${ENVIRONMENT}; inventory was not generated."
  if [[ "${APPLY_MODE}" != "true" ]]; then
    echo "Run with APPLY_INFRA=true at least once for ${ENVIRONMENT}, or ensure terraform state/outputs exist."
  fi
fi
