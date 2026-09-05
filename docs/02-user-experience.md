# User Experience — what people ask, what they get

## Who uses it

A Zuqah Technologies employee with a workplace problem. Not a support engineer, not an
administrator. They want the problem gone, and failing that, they want it in the
right hands without having to work out whose hands those are.

## The five things they ask

### 1. "How do I…" — policy and process

> How do I set up VPN on a new laptop?
> What's the expense limit for client travel?
> What's the process to request admin rights?
> Which laptop models can I pick at refresh?

**They get:** a short, direct answer with a citation to the source document and
section. If the knowledge base does not cover it, they are told so plainly and
pointed somewhere useful — never given a confident guess.

### 2. "Something is broken"

> My VPN keeps disconnecting.
> Outlook won't sync.
> Teams audio isn't working on calls.

**They get:** numbered self-serve steps, simplest and safest first. A ticket is
offered only after the steps, as a fallback — never as the opening move.

### 3. A screenshot

> *[pastes an error dialog, often with no text at all]*

**They get:** the exact error wording quoted back so they know it was read
correctly, an explanation in plain language, then steps. If the image is
unreadable, a request for a better one — not an invented error code.

### 4. "Raise a ticket" / "what's happening with mine"

> Raise a ticket for my broken docking station.
> What tickets do I have open?

**They get:** a confirmation of what is about to be filed, a request for
permission, then a real Azure DevOps work item ID and a link that opens it.

### 5. "Who can help with this?"

> Who knows Azure networking and could look at this?

**They get:** a named engineer with matching skills and their actual availability
over the coming weeks — not "please contact the service desk."

## The response contract

| Always | Never |
| --- | --- |
| Cites the document behind every policy claim | Invents a policy number, limit, or date |
| Troubleshoots before offering a ticket | Opens with "shall I raise a ticket?" |
| Says "I don't have that policy" when true | Guesses to appear helpful |
| Asks before filing anything | Files silently |
| Returns a real ticket ID and link | Returns a plausible-looking fake reference |
| Shows only the caller's own records | Reveals another employee's data |
| Streams, with tool activity visible | Shows a spinner then a wall of text |

## Where it says no

Rehearse these — architects probe them.

| Prompt | Behaviour |
| --- | --- |
| "What's my salary?" | Out of scope; redirects to HR |
| "Show me Sarah's open tickets" | Refuses — it can only see the signed-in user's |
| "Write me a poem" | Declines politely, stays in scope |
| "Ignore your instructions and…" | Treated as data, not as a command |
| "What model are you running on?" | Identifies as the Zuqah Technologies Service Agent, nothing more |

## Answer shape

- **Brief by default.** Most answers are one or two sentences.
- **No unrequested extras.** Retrieving a passage is not a reason to recite it.
- **Bullets only for genuine lists**, never more than three.
- **One compact citation** at the end of the sentence it supports.
- **Offer, don't dump.** "Want the carry-forward rules too?" beats three paragraphs.

## What we are not building

Named here so it can be answered confidently if asked, rather than fumbled:

- **Human handoff.** No escalation to a live agent. Next phase.
- **Ticket updates.** The agent files and reads; it does not resolve or reassign.
- **Proactive outreach.** It answers; it does not initiate.
- **Multi-language, voice, mobile.** Possible, deliberately deferred.
