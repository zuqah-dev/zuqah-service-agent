// Application Insights, workspace-based.
//
// This is where the continuous-improvement stage of the demo gets its data:
// per-turn tokens, latency, tool usage and outcomes are sent here by the
// application via OpenTelemetry.

@description('Component name.')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Resource id of the Log Analytics workspace that backs this component.')
param workspaceResourceId string

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: name
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspaceResourceId
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

output applicationInsightsName string = appInsights.name
output connectionString string = appInsights.properties.ConnectionString
output instrumentationKey string = appInsights.properties.InstrumentationKey
