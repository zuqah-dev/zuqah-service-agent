// Container Registry — provisioned as part of this environment so the whole
// stack deploys and tears down with one command, with no dependency on a shared
// registry belonging to another team.
//
// Admin user is enabled so App Service can pull images using username/password
// credentials without needing an AcrPull role assignment on the managed identity.

@description('Registry name. Must be globally unique, alphanumeric only, 5–50 chars.')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

output acrName string = acr.name
output acrLoginServer string = acr.properties.loginServer
