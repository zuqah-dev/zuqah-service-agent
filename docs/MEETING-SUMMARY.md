# Zuqah Technologies Service Agent — one-page summary

**For:** Bobby Chindaphone, Greg
**From:** Anurag Arora
**Date:** 2026-08-31

---

## What it is

A working demonstration of the five-stage **Customer Service** capability from the
Frontier Firm material — self-help, support assignment, issue diagnosis, problem
resolution, continuous improvement — built on Azure, using fabricated Zuqah Technologies data.

## Where it came from

I built this on my own initiative over about two days. **Nobody asked for it.**
It is not part of the Sales Demo initiative and has no sponsor. I started it
because I had time and wanted to show that the five-stage story is achievable
rather than aspirational.

Raising it now so it can be either adopted or stopped deliberately, rather than
drifting.

## What exists today

| | |
| --- | --- |
| **Infrastructure** | 11 Azure resources, deployed from a single Bicep command, in their own resource group |
| **Knowledge base** | 15 fabricated Zuqah Technologies policy documents → PDFs → Document Intelligence → 158 indexed chunks in Azure AI Search |
| **Agent** | Grounded question answering with citations, refusal when undocumented, scope enforcement |
| **Documentation** | Charter, architecture, 8 decision records, 5 phase plans, demo script |

Azure services used: AI Foundry, AI Search, Document Intelligence, Content Safety,
Azure OpenAI, Key Vault, App Service, Container Registry, Postgres, Application
Insights, Entra ID — deployed as code.

## What has been measured, not claimed

```
Retrieval    18/18 questions find the right document   (hit@3, 100%)
             2/2 deliberate gaps correctly unanswered
Agent        17/17 behavioural checks, three consecutive runs
Injection    blocked by Azure Content Safety before reaching the model
```

The two "gaps" are subjects deliberately left out of the corpus, so the agent's
"I don't have that documented" is verifiably honest rather than staged.

## What it cost

- **~$130/month** while running, in the Modern App – Playground subscription
- **~2 days** of my own time
- **Nothing from anyone else** — no team time, no procurement, no client data

## What it does not do

Stated plainly so it is not oversold:

- No proprietary data anywhere — all content is fabricated Zuqah Technologies material
- No ticketing integration yet (planned: Azure DevOps as a stand-in for a real ITSM)
- No human handoff to a live agent
- No user interface yet — the agent is tested headless
- The agent is not yet registered in Azure AI Foundry; that needs one role assignment

## Two things I got wrong

1. I described it to Bobby as *"the frontend will be nri-spark."* It is actually a
   **separate application**, built on nri-spark's patterns so it could be folded in
   later, but deliberately standalone so it cannot affect the running platform.
2. I asked for an Entra app registration and role assignments before establishing
   whether anyone wanted this built. That was the wrong order.

## The decision

| Option | What it means |
| --- | --- |
| **Continue** | Needs a named sponsor and an agreed audience. Roughly 8–10 more days to a full five-stage demo. |
| **Park** | Leave the repository; delete the Azure resources. Rebuilds from code in ~15 minutes if wanted later. |
| **Stop** | Delete everything. One command. Nothing is left behind. |

I have no stake in which. It is disposable by design — that was an explicit
decision from day one, precisely so this conversation could be easy.

## If it continues, what I would need

- A sponsor, and clarity on whether this belongs to the Sales Demo initiative
- Confirmation the audience is Microsoft, internal, or both
- One Entra app registration, and one role assignment on the Foundry project
- A demo date, which determines whether we build three stages or five

---

*All content in the demonstration is fabricated. Zuqah Technologies is a fictional company.
No NRI policy, employee or client data has been used at any point.*
