#!/usr/bin/env bash
#
# Take the demo offline.
#
#   ./scripts/demo-down.sh
#
# Stops the App Service so the public URL stops responding. Everything else —
# the search index, the database, Key Vault, the Foundry account — is left
# alone, so bringing it back up is a single command and takes under a minute.
#
# This is about exposure, not cost. The App Service Plan is billed whether the
# app is running or stopped. To stop paying entirely, delete the resource group:
#
#   az group delete --name rg-zuqah-cs-dev --yes
#
# which is safe — everything reproduces from infra/ and scripts/.

set -euo pipefail

RG="rg-zuqah-cs-dev"
APP="app-zuqah-cs-dev"
URL="https://${APP}.azurewebsites.net"

echo "Stopping ${APP}…"
az webapp stop --name "$APP" --resource-group "$RG" --output none

# Confirmed rather than assumed — a stop that silently failed would leave the URL
# live while the script reported otherwise.
#
# Polled rather than checked once: the front end keeps serving for a few seconds
# after the App Service reports Stopped, so a single check taken immediately
# reports a false failure. The first version did exactly that.
echo -n "Waiting for the front end to stop answering"
for attempt in $(seq 1 12); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${URL}/healthcheck" || echo "000")
  if [ "$code" != "200" ]; then
    echo " — done after ~$((attempt * 5))s"
    break
  fi
  echo -n "."
  sleep 5
done

state=$(az webapp show --name "$APP" --resource-group "$RG" --query state -o tsv)

echo "  App Service state:  ${state}"
echo "  Public URL now returns HTTP ${code}"

if [ "$code" = "200" ]; then
  echo
  echo "WARNING: the URL is still answering after a minute. Check manually:"
  echo "  az webapp show -n ${APP} -g ${RG} --query state -o tsv"
  exit 1
fi

echo
echo "Offline. Bring it back with:  ./scripts/demo-up.sh"
