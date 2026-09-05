#!/usr/bin/env bash
#
# Build the image and put it live.
#
#   ./scripts/deploy.sh
#
# Three things here are not obvious, and each cost time to find:
#
# 1. --no-logs is required on Windows. The Azure CLI streams the remote build
#    log, Vite prints a U+2713, and cp1252 cannot encode it — so the CLI dies
#    with a UnicodeEncodeError while the build carries on and succeeds. The
#    command appears to fail when it has not.
#
# 2. `az webapp restart` does NOT re-pull the image. It restarts the container
#    that is already there, so a freshly pushed tag is ignored and the old build
#    keeps serving. `az webapp config container set` is what forces the pull.
#    This produced a deployment that looked successful, reported healthy, and
#    served stale code.
#
# 3. The image build asserts that the policy PDFs are present. If that assertion
#    fails the build stops here rather than shipping an image whose citation
#    links 404.

set -euo pipefail

RG="rg-zuqah-cs-dev"
APP="app-zuqah-cs-dev"

# ACR name is computed by Bicep from a uniqueString — look it up rather than
# hardcoding it, so the script stays correct across redeployments.
ACR=$(az acr list --resource-group "$RG" --query "[0].name" -o tsv)
IMAGE="${ACR}.azurecr.io/zuqah-cs/app:dev"
URL="https://${APP}.azurewebsites.net"

echo "==> Type checking"
bun run typecheck

echo "==> Building image in ACR (${ACR})"
az acr build \
  --registry "$ACR" \
  --resource-group "$RG" \
  --image zuqah-cs/app:dev \
  --file Dockerfile . \
  --no-logs \
  --output none

run_id=$(az acr task list-runs --registry "$ACR" --top 1 --query "[0].runId" -o tsv)
echo -n "    waiting on run ${run_id}"
while :; do
  status=$(az acr task show-run --registry "$ACR" --run-id "$run_id" --query status -o tsv)
  case "$status" in
    Succeeded) echo " — Succeeded"; break ;;
    Failed|Canceled|Error)
      echo " — ${status}"
      echo "    az acr task logs --registry ${ACR} --run-id ${run_id}"
      exit 1 ;;
    *) echo -n "."; sleep 15 ;;
  esac
done

echo "==> Forcing a fresh pull"
az webapp config container set \
  --name "$APP" --resource-group "$RG" \
  --container-image-name "$IMAGE" \
  --output none

# The App Service is stopped between demonstrations, so a deploy usually starts
# from Stopped. Neither `config container set` nor `restart` will start a stopped
# app — the first version of this script waited two minutes for a health check
# that could never pass, and reported failure on a perfectly good build.
#
# The prior state is remembered and restored, so deploying does not quietly leave
# the public URL live.
was_running=$(az webapp show --name "$APP" --resource-group "$RG" --query state -o tsv)
echo "    App Service was: ${was_running}"

if [ "$was_running" != "Running" ]; then
  echo "    starting it to verify the deployment"
  az webapp start --name "$APP" --resource-group "$RG" --output none
else
  az webapp restart --name "$APP" --resource-group "$RG" --output none
fi

echo -n "==> Waiting for health"
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
  echo "Health check never returned 200 (last: ${code:-none})"
  echo "  az webapp log tail -n ${APP} -g ${RG}"
  exit 1
fi

echo
curl -s "${URL}/healthcheck"
echo

# Restore whatever state it was in. Deploying should not be a way the public URL
# ends up live by accident.
if [ "$was_running" != "Running" ]; then
  echo
  echo "==> Returning the App Service to Stopped (it was not running before)"
  az webapp stop --name "$APP" --resource-group "$RG" --output none
  echo "    Deployed and verified. The public URL is offline again."
  echo "    Bring it up for a demo with:  ./scripts/demo-up.sh"
else
  echo
  echo "Deployed: ${URL}"
  echo "Take it offline when finished:  ./scripts/demo-down.sh"
fi
