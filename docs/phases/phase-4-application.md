# Phase 4 — The Application

**Goal:** the first two stages working in a browser — self-help and issue
diagnosis — streaming, cited, with screenshot upload.

This is the first phase whose output looks like the demo.

## Scope

**Chat**

- Streaming API over Server-Sent Events
- The Foundry Agent's stream merged into the conversation, so its work is visible
  as it happens rather than appearing at the end
- Tool activity surfaced — "Searching policies…" — not a bare spinner
- Conversation persistence and history; reopening a thread restores it

**Rendering**

- Markdown with sanitisation
- **Cited answer card** — the claim, and the source and section beneath it
- Citation click opens the source document from Blob Storage
- Graceful error state with retry

**Screenshots**

- Paste or drag an image into the composer
- Stored in Blob Storage, passed to the model as an image part
- Thumbnail shown in the user's message
- An image with no text is a valid turn — the screenshot is the question

**Feedback**

- Thumbs up/down on every assistant reply, stored with the trace id
- This is the raw material for Phase 5's improvement story

## Result

All of the first two stages working in the browser, verified live on Azure.

### Screenshots — both behaviours proven

The four demo images are **drawn, not captured** (`scripts/build_screenshots.py`),
so they are reproducible, contain no real system detail, and can be regenerated
when wording changes.

**Reading a legible error.** Given `vpn-error-809.png` with no accompanying text
at all:

> The dialog says: *"Cannot connect to Zuqah Technologies VPN. Error 809: The network
> connection between your computer and the VPN server could not be established
> because the remote server is not responding…"*
>
> In plain language: your computer has internet, but something on the path is
> blocking the VPN…
>
> 1. Check basic internet … 2. Switch or reset your network …

Quoted verbatim, explained, numbered steps, one policy search, five citations —
and no ticket offered before the steps.

**Refusing an illegible one.** `unreadable.png` is deliberately blurred and
cropped:

> I can't read the full text or error code from this screenshot because it's too
> blurred, so I can't say exactly what it means. Please either paste the exact
> error message as text, or upload a clearer screenshot…

It ran **zero searches** — correctly, since there was nothing to search for — and
invented no error code. This is the more valuable of the two to demonstrate: a
model that guesses at an unreadable dialog is worse than one that asks.

### Design notes

- **Images are placed before the text** in the message. "What does this mean?"
  has to resolve against the image, and parts are read in order.
- **A bare image is a valid turn.** When no text accompanies it, an explicit
  instruction is substituted, because a model handed a lone screenshot describes
  it rather than diagnosing it.
- **Downscaled in the browser** to a 1600px long edge before upload. A 4K screen
  grab is several megabytes and the model reads text at a bounded resolution, so
  the extra pixels are cost without benefit.
- **Re-encoded as PNG, never JPEG.** JPEG ringing lands exactly on the character
  edges the model needs to read.
- **Paste is the primary path.** Print Screen then Ctrl+V is how people actually
  attach a screenshot; a file picker alone would miss the common case. Drag and
  drop and the picker both work as well.
- Attachments are validated server-side against a mime allow-list, a base64
  shape check, a 4 MB decoded cap and a limit of three. An invalid attachment is
  dropped with a notice rather than failing the turn.

## Exit criteria — what you review

1. Sign in, ask a policy question, watch a cited answer stream in
2. Click a citation, land on the correct document
3. Paste the VPN Error 809 screenshot; the agent quotes the exact error text
4. Ask a gap question; get an honest refusal, rendered cleanly
5. Reload the page; the conversation is still there
6. Kill the network mid-answer; the UI degrades sensibly and offers retry
7. Thumbs down is recorded and retrievable

## Risks

| Risk | Handling |
| --- | --- |
| Subagent stream merging is fiddly | Proven pattern exists in the nri-spark codebase; adapt rather than invent |
| Large screenshots slow the turn | Client-side downscale before upload |
| Citations render but do not resolve | Source URL indexed at ingestion, not reconstructed at render |

## Estimate

4–5 days.
