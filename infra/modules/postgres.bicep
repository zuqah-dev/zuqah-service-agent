// PostgreSQL Flexible Server.
//
// Holds conversations, employees, skills and bookings — everything except the
// document index, which lives in Azure AI Search.
//
// `vector` and `pg_trgm` are allow-listed here so `CREATE EXTENSION` succeeds
// later without another deployment. pg_trgm backs fuzzy name matching in the
// support-assignment stage; vector is allow-listed because it costs nothing to
// permit and saves a redeploy if we later want embeddings alongside the
// relational data.
//
// This is the slow module: 8-10 minutes. Everything else finishes in two.

@description('Server name. Globally unique.')
param name string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Administrator username.')
param administratorLogin string

@description('Administrator password.')
@secure()
param administratorLoginPassword string

@description('Name of the application database.')
param databaseName string

@description('Compute SKU name.')
param skuName string = 'Standard_B1ms'

@description('Compute SKU tier.')
param skuTier string = 'Burstable'

@description('PostgreSQL major version.')
param postgresVersion string = '17'

@description('Storage size in GiB.')
param storageSizeGB int = 32

@description('Backup retention in days.')
param backupRetentionDays int = 7

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2025-08-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: postgresVersion
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    storage: {
      storageSizeGB: storageSizeGB
      autoGrow: 'Disabled'
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

// Extensions must be allow-listed at the server before CREATE EXTENSION works.
resource extensions 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2025-08-01' = {
  parent: postgres
  name: 'azure.extensions'
  properties: {
    value: 'VECTOR,PG_TRGM'
    source: 'user-override'
  }
}

// App Service outbound addresses are not fixed, and this is a demo with
// fabricated data — so Azure services are allowed through rather than
// enumerating IPs. Nothing real is stored here.
resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2025-08-01' = {
  parent: postgres
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
  dependsOn: [
    extensions
  ]
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2025-08-01' = {
  parent: postgres
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
  dependsOn: [
    allowAzureServices
  ]
}

output postgresServerName string = postgres.name
output postgresFqdn string = postgres.properties.fullyQualifiedDomainName
output postgresDatabaseName string = database.name
