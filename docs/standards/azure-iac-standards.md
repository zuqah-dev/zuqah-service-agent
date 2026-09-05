# Azure Infrastructure-as-Code Standards

**Status:** Active · **Applies to:** any Azure project using Bicep
**Adopt by:** copying this file into `docs/standards/` and referencing it from
`CLAUDE.md` — see [Adopting this in another project](#adopting-this-in-another-project).

Every rule here has a reason, and most were paid for. Where a rule exists because
something failed, the failure is named — a rule without its reason gets either
ignored or cargo-culted, and both are worse than no rule.

---

## Quick reference

| # | Rule | Why |
| --- | --- | --- |
| 1 | Deploy at **subscription scope**; the template creates its own resource group | Teardown becomes one command |
| 2 | **One module per resource**, `main.bicep` only names and wires | Modules stay readable and reusable |
| 3 | Compute **every name in one place**, from a shared abbreviations file | A naming change is one edit |
| 4 | **Never** put a secret in the repo, including in a parameter file | Obvious, still violated constantly |
| 5 | Use **`.bicepparam`**, not JSON parameter files | Typed and validated at compile time |
| 6 | Pin **stable API versions**; verify against the provider | Preview versions vanish |
| 7 | Verify **model/SKU availability per region** before writing it in | Preflight failures waste whole cycles |
| 8 | Give **capacity-constrained resources their own location parameter** | One region running out shouldn't move everything |
| 9 | Grant the **deployer** access to the vault it just created | Otherwise you cannot read your own secrets |
| 10 | Assume **Contributor**, not Owner | Role assignments need permissions most people lack |
| 11 | Make the environment **reproducible from empty**, and prove it | An IaC repo that has never been run from zero is not IaC |
| 12 | Document **soft-delete purges** in the teardown instructions | Redeploy fails with a confusing name-in-use error |
| 13 | `what-if` **before** every first deployment | Free, and catches preflight errors |
| 14 | Deployment scripts **verify the thing they claim to have done** | Azure will report success for a no-op |

---

## 1. Structure

```
infra/
├── main.bicep                  Creates the RG, computes names, calls modules
├── abbreviations.json          CAF naming prefixes
├── parameters.dev.bicepparam   One per environment; the only file you edit
├── README.md                   What exists, how to deploy, how to tear down
└── modules/
    ├── logAnalytics.bicep
    ├── keyVault.bicep
    └── …one file per resource
```

### `main.bicep` does exactly three things

1. Creates the resource group
2. Computes every resource **name**
3. Calls modules and wires their outputs together

It contains no resource definitions beyond the resource group. If you are
tempted to add one "just this once", make a module — the exception always grows.

```bicep
targetScope = 'subscription'

resource rg 'Microsoft.Resources/resourceGroups@2024-11-01' = {
  name: resourceGroupName
  location: location
  tags: commonTags
}

module keyVault 'modules/keyVault.bicep' = {
  name: 'keyVault-deployment'
  scope: rg
  params: { name: keyVaultName, location: location, tags: commonTags }
}
```

### Never sequence by hand

Referencing another module's output *is* the dependency. Bicep derives the order.
An explicit `dependsOn` between modules is almost always a sign that a value
should have been passed instead.

`dependsOn` **is** legitimate within a module when a provider serialises
operations — Azure OpenAI rejects concurrent deployment changes to one account,
for instance:

```bicep
resource embeddingModel '…/deployments@2025-09-01' = {
  parent: account
  // One deployment at a time — Azure rejects concurrent changes to an account.
  dependsOn: [ agentModel ]
}
```

---

## 2. Naming

Names come from a data file, not from string literals scattered through
templates.

```json
{
  "resourcesResourceGroups": "rg-",
  "keyVaultVaults": "kv-",
  "storageStorageAccounts": "st"
}
```

```bicep
var abbreviations = loadJsonContent('abbreviations.json')
var baseName = '${workload}-${environment}'
var keyVaultName = '${abbreviations.keyVaultVaults}${baseName}'
```

### Globally unique names

These must be unique across all of Azure, and a collision fails at preflight:

- Storage accounts · Key Vaults · Cognitive Services accounts
- App Services · Search services · Postgres servers · Container registries

Storage is the awkward one — lowercase alphanumeric only, 3–24 characters:

```bicep
var storageAccountName = take(
  '${abbreviations.storageStorageAccounts}${replace(baseName, '-', '')}${uniqueString(subscription().id, baseName)}',
  24
)
```

`uniqueString` is deterministic for the same inputs, so redeployment produces the
same name. That is the point — a random suffix would orphan the previous
resource on every deploy.

### Tag everything, from one variable

```bicep
var commonTags = {
  application: 'Zuqah Technologies Service Agent'
  environment: environment
  workload: workload
  managedBy: 'bicep'
  purpose: 'demo'
}
```

`managedBy: 'bicep'` matters more than it looks: it tells the next person that
portal edits will be reverted.

---

## 3. Parameters

Use `.bicepparam`. It is typed and validated against the template at compile
time; a JSON parameter file is not.

```bicep
using './main.bicep'

param workload = 'zuqah-cs'
param environment = 'dev'
param location = 'eastus2'

// Secrets come from the deploying shell, never from this file.
param postgresAdminPassword = readEnvironmentVariable('PG_ADMIN_PASSWORD', '')
```

### Every parameter carries a `@description`

Not decoration — it is what `what-if` and the portal show, and it is where the
reason lives.

```bicep
@description('''
Region for Azure AI Search. Separate from `location` because AI Search capacity
is allocated per region and can be exhausted independently — on 2026-08-31
`eastus2` returned InsufficientResourcesAvailable for a basic service while every
other resource provisioned there without trouble.
''')
param searchLocation string = location
```

### Constrain what you can

```bicep
@allowed(['dev', 'test', 'prod'])
param environment string

@minLength(3)
@maxLength(20)
param workload string

@secure()
param administratorPassword string
```

`@secure()` keeps the value out of deployment history and logs. Use it on every
secret parameter without exception.

### Mode-dependent requirements go in a refinement, not a second template

Where a parameter is required only in some configurations, express that once:

```bicep
// In application code — the same principle applies in Bicep with a union type
// or an assertion in the module that consumes it.
```

Two near-identical templates drift. One template with a conditional does not.

---

## 4. Secrets

**Nothing secret is ever committed.** Not in a parameter file, not in a default,
not in a comment, not in a test fixture.

The pattern:

1. The deploying shell exports the secret
2. `.bicepparam` reads it with `readEnvironmentVariable(NAME, '')`
3. The template writes it into Key Vault
4. The application reads it via a Key Vault reference

```bash
export PG_ADMIN_PASSWORD='…'
az deployment sub create --template-file infra/main.bicep --parameters infra/parameters.dev.bicepparam
```

### Let the template fill in what it can

The template just created the resources, so it can read their keys. Do that
rather than making a human copy them:

```bicep
resource search 'Microsoft.Search/searchServices@2025-05-01' existing = {
  name: searchServiceName
}

resource searchApiKey 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'SearchApiKey'
  properties: { value: search.listAdminKeys().primaryKey }
}
```

Anything the template cannot know is created **empty**, so the shape of the vault
is complete and populating it is a visible task rather than a discovery.

### Grant the deployer access to the vault

> **Rule 9, and it cost an hour.** A template created a vault, granted an access
> policy to the App Service, and to nobody else. `az keyvault secret list`
> then returned **Forbidden for the account that had just created it** —
> and every ingestion and migration script that needed the connection string
> failed.

```bicep
@description('''
Object id of the principal running the deployment, granted get/list/set so that
migration and ingestion scripts can read the connection string.
  az ad signed-in-user show --query id -o tsv
''')
param deployerObjectId string = ''

properties: {
  accessPolicies: empty(deployerObjectId) ? [] : [
    {
      tenantId: subscription().tenantId
      objectId: deployerObjectId
      permissions: { secrets: ['get', 'list', 'set'] }
    }
  ]
}
```

### Soft delete: choose deliberately

Key Vault and Cognitive Services accounts **soft-delete and hold their globally
unique names**. For a long-lived environment that is protection. For anything
rebuilt often it is an obstruction.

```bicep
enableSoftDelete: true
softDeleteRetentionInDays: 7      // the minimum
enablePurgeProtection: null       // OFF, so the name can be reclaimed
```

Purge protection reserves the name for **90 days** and cannot be turned off once
enabled. Enable it in production; leave it off anywhere you will redeploy.

---

## 5. Permissions — assume Contributor

Most people have **Contributor**, which **cannot write role assignments**
(`Microsoft.Authorization/roleAssignments/write` needs Owner or User Access
Administrator).

A template that needs Owner is a template most of your team cannot deploy.

| Need | Conventional | Contributor-friendly |
| --- | --- | --- |
| App reads Key Vault | Managed identity + `Key Vault Secrets User` | **Access policy** — control-plane, so Contributor can set it |
| Pull from a registry | Managed identity + `AcrPull` | **Registry admin credentials** |
| Access storage | Managed identity + `Storage Blob Data Reader` | **Connection string** in Key Vault |

Still give resources a system-assigned identity — it costs nothing and makes the
migration to RBAC a change of grant rather than a change of design.

**Say this out loud when presenting.** Key-based auth where managed identity
would be preferable is a deliberate constraint, not an oversight, and naming it
first is better than being caught by it.

### Where this does not work

Some data planes are **Entra-only and reject keys entirely**. Azure AI Foundry
Agents are one:

```
GET …/api/projects/<project>/assistants
  Bearer <Entra token>   →  401 PermissionDenied
  api-key: <account key> →  403 UserError
```

Find these early. They convert into a one-time request to somebody with Owner,
and that is a person-dependency to discover in week one, not week three.

---

## 6. API versions

Pin **stable** versions. Preview versions are removed without notice and take
your template with them.

```bash
# All versions for a resource type
az provider show -n Microsoft.KeyVault \
  --query "resourceTypes[?resourceType=='vaults'].apiVersions[]" -o tsv | grep -v preview
```

Use the same version consistently within a module, including on `existing`
references. Mixed versions in one file produce type errors that read as unrelated.

---

## 7. Region, capacity and model availability

### Capacity is per region *and* per SKU, and it runs out

> A deployment failed with
> `InsufficientResourcesAvailable: The region 'eastus2' is currently out of the
> resources required to provision new services` — for Azure AI Search, while every
> other resource provisioned in that region without trouble.

Give capacity-constrained resources their own location parameter, defaulting to
the main one:

```bicep
@description('Separate from `location` because capacity is allocated per region.')
param searchLocation string = location
```

Then a capacity failure is a one-line parameter change, not a decision about
moving the entire environment. Cross-region latency between an app and its
services is a few milliseconds and rarely matters.

**Do not resolve a capacity failure by upgrading the SKU** unless you intended to
pay for it. That is how a budget quietly triples.

### Verify models before writing them into a template

Model deployments are pinned to a **name and a version**, and Azure rejects the
whole deployment once that pair retires — at preflight, before anything is
created.

```bash
az cognitiveservices model list -l eastus2 \
  --query "[?kind=='AIServices' && model.name=='gpt-5.1'].{v:model.version,skus:join(', ',model.skus[].name)}" \
  -o table
```

Check the **SKU list too**. `Standard` and `GlobalStandard` are not
interchangeable, and most current models are `GlobalStandard` only.

### Prefer one multi-service resource where one exists

An `AIServices` Cognitive Services account provides chat, embeddings, Foundry
agents, Content Safety, Document Intelligence, Speech, Translator and Vision from
a single resource. Four separate accounts means four things to provision, four
keys, four purges. Fewer resources with the same capability is better.

---

## 8. Validation, in order

Each step is cheap and catches a different class of failure. Run all of them.

```bash
# 1. Does it compile?
az bicep build --file infra/main.bicep --stdout > /dev/null

# 2. Do the parameters satisfy the template?
az bicep build-params --file infra/parameters.dev.bicepparam --stdout > /dev/null

# 3. What would it actually do? Creates nothing.
az deployment sub what-if \
  --location eastus2 \
  --template-file infra/main.bicep \
  --parameters infra/parameters.dev.bicepparam
```

**Treat warnings as errors.** `BCP036` type warnings are usually a genuine value
mismatch — `'default'` where the API expects `'Default'` — that will fail at
deployment.

Read the `what-if` output. Confirm the count, confirm everything is `Create` on a
first run, and confirm nothing says `Delete`.

`Unsupported — cannot predict changes` is normal for anything depending on a
runtime value, such as a Key Vault access policy that needs a managed identity
that does not exist yet.

---

## 9. Teardown must be one command

If it is not, the environment is not disposable, and an environment that is not
disposable will not be rebuilt — so nobody will discover that the template no
longer works.

```bash
az group delete --name rg-zuqah-cs-dev --yes

# Soft-deleted resources hold their globally unique names. Without these, a
# redeploy inside the retention window fails with "name is already in use" —
# which reads like a naming bug rather than a leftover.
az keyvault purge --name kv-zuqah-cs-dev --location eastus2
az cognitiveservices account purge --name aif-zuqah-cs-dev \
  --resource-group rg-zuqah-cs-dev --location eastus2
```

**Put the purge commands in the README.** Everyone hits this once; nobody should
hit it twice.

---

## 10. Deployment scripts must verify what they claim

Azure reports success for operations that did nothing. A deploy script that
trusts exit codes will confidently tell you it shipped code it did not ship.

### `restart` does not re-pull a container image

> A freshly built and pushed image was ignored. `az webapp restart` restarts the
> container **already present**. The site reported healthy, served correct
> answers, and ran the previous build. Nothing looked wrong.

```bash
# Forces the pull. `restart` alone does not.
az webapp config container set --name "$APP" --resource-group "$RG" \
  --container-image-name "$IMAGE"
```

### A health check on a stopped app never passes

If the app is stopped between uses, `restart` will not start it. Read the state,
act on it, and **restore it afterwards** so deploying cannot silently expose a
URL that was meant to be down.

```bash
was_running=$(az webapp show -n "$APP" -g "$RG" --query state -o tsv)
[ "$was_running" != "Running" ] && az webapp start -n "$APP" -g "$RG"
# … verify …
[ "$was_running" != "Running" ] && az webapp stop -n "$APP" -g "$RG"
```

### A healthy response may be the *old* build

`/healthcheck` returning 200 proves *a* container is serving, not *your*
container. Verify twice this way and you will draw two wrong conclusions.

Include a build stamp in the health payload and assert on it:

```jsonc
{ "status": "ok", "build": "ca9", "commit": "3f2a1c8" }
```

### Poll, do not sleep-and-check-once

A front end keeps answering for seconds after the platform reports `Stopped`. One
immediate check reports a false failure.

### Watch out for CLI log streaming on Windows

`az acr build` streams the remote build log; if the build output contains a
character the console codepage cannot encode (Vite prints `✓`), **the CLI dies
with a `UnicodeEncodeError` while the build continues server-side and succeeds**.
The command appears to fail when it has not.

```bash
az acr build … --no-logs
az acr task list-runs --registry "$ACR" --top 1 -o table   # watch it here instead
```

---

## 11. Container image traps adjacent to IaC

### `.dockerignore` negations do not work inside an excluded directory

> `data` was excluded and `!data/generated/pdf` was expected to re-include the
> PDFs. Docker never descends into an excluded directory, so the negation had no
> effect. The image shipped with no PDFs and every citation link 404'd — in
> Azure only, while working perfectly locally.

```
# Wrong — the negation never applies
data
!data/generated/pdf

# Right — exclude each level with /* and re-include
data/*
!data/generated
data/generated/*
!data/generated/pdf
```

### Assert at build time what the image must contain

Fail the build, not the demo:

```dockerfile
RUN test "$(ls -1 ./data/generated/pdf/*.pdf | wc -l)" -ge 15 \
    || (echo "ERROR: expected at least 15 PDFs in the image" && exit 1)
```

### Behind a TLS-terminating proxy, trust the proxy

> App Service terminates TLS and forwards over plain HTTP. A framework that
> validates `Origin` against the request's computed URL then sees
> `Origin: https://host` against `http://host` and rejects **every form
> submission** — with an error the framework sanitises, so neither the browser
> nor the logs name the cause.

```js
app.set("trust proxy", true);   // protocol now comes from X-Forwarded-Proto
```

This applies to Front Door, Application Gateway, nginx and any load balancer —
not just App Service. And note the diagnostic trap: **`curl` sends no `Origin`
header**, so every command-line test passes while every browser fails.

---

## 12. Documentation that has to exist

### `infra/README.md`

- What gets created — a table of resource, name, and anything non-obvious
- How to deploy, including which environment variables must be exported
- **How to tear down, including the purges**
- The permission model, and what it assumes about the deployer
- Anything surprising, with the reason: why a resource is in a different region,
  why a name has a suffix, why a setting is off

### Decision records

Any choice a reasonable person would question gets a short numbered file:
context, decision, why, what was rejected, consequences. When the choice is later
revisited — and it will be — the reasoning is there rather than reconstructed.

### Record failures, not just outcomes

The most valuable line in a README is usually the one that says *"this looks
broken and is not"*. Every trap in this document was found the expensive way; each
one written down is an hour somebody else does not lose.

---

## Pre-deployment checklist

Before the first deployment of any new environment:

- [ ] `az bicep build` — clean, **including warnings**
- [ ] `az bicep build-params` — clean
- [ ] `az deployment sub what-if` — reviewed; count and change types expected
- [ ] Model names, versions **and SKUs** verified for the target region
- [ ] API versions are stable, and exist on the provider
- [ ] No secret anywhere in the repository
- [ ] Deployer has been granted access to the Key Vault the template creates
- [ ] Teardown commands documented, **including purges**
- [ ] `infra/README.md` describes what exists and how to rebuild it
- [ ] The role assignments and app registrations you will need are **requested**,
      because they depend on other people

After the first successful deployment:

- [ ] Tear it down and rebuild it once. An IaC repository that has never been run
      from empty is a hypothesis, not infrastructure.

---

## Adopting this in another project

1. Copy this file to `docs/standards/azure-iac-standards.md`
2. Add to `CLAUDE.md`:

```markdown
## Infrastructure

Azure infrastructure follows `docs/standards/azure-iac-standards.md`.
Read it before creating or modifying anything under `infra/`.

Key constraints for this repository:
- Deploying account holds: <Contributor | Owner>
- Target subscription: <name>
- Primary region: <region>
```

3. When a rule here is broken deliberately, record why in a decision record
   rather than silently diverging. When a new trap is found, add it here — this
   document is only worth what the last person put into it.

---

*Principles transfer to Terraform and to other clouds. The specific commands do
not.*
