#!/usr/bin/env bash
set -euo pipefail

strip_ansi() {
  # Remove ANSI escape sequences that can leak into captured output.
  sed -E 's/\x1B\[[0-9;]*[[:alpha:]]//g'
}

trim_whitespace() {
  sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//'
}

is_valid_ipv4() {
  local ip="${1:-}"
  [[ "${ip}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || return 1
  IFS='.' read -r o1 o2 o3 o4 <<< "${ip}"
  for octet in "${o1}" "${o2}" "${o3}" "${o4}"; do
    [[ "${octet}" =~ ^[0-9]+$ ]] || return 1
    (( octet >= 0 && octet <= 255 )) || return 1
  done
}

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

terraform init -input=false -no-color
terraform validate
terraform plan -out=tfplan -input=false -no-color

if [[ "${APPLY_MODE}" == "true" ]]; then
  terraform apply -input=false -auto-approve -no-color tfplan
fi

set +e
APP_IP_RAW="$(terraform output -raw app_public_ip 2>/dev/null)"
APP_IP_RC=$?
SSH_USER_RAW="$(terraform output -raw ssh_user 2>/dev/null)"
SSH_USER_RC=$?
set -e

APP_IP="$(printf '%s' "${APP_IP_RAW}" | strip_ansi | trim_whitespace)"
SSH_USER="$(printf '%s' "${SSH_USER_RAW}" | strip_ansi | trim_whitespace)"

popd >/dev/null

GENERATED_INVENTORY="ansible/inventories/${ENVIRONMENT}/hosts.generated.yml"

if [[ ${APP_IP_RC} -eq 0 && ${SSH_USER_RC} -eq 0 ]]; then
  if ! is_valid_ipv4 "${APP_IP}"; then
    APP_IP=""
  fi
fi

if [[ ${APP_IP_RC} -eq 0 && ${SSH_USER_RC} -eq 0 && -n "${APP_IP}" && -n "${SSH_USER}" ]]; then
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
  rm -f "${GENERATED_INVENTORY}"
  echo "Terraform outputs not available for ${ENVIRONMENT}; inventory was not generated."
  if [[ "${APPLY_MODE}" != "true" ]]; then
    echo "Run with APPLY_INFRA=true at least once for ${ENVIRONMENT}, or ensure terraform state/outputs exist."
  fi
  exit 2
fi
