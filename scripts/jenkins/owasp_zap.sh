#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# owasp_zap.sh — Run OWASP ZAP baseline scan against a target URL
#
# Usage:  bash scripts/jenkins/owasp_zap.sh <TARGET_URL> [REPORT_DIR]
#
# The script runs the ZAP Docker container in baseline-scan mode, produces
# an HTML report, and exits 0 on pass / non-zero if HIGH-risk issues found.
# ---------------------------------------------------------------------------
set -euo pipefail

TARGET_URL="${1:?Usage: owasp_zap.sh <TARGET_URL> [REPORT_DIR]}"
REPORT_DIR="${2:-$(pwd)}"
REPORT_FILE="zap-report.html"
ZAP_IMAGE="ghcr.io/zaproxy/zaproxy:stable"

echo "==> OWASP ZAP Baseline Scan"
echo "    Target : ${TARGET_URL}"
echo "    Report : ${REPORT_DIR}/${REPORT_FILE}"

# Pull latest ZAP image
docker pull "${ZAP_IMAGE}"

# Run baseline scan
# -t  = target URL
# -r  = HTML report filename (written inside /zap/wrk)
# -I  = do not return failure on warnings, only on errors
# -j  = include Ajax Spider
# Exit codes: 0=pass 1=warn(with -I continues) 2=fail(HIGH issues)
docker run --rm \
  --network host \
  -v "${REPORT_DIR}:/zap/wrk:rw" \
  "${ZAP_IMAGE}" \
  zap-baseline.py \
    -t "${TARGET_URL}" \
    -r "${REPORT_FILE}" \
    -I \
    -j \
  || ZAP_EXIT=$?

ZAP_EXIT="${ZAP_EXIT:-0}"

if [ "${ZAP_EXIT}" -ge 2 ]; then
  echo "!!! ZAP found HIGH-risk vulnerabilities (exit code ${ZAP_EXIT}). See report."
  exit "${ZAP_EXIT}"
elif [ "${ZAP_EXIT}" -eq 1 ]; then
  echo "==> ZAP found warnings but no HIGH-risk issues. Report generated."
  exit 0
else
  echo "==> ZAP scan passed cleanly."
  exit 0
fi
