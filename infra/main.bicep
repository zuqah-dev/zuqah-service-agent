// =============================================================================
//  Zuqah Technologies Service Agent — the whole Azure environment, as code.
//
//  Deploys at SUBSCRIPTION scope so the resource group is created by the
//  template too. Nothing is assumed to exist beforehand, so teardown is a single
//  `az group delete`.
//
//    az deployment sub create \
//      --location eastus2 \
//      --template-file infra/main.bicep \
//      --parameters infra/parameters.dev.bicepparam
//
//  ---------------------------------------------------------------------------
//  STRUCTURE
//
//  Every resource lives in its own module. This file does three things:
//    1. Creates the resource group.
//    2. Computes every resource NAME in one place, from abbreviations.json.
//    3. Calls the modules and wires their outputs together.
//
//  Nothing is sequenced by hand — referencing another module's output creates
//  the dependency and Bicep works out the order.
//
//  ---------------------------------------------------------------------------
//  FULLY SELF-CONTAINED
//
//  The Container Registry is provisioned as part of this environment — no
//  dependency on a shared registry. One `az deployment sub create` creates
//  everything; one `az group delete` removes it all.
// =============================================================================

targetScope = 'subscription'

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------

@description('Workload name. Drives every resource name.')
@minLength(3)
@maxLength(20)
param workload string

@description('Environment suffix.')
@allowed([
  'dev'
  'test'
  'prod'
])
param environment string

@description('Azure region for every resource.')
param location string

// --- compute -----------------------------------------------------------------

@description('App Service Plan SKU name.')
param appServicePlanSkuName string

@description('App Service Plan SKU tier.')
param appServicePlanSkuTier string

// --- AI ----------------------------------------------------------------------
// One AI Foundry account serves the model, the agent runtime, Content Safety and
// Document Intelligence. See docs/decisions/0008-single-foundry-account.md.

@description('Name of the AI Foundry project that will hold the knowledge agent.')
param foundryProjectName string

@description('Display name for the Foundry project.')
param foundryProjectDisplayName string

@description('Chat model used by the agent.')
param agentModelName string

@description('Version of the chat model.')
param agentModelVersion string

@description('Throughput for the chat model, in thousands of tokens per minute.')
param agentModelCapacity int

@description('Embedding model used to index the knowledge base.')
param embeddingModelName string

@description('Version of the embedding model.')
param embeddingModelVersion string

@description('Throughput for the embedding model, in thousands of tokens per minute.')
param embeddingModelCapacity int

// --- search ------------------------------------------------------------------

@description('Azure AI Search SKU. `basic` or above is required for the semantic ranker.')
param searchSkuName string

@description('''
Region for Azure AI Search. Separate from `location` because AI Search capacity is
allocated per region and can be exhausted independently of everything else.

Cross-region latency between the app and the index is a few milliseconds and does
not matter here. Set this to `location` whenever the primary region has capacity.
''')
param searchLocation string = location

// --- application configuration -------------------------------------------------

@description('Entra app registration client ID.')
param authClientId string = ''

@description('Entra tenant ID.')
param authTenantId string

@description('Value of PUBLIC_APP_ENV.')
param publicAppEnv string

@description('Azure DevOps organisation URL used for demo tickets. Phase 5.')
param azureDevOpsOrgUrl string = ''

@description('Azure DevOps project that holds demo tickets. Phase 5.')
param azureDevOpsProject string = ''

@description('Log Analytics retention in days. 30 is the free allowance.')
param logAnalyticsRetentionInDays int = 30

// --- secrets supplied from the deploying environment ---------------------------
// Empty defaults so the template compiles without them. Anything left blank is
// created as an empty Key Vault secret and populated afterwards.

@description('Entra app registration client secret.')
@secure()
param authClientSecret string = ''

@description('Signing secret for the session cookie.')
@secure()
param sessionSecret string = ''

