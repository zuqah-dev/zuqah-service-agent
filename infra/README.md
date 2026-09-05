# Infrastructure

The Zuqah Technologies Service Agent environment as code, in Bicep.

Deploys at **subscription scope**, so the resource group is created by the
template too. Nothing has to exist beforehand, and teardown is a single delete.

## Files

```
infra/
├── main.bicep                  Creates the RG, computes every name, calls the modules
├── abbreviations.json          CAF naming prefixes
├── parameters.dev.bicepparam   The only file you edit to retarget a deployment
└── modules/
    ├── logAnalytics.bicep
    ├── applicationInsights.bicep
    ├── containerRegistry.bicep     self-provisioned ACR — no external dependency
    ├── aiFoundry.bicep             account + project + both model deployments
    ├── aiSearch.bicep              semantic ranker enabled
    ├── storage.bicep               documents/ and screenshots/ containers
    ├── postgres.bicep              server + extensions + firewall + database
    ├── keyVault.bicep              vault + the seven secrets
    ├── appServicePlan.bicep
    └── appService.bicep            site + Key Vault access policy
```

## What gets created

27 resources. All contained in a single resource group — one delete removes
everything.

| Resource | Name | Notes |
| --- | --- | --- |
| Resource group | `rg-zuqah-cs-dev` | Created by the template |
| Log Analytics | `log-zuqah-cs-dev` | 30-day retention, the free allowance |
| Application Insights | `appi-zuqah-cs-dev` | Workspace-based |
| **Container Registry** | `cr<suffix>` | Admin user enabled; suffix from `uniqueString()` |
| **AI Foundry** | `aif-zuqah-cs-dev` | `AIServices` + project `proj-service-agent`, `gpt-5.1` and `text-embedding-3-large` |
| **AI Search** | `srch-zuqah-cs-dev` | Basic, **semantic ranker on**. In `eastus`, not `eastus2` — see below |
| Storage | `st<suffix>` | `documents` and `screenshots` containers; suffix from `uniqueString()` |
| Postgres Flexible | `psql-zuqah-cs-dev` | PG 17, `Standard_B1ms`, 32 GiB, `VECTOR,PG_TRGM` allow-listed |
| Key Vault | `kv-zuqah-cs-dev` | Access policies, not RBAC — see below |
| App Service Plan | `asp-zuqah-cs-dev` | Linux, Basic B2 |
| App Service | `app-zuqah-cs-dev` | Container on port 3000, health check `/healthcheck` |

The `<suffix>` values are deterministic — `uniqueString(subscription().id, baseName)` —
so a redeploy to the same subscription produces the same names. Get the actual
names after deployment:

```bash
az deployment sub show -n main \
  --query '{acr:properties.outputs.acrName.value, storage:properties.outputs.storageAccountName.value}' \
  -o json
```

### One AI resource, not four

`aif-zuqah-cs-dev` is `kind: 'AIServices'`, which serves four jobs from one
account:

| Job | Endpoint |
| --- | --- |
| Chat + embeddings | `aif-zuqah-cs-dev.openai.azure.com` |
| Foundry Agents | `aif-zuqah-cs-dev.services.ai.azure.com/api/projects/proj-service-agent` |
| Content Safety | `aif-zuqah-cs-dev.cognitiveservices.azure.com` |
| Document Intelligence | same |

See [ADR-0008](../docs/decisions/0008-single-foundry-account.md).

### Why Search sits in a different region

`searchLocation` is a separate parameter, set to `eastus` while everything else
is in `eastus2`. On 2026-08-31 the first deployment failed with:

```
InsufficientResourcesAvailable: The region 'eastus2' is currently out of the
resources required to provision new services.
```

Search capacity is allocated per region *and* per SKU, and it fluctuates —
every other resource provisioned in `eastus2` without trouble. Cross-region
latency between the app and the index is a few milliseconds and does not matter
here. Set `searchLocation = 'eastus2'` once capacity returns, if it matters.

