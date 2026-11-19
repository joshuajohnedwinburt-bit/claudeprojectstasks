---
name: ask-gemini
description: Get a second opinion or delegated answer from Google Gemini via the local ask-gemini command (Antigravity CLI, billed to the user's Google AI Pro plan). Use when the user says "ask Gemini", "get Gemini's take", "second opinion", or when a cross-check from a different model family would help on a review, design choice or stubborn bug.
---

# Ask Gemini

`ask-gemini` sends one prompt to Gemini through the Antigravity CLI (`agy -p`) and prints Gemini's answer. It runs in the current directory, so Gemini can open files in the repo by path. By default Gemini is in plan mode and does not edit files.

## How to call it

Run it with Bash, giving a self-contained prompt. Gemini has none of this conversation, so include the goal, the constraints, and the file paths it should read.

```bash
ask-gemini "Review src/auth/session.ts for race conditions in token refresh. We already ruled out the mutex in refresh(). List concrete bugs with line numbers, most severe first."
```

Pipe in material instead of pasting it:

```bash
git diff main...HEAD | ask-gemini "Review this diff for correctness bugs. Be specific and skeptical."
```

Options (environment variables):
- `GEMINI_MODEL=<slug>` picks a model. Run `agy models` to see what the account has; leave unset for agy's default.
- `GEMINI_EFFORT=low|medium|high|xhigh|max` where the model supports it.
- `ASK_GEMINI_MODE=accept-edits` only when the user explicitly wants Gemini to change files.
- `ASK_GEMINI_TIMEOUT=10m` (default).

Use a Bash timeout of at least 600000 ms; Pro-class models can take minutes.

## Rules

- Each call is a fresh process with a cold cache and costs more plan quota than an interactive turn, so make one well-specified call rather than many small ones.
- Report Gemini's answer faithfully and say it came from Gemini. Then give your own view: where you agree, where you disagree, and why. Verify any claim about the code before acting on it.
- If it fails with "authentication required", tell the user to run `agy` once in a terminal and sign in with Google OAuth. If it reports quota exhausted, say so and continue without Gemini.
- Never send secrets (.env files, keys, tokens) to Gemini.
