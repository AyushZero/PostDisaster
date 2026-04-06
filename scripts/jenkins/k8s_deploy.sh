#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# k8s_deploy.sh — Blue-Green Kubernetes deployment orchestrator
#
# Usage:  bash scripts/jenkins/k8s_deploy.sh <ENVIRONMENT> <IMAGE_TAG> [rollback]
#
# This script implements a blue-green deployment strategy:
#   1. Detects which slot (blue/green) is currently receiving live traffic
#   2. Updates the IDLE slot with the new image tag
#   3. Waits for rollout to complete and verifies health
#   4. Switches the Service selector to the newly deployed slot
#   5. Keeps the old slot running for instant rollback
#
# Pass "rollback" as the third argument to switch traffic back to the
# previous slot without changing any images.
# ---------------------------------------------------------------------------
set -euo pipefail

ENVIRONMENT="${1:?Usage: k8s_deploy.sh <ENVIRONMENT> <IMAGE_TAG> [rollback]}"
IMAGE_TAG="${2:?Usage: k8s_deploy.sh <ENVIRONMENT> <IMAGE_TAG> [rollback]}"
ACTION="${3:-deploy}"

NAMESPACE="post-disaster-alert"
APP_NAME="post-disaster-alert"
IMAGE_REPO="ayushzero/post-disaster-alert"
SERVICE_NAME="post-disaster-alert"

echo "============================================"
echo " K8s Blue-Green Deploy"
echo " Environment : ${ENVIRONMENT}"
echo " Image Tag   : ${IMAGE_TAG}"
echo " Action      : ${ACTION}"
echo "============================================"

# ---------------------------------------------------------------
# Step 1: Apply base manifests via kustomize overlay
# ---------------------------------------------------------------
echo "==> Applying kustomize overlay for ${ENVIRONMENT}..."
kubectl apply -k "k8s/overlays/${ENVIRONMENT}"

# ---------------------------------------------------------------
# Step 2: Determine which slot is currently live
# ---------------------------------------------------------------
LIVE_SLOT=$(kubectl get svc "${SERVICE_NAME}" \
  -n "${NAMESPACE}" \
  -o jsonpath='{.spec.selector.slot}' 2>/dev/null || echo "blue")

if [ "${LIVE_SLOT}" = "blue" ]; then
  IDLE_SLOT="green"
else
  IDLE_SLOT="blue"
fi

echo "==> Current live slot : ${LIVE_SLOT}"
echo "==> Target idle slot  : ${IDLE_SLOT}"

# ---------------------------------------------------------------
# Rollback: simply switch traffic back to the idle (previous) slot
# ---------------------------------------------------------------
if [ "${ACTION}" = "rollback" ]; then
  echo "==> ROLLBACK: Switching traffic to ${IDLE_SLOT}..."
  kubectl patch svc "${SERVICE_NAME}" \
    -n "${NAMESPACE}" \
    -p "{\"spec\":{\"selector\":{\"slot\":\"${IDLE_SLOT}\"}}}"

  echo "==> Rollback complete. Traffic now on: ${IDLE_SLOT}"
  exit 0
fi

# ---------------------------------------------------------------
# Step 3: Update the idle slot's image
# ---------------------------------------------------------------
IDLE_DEPLOYMENT="${APP_NAME}-${IDLE_SLOT}"
echo "==> Updating ${IDLE_DEPLOYMENT} to image ${IMAGE_REPO}:${IMAGE_TAG}..."

kubectl set image deployment/"${IDLE_DEPLOYMENT}" \
  -n "${NAMESPACE}" \
  "app=${IMAGE_REPO}:${IMAGE_TAG}"

# ---------------------------------------------------------------
# Step 4: Wait for rollout to complete
# ---------------------------------------------------------------
echo "==> Waiting for rollout of ${IDLE_DEPLOYMENT}..."
kubectl rollout status deployment/"${IDLE_DEPLOYMENT}" \
  -n "${NAMESPACE}" \
  --timeout=300s

# ---------------------------------------------------------------
# Step 5: Health check on the idle slot pods
# ---------------------------------------------------------------
echo "==> Running health check on ${IDLE_SLOT} pods..."
READY_PODS=$(kubectl get pods \
  -n "${NAMESPACE}" \
  -l "app.kubernetes.io/name=${APP_NAME},slot=${IDLE_SLOT}" \
  -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}')

for status in ${READY_PODS}; do
  if [ "${status}" != "True" ]; then
    echo "!!! Health check FAILED: not all ${IDLE_SLOT} pods are Ready."
    echo "    Rolling back image change on ${IDLE_DEPLOYMENT}..."
    kubectl rollout undo deployment/"${IDLE_DEPLOYMENT}" -n "${NAMESPACE}"
    exit 1
  fi
done

echo "==> All ${IDLE_SLOT} pods are healthy."

# ---------------------------------------------------------------
# Step 6: Switch traffic to the new slot
# ---------------------------------------------------------------
echo "==> Switching Service traffic: ${LIVE_SLOT} -> ${IDLE_SLOT}"
kubectl patch svc "${SERVICE_NAME}" \
  -n "${NAMESPACE}" \
  -p "{\"spec\":{\"selector\":{\"slot\":\"${IDLE_SLOT}\"}}}"

echo "============================================"
echo " Deploy complete!"
echo " Live slot  : ${IDLE_SLOT}"
echo " Standby    : ${LIVE_SLOT} (instant rollback available)"
echo " Image      : ${IMAGE_REPO}:${IMAGE_TAG}"
echo "============================================"
