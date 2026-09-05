// Log Analytics workspace. Application Insights is workspace-based, so this has
// to exist first.

@description('Workspace name.')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Retention in days. 30 is the free allowance.')
param retentionInDays int = 30

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: retentionInDays
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

output workspaceId string = workspace.id
output workspaceName string = workspace.name
