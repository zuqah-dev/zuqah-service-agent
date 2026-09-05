// The App Service that runs the application container.
//
// KEY VAULT ACCESS is granted here, not in keyVault.bicep, because the policy
// needs this site's managed identity — which does not exist until the site
// does. The site is created first, then granted access. App Service retries
// Key Vault reference resolution, so the brief window where settings cannot
// resolve is self-healing.

@description('App Service name. Becomes the hostname, so it must be globally unique.')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Resource id of the App Service Plan.')
param appServicePlanId string

@description('Fully qualified container image, including the registry hostname and tag.')
param containerImage string

@description('Name of the container registry (provisioned in the same resource group).')
param acrName string

@description('Key Vault the application reads its secrets from.')
param keyVaultName string

@description('Application Insights connection string.')
param applicationInsightsConnectionString string

@description('AI Foundry account name.')
param foundryAccountName string

@description('OpenAI-compatible endpoint on the Foundry account.')
param foundryOpenAiEndpoint string

@description('Foundry project endpoint, where agents are created and run.')
param foundryProjectEndpoint string

@description('Content Safety and Document Intelligence endpoint.')
param foundryCognitiveEndpoint string

@description('Deployment name of the chat model.')
param agentModelDeployment string

@description('Deployment name of the embedding model.')
param embeddingModelDeployment string

@description('Azure AI Search endpoint.')
param searchEndpoint string

@description('Storage account name.')
param storageAccountName string

@description('Entra app registration client ID.')
param authClientId string = ''

@description('Entra tenant ID.')
param authTenantId string

@description('Value of PUBLIC_APP_ENV.')
param publicAppEnv string

@description('Azure DevOps organisation URL. Phase 5.')
param azureDevOpsOrgUrl string = ''

@description('Azure DevOps project holding demo tickets. Phase 5.')
param azureDevOpsProject string = ''

@description('Port the container listens on.')
param containerPort string = '3000'

@description('Name of the AI Search index holding the knowledge base.')
param searchIndexName string = 'zuqah-policies'

// The registry is in the same resource group as the App Service (no cross-RG scope needed).
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

resource app 'Microsoft.Web/sites@2024-04-01' = {
  name: name
  location: location
  tags: tags
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerImage}'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      healthCheckPath: '/healthcheck'
      appSettings: [
        // --- container ---
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://${acr.properties.loginServer}'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_USERNAME'
          value: acr.listCredentials().username
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_PASSWORD'
          value: acr.listCredentials().passwords[0].value
        }
        {
          name: 'DOCKER_ENABLE_CI'
          value: 'true'
        }
        {
          name: 'WEBSITES_PORT'
          value: containerPort
        }
        {
          name: 'PORT'
          value: containerPort
        }

        // --- secrets, by Key Vault reference ---
        {
          name: 'AUTH_CLIENT_SECRET'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=AuthClientSecret)'
        }
        {
          name: 'SESSION_SECRET'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=SessionSecret)'
        }
        {
          name: 'DATABASE_URL'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=DatabaseUrl)'
        }
        {
          name: 'AZURE_FOUNDRY_API_KEY'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=FoundryApiKey)'
        }
        {
          name: 'AZURE_SEARCH_API_KEY'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=SearchApiKey)'
        }
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=StorageConnection)'
        }
        {
          name: 'AZURE_DEVOPS_PAT'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=AzureDevOpsPat)'
        }

        // --- auth ---
        {
          name: 'AUTH_CLIENT_ID'
          value: authClientId
        }
        {
          name: 'AUTH_TENANT_ID'
          value: authTenantId
        }

        // --- AI ---
        {
          name: 'AZURE_FOUNDRY_ACCOUNT_NAME'
          value: foundryAccountName
        }
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: foundryOpenAiEndpoint
        }
        {
          name: 'AZURE_FOUNDRY_PROJECT_ENDPOINT'
          value: foundryProjectEndpoint
        }
        {
          name: 'AZURE_COGNITIVE_ENDPOINT'
          value: foundryCognitiveEndpoint
        }
        {
          name: 'AZURE_OPENAI_AGENT_MODEL'
          value: agentModelDeployment
        }
        {
          name: 'AZURE_OPENAI_EMBEDDING_MODEL'
          value: embeddingModelDeployment
        }

        // --- search ---
        {
          name: 'AZURE_SEARCH_ENDPOINT'
          value: searchEndpoint
        }
        {
          name: 'AZURE_SEARCH_INDEX'
          value: searchIndexName
        }

        // --- storage ---
        {
          name: 'AZURE_STORAGE_ACCOUNT'
          value: storageAccountName
        }

        // --- tickets (Phase 5) ---
        {
          name: 'AZURE_DEVOPS_ORG_URL'
          value: azureDevOpsOrgUrl
        }
        {
          name: 'AZURE_DEVOPS_PROJECT'
          value: azureDevOpsProject
        }

        // --- telemetry ---
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: applicationInsightsConnectionString
        }

        // --- runtime ---
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'PUBLIC_APP_ENV'
          value: publicAppEnv
        }
        {
          name: 'WEBSITE_HEALTHCHECK_MAXPINGFAILURES'
          value: '10'
        }
      ]
    }
  }
}

// Granted after the site exists, because it needs the site's managed identity.
resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2024-11-01' = {
  name: '${keyVaultName}/add'
  properties: {
    accessPolicies: [
      {
        tenantId: app.identity.tenantId
        objectId: app.identity.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

output appServiceName string = app.name
output appServiceUrl string = 'https://${app.properties.defaultHostName}'
output appServicePrincipalId string = app.identity.principalId