If `eastus` is also full, any nearby region works: `centralus`, `westus2`,
`eastus2euap`. Nothing in the design depends on co-location.

## Deploying

```bash
# Credentials never live in the repo — supply them from your shell.
export PG_ADMIN_USERNAME='<admin username>'
export PG_ADMIN_PASSWORD='<strong password>'

# Optional, once the Entra app registration exists:
export AUTH_CLIENT_ID='<client id>'
export AUTH_CLIENT_SECRET='<client secret>'
export SESSION_SECRET="$(openssl rand -hex 32)"

# Preview. Creates nothing.
az deployment sub what-if \
  --location eastus2 \
  --template-file infra/main.bicep \
  --parameters infra/parameters.dev.bicepparam

# Deploy. 12-15 minutes; Postgres is 8-10 of them.
az deployment sub create \
  --location eastus2 \
  --template-file infra/main.bicep \
  --parameters infra/parameters.dev.bicepparam
```

## Tearing down

The template owns the resource group, so one delete removes everything:

```bash
az group delete --name rg-zuqah-cs-dev --yes

# These two soft-delete and hold their globally unique names, so a redeploy
# inside the retention window fails with "name is already in use".
az keyvault purge --name kv-zuqah-cs-dev --location eastus2
az cognitiveservices account purge --name aif-zuqah-cs-dev \
  --resource-group rg-zuqah-cs-dev --location eastus2
```

The vault is created with the minimum 7-day retention and **no purge protection**
precisely so this is possible. Purge protection would hold the name for 90 days.

## Permissions: Owner required

This environment is deployed with **Owner** access, which unlocks:

- Role assignments — used to grant `Azure AI Developer` to the Foundry project
  so agents can be created and managed through the Foundry portal.

| Need | Approach |
| --- | --- |
| App Service reads Key Vault | Access policy (control-plane only, no role assignment needed) |
| App Service pulls images from ACR | Registry admin username and password stored in Key Vault |
| Foundry Agent creation | `Azure AI Developer` role assignment — requires Owner |

The App Service still gets a system-assigned identity; it is granted read access
by policy rather than by role. Full reasoning is in
[ADR-0007](../docs/decisions/0007-no-role-assignments.md).

## Secrets

Seven live in Key Vault. The template fills in four, because it just created the
resources they belong to.

| Secret | Filled in by |
| --- | --- |
| `FoundryApiKey` | **the template**, from the Foundry account |
| `SearchApiKey` | **the template**, from the Search service |
| `StorageConnection` | **the template**, from the storage account |
| `DatabaseUrl` | **the template**, from the Postgres server |
| `AuthClientSecret` | you, or `AUTH_CLIENT_SECRET` at deploy time |
| `SessionSecret` | you, or `SESSION_SECRET` at deploy time |
| `AzureDevOpsPat` | you, in Phase 5 |

## After the first deploy

1. **Register the redirect URI.** The deployment outputs `authRedirectUri`. Add it
   under Entra ID → App registrations → the app → Authentication → Web. Microsoft
   sign-in will not work until you do.
2. **Populate any empty secrets** listed above.
3. **Push the container image** to the provisioned ACR. Get the ACR name from the
   deployment output, then build and push:
   ```bash
   ACR=$(az deployment sub show -n main --query properties.outputs.acrName.value -o tsv)
   az acr build --registry "$ACR" --resource-group rg-zuqah-cs-dev \
     --image zuqah-cs/app:dev --file Dockerfile . --no-logs
   ```
   Until then the App Service will run but fail its health check — expected.
4. **Run database migrations.** `VECTOR` and `PG_TRGM` are already allow-listed,
   so `CREATE EXTENSION` will succeed.

## Changing region

Model deployments are pinned to a name *and* a version, and Azure rejects the
whole deployment once that combination retires — at preflight, before anything is
created. Check both before moving region:

```bash
az cognitiveservices model list -l <region> \
  --query "[?kind=='AIServices' && model.name=='gpt-5.1'].{v:model.version,skus:join(', ',model.skus[].name)}" \
  -o table
```