@description('Azure DevOps personal access token. Phase 5.')
@secure()
param azureDevOpsPat string = ''

@description('''
Object id of the principal running the deployment, granted read access to Key
Vault secrets so that ingestion and migration scripts can reach them.
Get it with:  az ad signed-in-user show --query id -o tsv
''')
param deployerObjectId string = ''

// -----------------------------------------------------------------------------
// VARIABLES
// -----------------------------------------------------------------------------

var abbreviations = loadJsonContent('abbreviations.json')

var baseName = '${workload}-${environment}'

var resourceGroupName = '${abbreviations.resourcesResourceGroups}${baseName}'
var logAnalyticsWorkspaceName = '${abbreviations.operationalInsightsWorkspaces}${baseName}'
var applicationInsightsName = '${abbreviations.insightsComponents}${baseName}'
var keyVaultName = '${abbreviations.keyVaultVaults}${baseName}'
var foundryAccountName = '${abbreviations.cognitiveServicesAiFoundry}${baseName}'
var searchServiceName = '${abbreviations.searchSearchServices}${baseName}'
var appServicePlanName = '${abbreviations.webServerFarms}${baseName}'
var appServiceName = '${abbreviations.webSitesAppService}${baseName}'

// Storage account names allow only lowercase letters and digits, max 24 chars,
// and are globally unique — so the hyphens come out and a deterministic hash
// goes on the end.
var storageAccountName = take(
  '${abbreviations.storageStorageAccounts}${replace(baseName, '-', '')}${uniqueString(subscription().id, baseName)}',
  24
)

// Container registry names: alphanumeric only, 5–50 chars, globally unique.
var acrName = take(
  '${abbreviations.containerRegistries}${replace(baseName, '-', '')}${uniqueString(subscription().id, baseName)}',
  24
)

// The container image path is derived from the provisioned ACR login server so
// the deploy script and Bicep always agree on the exact path.
var containerImage = '${acrName}.azurecr.io/${workload}/app:dev'

var commonTags = {
  application: 'Zuqah Technologies Service Agent'
  environment: environment
  workload: workload
  managedBy: 'bicep'
  purpose: 'demo'
}

// -----------------------------------------------------------------------------
// RESOURCE GROUP
// -----------------------------------------------------------------------------

resource rg 'Microsoft.Resources/resourceGroups@2024-11-01' = {
  name: resourceGroupName
  location: location
  tags: commonTags
}

// -----------------------------------------------------------------------------
// MODULES
// -----------------------------------------------------------------------------

// 1. Log Analytics
module logAnalytics 'modules/logAnalytics.bicep' = {
  name: 'logAnalytics-deployment'
  scope: rg
  params: {
    name: logAnalyticsWorkspaceName
    location: location
    tags: commonTags
    retentionInDays: logAnalyticsRetentionInDays
  }
}

// 2. Application Insights
module applicationInsights 'modules/applicationInsights.bicep' = {
  name: 'applicationInsights-deployment'
  scope: rg
  params: {
    name: applicationInsightsName
    location: location
    tags: commonTags
    workspaceResourceId: logAnalytics.outputs.workspaceId
  }
}

// 3. Container Registry — provisioned here so the environment is fully self-contained
module containerRegistry 'modules/containerRegistry.bicep' = {
  name: 'containerRegistry-deployment'
  scope: rg
  params: {
    name: acrName
    location: location
    tags: commonTags
  }
}

// 4. AI Foundry — account, project, and both model deployments
module aiFoundry 'modules/aiFoundry.bicep' = {
  name: 'aiFoundry-deployment'
  scope: rg
  params: {
    name: foundryAccountName
    location: location
    tags: commonTags
    projectName: foundryProjectName
    projectDisplayName: foundryProjectDisplayName
    agentModelName: agentModelName
    agentModelVersion: agentModelVersion
    agentModelCapacity: agentModelCapacity
    embeddingModelName: embeddingModelName
    embeddingModelVersion: embeddingModelVersion
    embeddingModelCapacity: embeddingModelCapacity
  }
}

