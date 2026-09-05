// =============================================================================
//  DEV environment — the only environment this demo has.
//
//  This is the only file you edit to retarget a deployment. It is typed and
//  validated against main.bicep at compile time, unlike a JSON parameters file.
//
//  Secrets are never written here. They come from the deploying shell; anything
//  left unset is created as an empty Key Vault secret and populated afterwards.
// =============================================================================
using './main.bicep'

param workload = 'zuqah-cs'
param environment = 'dev'
param location = 'eastus2'

// --- compute -------------------------------------------------------------------
param appServicePlanSkuName = 'B2'
param appServicePlanSkuTier = 'Basic'

// --- AI ------------------------------------------------------------------------
// One Foundry account provides the model, the agent runtime, Content Safety and
// Document Intelligence. See ADR-0008.
param foundryProjectName = 'proj-service-agent'
param foundryProjectDisplayName = 'Zuqah Technologies Service Agent'

param agentModelName = 'gpt-5.1'
param agentModelVersion = '2025-11-13'
param agentModelCapacity = 100

param embeddingModelName = 'text-embedding-3-large'
param embeddingModelVersion = '1'
param embeddingModelCapacity = 100

// --- search --------------------------------------------------------------------
// `basic` is the cheapest tier with the semantic ranker, which is the reason we
// chose AI Search at all. See ADR-0003.
param searchSkuName = 'basic'

// Set to `location` if eastus2 has AI Search capacity at deployment time.
// If InsufficientResourcesAvailable, try eastus or swedencentral.
param searchLocation = 'eastus'

// --- application configuration ---------------------------------------------------
// Fill in authClientId once an Entra app registration exists.
// In demo mode (AUTH_MODE=demo) it is not required.
param authClientId = readEnvironmentVariable('AUTH_CLIENT_ID', '')
param authTenantId = 'a5cb65ba-8f23-4e79-8f60-ce12ed3a34b8'
param publicAppEnv = 'dev'

// --- tickets (Phase 5) -----------------------------------------------------------
param azureDevOpsOrgUrl = readEnvironmentVariable('AZURE_DEVOPS_ORG_URL', '')
param azureDevOpsProject = readEnvironmentVariable('AZURE_DEVOPS_PROJECT', '')

// --- secrets ----------------------------------------------------------------------
param authClientSecret = readEnvironmentVariable('AUTH_CLIENT_SECRET', '')
param sessionSecret = readEnvironmentVariable('SESSION_SECRET', '')
param azureDevOpsPat = readEnvironmentVariable('AZURE_DEVOPS_PAT', '')

// Grants whoever deploys read access to the vault's secrets. Without it the
// vault is readable only by the App Service, and the ingestion and migration
// scripts cannot fetch the database connection string.
//   export DEPLOYER_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)
param deployerObjectId = readEnvironmentVariable('DEPLOYER_OBJECT_ID', '0f264c0a-9d07-49f4-86a3-ab1f5bacdfce')
