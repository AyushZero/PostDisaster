#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-}"
IMAGE_TAG="${2:-}"
ACTION="${3:-deploy}"
ARG_ONE="${4:-}"
ARG_TWO="${5:-}"

if [[ -z "${ENVIRONMENT}" || -z "${IMAGE_TAG}" ]]; then
  echo "Usage: $0 <dev|staging|prod> <image_tag> <provision|deploy|rollback|monitoring|k8s> [arg1] [arg2]"
  exit 1
fi

if ! command -v ansible-playbook >/dev/null 2>&1; then
  echo "ansible-playbook is not installed on this agent"
  exit 1
fi

INVENTORY_GENERATED="ansible/inventories/${ENVIRONMENT}/hosts.generated.yml"
INVENTORY_DEFAULT="ansible/inventories/${ENVIRONMENT}/hosts.yml"
INVENTORY_FILE="${INVENTORY_GENERATED}"

if [[ ! -f "${INVENTORY_FILE}" ]]; then
  INVENTORY_FILE="${INVENTORY_DEFAULT}"
fi

if [[ ! -f "${INVENTORY_FILE}" ]]; then
  echo "Inventory not found for ${ENVIRONMENT}"
  exit 1
fi

export APP_IMAGE_TAG="${IMAGE_TAG}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
export ANSIBLE_ROLES_PATH="${REPO_ROOT}/ansible/roles${ANSIBLE_ROLES_PATH:+:${ANSIBLE_ROLES_PATH}}"
# CI deploys target freshly created/recreated hosts, so avoid interactive host key prompts.
export ANSIBLE_HOST_KEY_CHECKING="False"
export ANSIBLE_SSH_COMMON_ARGS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null${ANSIBLE_SSH_COMMON_ARGS:+ ${ANSIBLE_SSH_COMMON_ARGS}}"

if [[ -n "${SSH_PRIVATE_KEY_FILE:-}" ]]; then
  if [[ ! -f "${SSH_PRIVATE_KEY_FILE}" ]]; then
    echo "SSH private key file does not exist: ${SSH_PRIVATE_KEY_FILE}"
    exit 1
  fi
  export ANSIBLE_PRIVATE_KEY_FILE="${SSH_PRIVATE_KEY_FILE}"
fi

if [[ -n "${SSH_REMOTE_USER:-}" ]]; then
  export ANSIBLE_REMOTE_USER="${SSH_REMOTE_USER}"
fi

if [[ "${ACTION}" == "provision" ]]; then
  ansible-playbook -i "${INVENTORY_FILE}" ansible/playbooks/provision.yml
elif [[ "${ACTION}" == "rollback" ]]; then
  ROLLBACK_TAG="${ARG_ONE}"
  if [[ -z "${ROLLBACK_TAG}" ]]; then
    echo "rollback tag is required when ACTION=rollback"
    exit 1
  fi
  ansible-playbook -i "${INVENTORY_FILE}" ansible/playbooks/rollback.yml -e "rollback_image_tag=${ROLLBACK_TAG}"
elif [[ "${ACTION}" == "monitoring" ]]; then
  MONITORING_EXTRA_VARS=()
  if [[ -n "${APP_HOST_PORT_OVERRIDE:-}" ]]; then
    MONITORING_EXTRA_VARS+=("-e" "app_host_port=${APP_HOST_PORT_OVERRIDE}")
  fi
  ansible-playbook -i "${INVENTORY_FILE}" ansible/playbooks/deploy_monitoring.yml "${MONITORING_EXTRA_VARS[@]}"
elif [[ "${ACTION}" == "k8s" ]]; then
  K8S_DEPLOY_SLOT="${ARG_ONE:-green}"
  K8S_SWITCH_TRAFFIC="${ARG_TWO:-true}"
  ansible-playbook -i "${INVENTORY_FILE}" ansible/playbooks/deploy_k8s_blue_green.yml -e "k8s_deploy_slot=${K8S_DEPLOY_SLOT}" -e "k8s_switch_traffic=${K8S_SWITCH_TRAFFIC}"
else
  ansible-playbook -i "${INVENTORY_FILE}" ansible/playbooks/deploy.yml
fi