// 5. Azure AI Search — the knowledge base index lives here
module aiSearch 'modules/aiSearch.bicep' = {
  name: 'aiSearch-deployment'
  scope: rg
  params: {
    name: searchServiceName
    location: searchLocation
    tags: commonTags
    skuName: searchSkuName
  }
}

// 6. Storage — source documents and uploaded screenshots
module storage 'modules/storage.bicep' = {
  name: 'storage-deployment'
  scope: rg
  params: {
    name: storageAccountName
    location: location
    tags: commonTags
  }
}

// 7. Key Vault — reads keys from the resources above, so it runs after them
module keyVault 'modules/keyVault.bicep' = {
  name: 'keyVault-deployment'
  scope: rg
  params: {
    name: keyVaultName
    location: location
    tags: commonTags
    foundryAccountName: aiFoundry.outputs.accountName
    searchServiceName: aiSearch.outputs.searchServiceName
    storageAccountName: storage.outputs.storageAccountName
    authClientSecret: authClientSecret
    sessionSecret: sessionSecret
    azureDevOpsPat: azureDevOpsPat
    deployerObjectId: deployerObjectId
  }
}

// 8. App Service Plan
module appServicePlan 'modules/appServicePlan.bicep' = {
  name: 'appServicePlan-deployment'
  scope: rg
  params: {
    name: appServicePlanName
    location: location
    tags: commonTags
    skuName: appServicePlanSkuName
    skuTier: appServicePlanSkuTier
  }
}

// 9. App Service — wired to everything above
module appService 'modules/appService.bicep' = {
  name: 'appService-deployment'
  scope: rg
  params: {
    name: appServiceName
    location: location
    tags: commonTags
    appServicePlanId: appServicePlan.outputs.appServicePlanId
    containerImage: containerImage
    acrName: containerRegistry.outputs.acrName
    keyVaultName: keyVault.outputs.keyVaultName
    applicationInsightsConnectionString: applicationInsights.outputs.connectionString
    foundryAccountName: aiFoundry.outputs.accountName
    foundryOpenAiEndpoint: aiFoundry.outputs.openAiEndpoint
    foundryProjectEndpoint: aiFoundry.outputs.projectEndpoint
    foundryCognitiveEndpoint: aiFoundry.outputs.cognitiveServicesEndpoint
    agentModelDeployment: aiFoundry.outputs.agentModelDeploymentName
    embeddingModelDeployment: aiFoundry.outputs.embeddingModelDeploymentName
    searchEndpoint: aiSearch.outputs.searchEndpoint
    storageAccountName: storage.outputs.storageAccountName
    authClientId: authClientId
    authTenantId: authTenantId
    publicAppEnv: publicAppEnv
    azureDevOpsOrgUrl: azureDevOpsOrgUrl
    azureDevOpsProject: azureDevOpsProject
  }
}

// -----------------------------------------------------------------------------
// OUTPUTS
// -----------------------------------------------------------------------------

output resourceGroupName string = rg.name
output appServiceName string = appService.outputs.appServiceName
output appServiceUrl string = appService.outputs.appServiceUrl
output appServicePrincipalId string = appService.outputs.appServicePrincipalId
output keyVaultName string = keyVault.outputs.keyVaultName
output foundryAccountName string = aiFoundry.outputs.accountName
output foundryProjectEndpoint string = aiFoundry.outputs.projectEndpoint
output searchEndpoint string = aiSearch.outputs.searchEndpoint
output storageAccountName string = storage.outputs.storageAccountName
output applicationInsightsName string = applicationInsights.outputs.applicationInsightsName
output acrName string = containerRegistry.outputs.acrName
output containerImage string = containerImage

@description('Register this as a redirect URI on the Entra app registration.')
output authRedirectUri string = '${appService.outputs.appServiceUrl}/api/auth-callback'
