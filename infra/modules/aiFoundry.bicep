// =============================================================================
//  Azure AI Foundry — one account for everything AI.
//
//  kind: 'AIServices' with allowProjectManagement enabled gives, on a single
//  resource:
//
//    * Chat and embedding models      →  <name>.openai.azure.com
//    * Foundry Agents (via a project) →  <name>.services.ai.azure.com/api/projects/<project>
//    * Content Safety                 →  <name>.cognitiveservices.azure.com
//    * Document Intelligence          →  <name>.cognitiveservices.azure.com
//
//  See docs/decisions/0008-single-foundry-account.md for why this replaced four
//  separate resources.
//
//  Model deployments are pinned to a name AND a version, and Azure rejects the
//  whole deployment once that combination retires — at preflight, before
//  anything is created. Verify both before changing region:
//
//    az cognitiveservices model list -l eastus2 \
//      --query "[?kind=='AIServices' && model.name=='gpt-5.1'].{v:model.version}" -o table
// =============================================================================

@description('Name of the AI Foundry account. Becomes the hostname, so it must be globally unique.')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Name of the child project that will hold the knowledge agent.')
param projectName string

@description('Human-readable name for the project, shown in the Foundry portal.')
param projectDisplayName string

@description('Chat model deployed for the agent.')
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

@description('Deployment SKU. GlobalStandard, not Standard — Azure retired regional Standard for most current models.')
param deploymentSkuName string = 'GlobalStandard'

resource foundry 'Microsoft.CognitiveServices/accounts@2025-09-01' = {
  name: name
  location: location
  tags: tags
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    // Required for the *.services.ai.azure.com and *.openai.azure.com hostnames.
    customSubDomainName: name
    // Without this the account cannot hold projects, and therefore cannot hold
    // agents. It cannot be turned on later without recreating the account.
    allowProjectManagement: true
    publicNetworkAccess: 'Enabled'
    // Key-based auth is required: the deploying account cannot create the role
    // assignments that Entra-only auth would need. See ADR-0007.
    disableLocalAuth: false
  }
}

// The project is what agents belong to. Its endpoint is what the application and
// the Foundry portal both address.
resource project 'Microsoft.CognitiveServices/accounts/projects@2025-09-01' = {
  parent: foundry
  name: projectName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    displayName: projectDisplayName
    description: 'Knowledge agent for the Zuqah Technologies Service Agent.'
  }
}

resource agentModel 'Microsoft.CognitiveServices/accounts/deployments@2025-09-01' = {
  parent: foundry
  name: agentModelName
  sku: {
    name: deploymentSkuName
    capacity: agentModelCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: agentModelName
      version: agentModelVersion
    }
  }
}

resource embeddingModel 'Microsoft.CognitiveServices/accounts/deployments@2025-09-01' = {
  parent: foundry
  name: embeddingModelName
  sku: {
    name: deploymentSkuName
    capacity: embeddingModelCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: embeddingModelName
      version: embeddingModelVersion
    }
  }
  // One deployment at a time — Azure rejects concurrent changes to an account.
  dependsOn: [
    agentModel
  ]
}

output accountName string = foundry.name
output accountId string = foundry.id
output projectName string = project.name

@description('OpenAI-compatible endpoint, for chat and embedding calls.')
output openAiEndpoint string = 'https://${name}.openai.azure.com/'

@description('Content Safety and Document Intelligence endpoint.')
output cognitiveServicesEndpoint string = 'https://${name}.cognitiveservices.azure.com/'

@description('Foundry project endpoint — where agents are created and run.')
output projectEndpoint string = 'https://${name}.services.ai.azure.com/api/projects/${projectName}'

output agentModelDeploymentName string = agentModel.name
output embeddingModelDeploymentName string = embeddingModel.name
