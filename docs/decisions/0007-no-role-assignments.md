# ADR-0007 — Deploy without role assignments

**Status:** Accepted · **Date:** 2026-08-31

## Context

The deploying account holds **Contributor** at subscription scope, not Owner or
User Access Administrator. Contributor cannot write
`Microsoft.Authorization/roleAssignments`. The conventional Azure pattern —
managed identity plus RBAC grants — is therefore unavailable without involving
another person for every deployment.

Verified directly:

```
Contributor              /subscriptions/87144220-…
Azure AI Developer       …/enterprise-template-ai-foundry/projects/proj-ai-foundry
Cognitive Services User  …/resourceGroups/rg-ai-demo
```

## Decision

The Bicep template creates **no role assignments**. Two places that would normally
need one take a different route:

| Need | Conventional | What we do |
| --- | --- | --- |
| App Service reads Key Vault | Managed identity + `Key Vault Secrets User` | Vault **access policy** — control-plane, so Contributor can set it |
| Pull the container image | Managed identity + `AcrPull` | Registry admin username and password |

The App Service still receives a system-assigned identity; it is simply granted
access by policy rather than by role.

## Why

- The environment stays deployable by one person with the access they already
  have. No hand-offs, no waiting, no half-deployed states.
- It is the pattern the existing `nri-spark` infrastructure already uses, so it is
  proven in this subscription rather than theoretical.

## The one place this does not work — discovered 2026-08-31

Everything above holds, with a single exception found by testing the deployed
environment rather than by reading documentation.

**Foundry Agents cannot be reached with a key.** The project-scoped agents API is
data-plane and requires Entra RBAC:

```
GET  …/api/projects/proj-service-agent/assistants
  Authorization: Bearer <Entra token>  →  401  PermissionDenied
  api-key: <account key>               →  403  UserError
```

Subscription Contributor does not carry the data action
`Microsoft.CognitiveServices/accounts/AIServices/agents/read`, and key-based auth
is not accepted at all for this surface. Disabling local auth is not the issue;
the API simply does not honour keys.

Confirmed working alternatives on the same account:

| Surface | Key auth |
| --- | --- |
| Chat completions, embeddings (`…openai.azure.com`) | ✅ works |
| Account-level Assistants (`…openai.azure.com/openai/assistants`) | ✅ works, HTTP 200 |
| Azure AI Search | ✅ works |
| **Project-scoped Foundry Agents** | ❌ Entra RBAC only |

**Required:** one role assignment, from someone holding Owner or User Access
Administrator. It is a one-time action; nothing else in the project needs elevated
rights.

```bash
SCOPE="/subscriptions/87144220-b4a2-4d90-9953-074d4f662a56/resourceGroups/rg-zuqah-cs-dev/providers/Microsoft.CognitiveServices/accounts/aif-zuqah-cs-dev/projects/proj-service-agent"

# The developer, so agents can be created and tested
az role assignment create --role "Azure AI Developer" \
  --assignee-object-id 9a6a7364-c210-4e6f-b525-9580755f4dc8 \
  --assignee-principal-type User --scope "$SCOPE"

# The App Service managed identity, so the running app can call the agent
az role assignment create --role "Azure AI Developer" \
  --assignee-object-id 7daef382-0c4e-457b-af57-46bf92bc1a8d \
  --assignee-principal-type ServicePrincipal --scope "$SCOPE"
```

**Fallback if that grant cannot be obtained:** the account-level Assistants API
works with a key today, and would deliver the same behaviour to the user. What it
costs is the demo asset from [ADR-0002](0002-foundry-agent-for-knowledge.md) —
opening the Foundry portal and showing the agent as a first-class Azure object.
That is a real loss, so the grant is worth asking for before falling back.

## Consequences

- Key-based authentication in places where managed identity would be preferred in
  production. **Say this out loud in the demo** and name managed identity as the
  production path — an architect will ask, and volunteering it is better than
  being caught by it.
- If an Owner becomes available, switching is contained: enable RBAC on the vault
  and add the role assignments.
