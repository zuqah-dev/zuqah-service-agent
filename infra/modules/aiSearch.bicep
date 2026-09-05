// Azure AI Search — the knowledge base for the self-help stage.
//
// The semantic ranker is the reason this is here rather than pgvector: on a small
// corpus it materially improves top-3 relevance, and every demo answer has to
// land. It requires `basic` or above; it is not available on `free`.
//
// See docs/decisions/0003-ai-search-over-pgvector.md.

@description('Search service name. Becomes the hostname, so it must be globally unique.')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('SKU. `basic` is the cheapest tier that supports the semantic ranker.')
@allowed([
  'basic'
  'standard'
  'standard2'
])
param skuName string = 'basic'

@description('Replica count. One is correct for a demo.')
param replicaCount int = 1

@description('Partition count. One is correct for fifteen documents.')
param partitionCount int = 1

resource search 'Microsoft.Search/searchServices@2025-05-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: skuName
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    replicaCount: replicaCount
    partitionCount: partitionCount
    hostingMode: 'Default'
    publicNetworkAccess: 'enabled'
    // Key-based auth — the deploying account cannot create role assignments.
    // See ADR-0007.
    disableLocalAuth: false
    authOptions: {
      apiKeyOnly: {}
    }
    semanticSearch: 'standard'
  }
}

output searchServiceName string = search.name
output searchServiceId string = search.id
output searchEndpoint string = 'https://${name}.search.windows.net'
