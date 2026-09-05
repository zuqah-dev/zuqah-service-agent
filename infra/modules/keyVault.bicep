// Key Vault, plus every secret the application reads.
//
// Three are filled in by the template, because it just created the resources:
//
//   FoundryApiKey     ← the template, from the AI Foundry account
//   SearchApiKey      ← the template, from the Search service
//   StorageConnection ← the template, from the storage account
//   DatabaseUrl       ← empty placeholder; populated in Phase 5 when Postgres is added
//   AuthClientSecret  ← you, or AUTH_CLIENT_SECRET at deploy time
//   SessionSecret     ← you, or SESSION_SECRET at deploy time
//   AzureDevOpsPat    ← you, in Phase 5
//
// ACCESS MODEL
// Access policies, not RBAC. Contributor can write access policies (control-plane)
// without the role assignment permission that Owner needs. See ADR-0007.
// The App Service adds its own policy in appService.bicep once its managed
// identity exists.
//
// Soft delete is 7 days with purge protection OFF, deliberately: a demo gets
// torn down and rebuilt, and purge protection would reserve the name for 90 days
// and make that impossible.

@description('Vault name. Globally unique, 3-24 characters.')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('AI Foundry account whose key is stored.')
param foundryAccountName string

@description('Search service whose admin key is stored.')
param searchServiceName string

@description('Storage account whose connection string is stored.')
param storageAccountName string

@description('Entra app registration client secret. Empty creates the secret unpopulated.')
@secure()
param authClientSecret string = ''

@description('Session cookie signing secret. Empty creates the secret unpopulated.')
@secure()
param sessionSecret string = ''

@description('Azure DevOps personal access token. Empty creates the secret unpopulated.')
@secure()
param azureDevOpsPat string = ''

@description('''
Object id of the principal running the deployment. Granted get/list/set on
secrets so that ingestion and migration scripts can read the service keys.

Without this the vault is readable only by the App Service. Empty skips the policy.

  az ad signed-in-user show --query id -o tsv
''')
param deployerObjectId string = ''

resource vault 'Microsoft.KeyVault/vaults@2024-11-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: false
    accessPolicies: empty(deployerObjectId)
      ? []
      : [
          {
            tenantId: subscription().tenantId
            objectId: deployerObjectId
            permissions: {
              secrets: [
                'get'
                'list'
                'set'
              ]
            }
          }
        ]
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: null
    publicNetworkAccess: 'Enabled'
  }
}

// --- resources we read keys from ----------------------------------------------

resource foundry 'Microsoft.CognitiveServices/accounts@2025-09-01' existing = {
  name: foundryAccountName
}

resource search 'Microsoft.Search/searchServices@2025-05-01' existing = {
  name: searchServiceName
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

// --- secrets the template fills in -------------------------------------------

resource foundryApiKey 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'FoundryApiKey'
  properties: {
    value: foundry.listKeys().key1
  }
}

resource searchApiKey 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'SearchApiKey'
  properties: {
    value: search.listAdminKeys().primaryKey
  }
}

resource storageConnection 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'StorageConnection'
  properties: {
    value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${az.environment().suffixes.storage}'
  }
}

// Placeholder — populated in Phase 5 when Postgres is added.
resource databaseUrl 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'DatabaseUrl'
  properties: {
    value: ''
  }
}

// --- secrets you populate ----------------------------------------------------

resource authClientSecretValue 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'AuthClientSecret'
  properties: {
    value: authClientSecret
  }
}

resource sessionSecretValue 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'SessionSecret'
  properties: {
    value: sessionSecret
  }
}

resource azureDevOpsPatValue 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: vault
  name: 'AzureDevOpsPat'
  properties: {
    value: azureDevOpsPat
  }
}

output keyVaultName string = vault.name
output keyVaultUri string = vault.properties.vaultUri
