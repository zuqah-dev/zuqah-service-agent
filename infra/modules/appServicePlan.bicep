// Linux App Service Plan.
//
// B2 rather than B1: the container is a Bun server-rendered React app, and B1's
// 1.75 GB is tight enough that a cold start under demo conditions is a risk not
// worth taking to save a few dollars.

@description('Plan name.')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('SKU name.')
param skuName string = 'B2'

@description('SKU tier.')
param skuTier string = 'Basic'

resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuTier
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

output appServicePlanId string = plan.id
output appServicePlanName string = plan.name
