#!/usr/bin/env bash
#
# Bring the demo online.
#
#   ./scripts/demo-up.sh
#
# The App Service is stopped by default so the public URL is dead between
# demonstrations — see scripts/demo-down.sh. This starts it, waits for the
# container to answer its health check, and prints what you need to hand out.
#
# Note this does NOT stop the App Service Plan billing when the app is stopped;
# the plan is charged either way. Stopping is about exposure, not cost.

set -euo pipefail

RG="rg-zuqah-cs-dev"
APP="app-zuqah-cs-dev"
KV="kv-zuqah-cs-dev"
URL="https://${APP}.azurewebsites.net"

echo "Starting ${APP}…"
az webapp start --name "$APP" --resource-group "$RG" --output none

echo -n "Waiting for the container to answer"
for attempt in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${URL}/healthcheck" || true)
  if [ "$code" = "200" ]; then
    echo " — up after ~$((attempt * 5))s"
    break
  fi
  echo -n "."
  sleep 5
done

if [ "${code:-}" != "200" ]; then
  echo
  echo "Health check did not return 200 (last: ${code:-none})."
  echo "Check the logs:  az webapp log tail -n ${APP} -g ${RG}"
  exit 1
fi

echo
curl -s "${URL}/healthcheck"
echo
echo
echo "  URL          ${URL}"
echo "  Access code  read it from Key Vault:"
echo "               az keyvault secret show --vault-name ${KV} \\"
echo "                 -n DemoAccessCode --query value -o tsv"
echo
echo "  When finished:  ./scripts/demo-down.sh"
