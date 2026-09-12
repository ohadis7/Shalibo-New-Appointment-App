# The agent network - operating manual

A set of Claude agents that move this project forward on a schedule, without
anyone being logged in. This document is the system's own description of itself.
When something behaves unexpectedly at 3am, this file is where the answer is.

## The shape of it

```
  Routine (scheduled, runs in the cloud)
        |
        v
  Orchestrator session
        |
        +--> picks ONE issue labelled `agent-ready`
        |
        +--> dev agent      - implements it on a branch
        |
        +--> qa agent       - independently tests it, reports findings
        |
        +--> reviewer agent - reads the diff, writes the PR description
        |
        v
  Pull request  ->  CI (build + injection verification + smoke tests)
        |
        v
  Human reviews in the morning and merges. Nothing merges itself.
```

Four properties make this work, and removing any one of them breaks it:

**1. The state lives in the repo, not in a session.** Cloud sessions are
ephemeral - the container is destroyed when the session ends. Anything the next
night's agent needs to know has to be in `CLAUDE.md`, in a GitHub issue, or in
the code. This is the single most common reason these systems fail: people build
the automation and forget the memory, so every night starts from zero and
repeats the same mistakes.

**2. The agent can verify its own work.** `scripts/verify-injections.sh` plus the
Playwright suite is the floor. An agent working unsupervised without a way to
check itself produces confident, plausible, broken output at scale. Every new
capability added to this system has to come with a way to check it.

**3. Nothing reaches production without a human.** Agents open pull requests.
They never merge, and they never deploy. `build-and-push.ps1` pushes to an ECS
service that real customers book appointments through, and it stays in human
hands permanently. This is not a phase-one restriction to relax later.

**4. Stopping is a valid outcome.** An agent that hits ambiguity and labels the
issue `needs-human` has done its job. An agent that guesses at 3am has not.

## Labels

| Label | Meaning |
|-------|---------|
| `agent-ready` | Scoped well enough for an unattended session. The queue. |
| `agent-wip` | An agent is working on it right now. Prevents double-work. |
| `needs-human` | An agent stopped here. Ambiguous, risky, or a judgement call. |
| `agent-blocked` | Attempted and could not be completed. The issue says why. |

An issue with no label is not in the queue. That is deliberate - the queue is
opt-in, so a stray thought written down at midnight does not become code.

## Writing a task an agent can actually do

The quality of overnight output is set almost entirely by the quality of the
issue. Use the `Agent task` issue template.

Good: *"The service dropdown on the booking wizard clips its last option below
380px width in RTL. It should scroll instead of clipping."*

Bad: *"Make the booking page nicer."* This comes back as a large, unfocused diff
that is harder to review than it is to write, and the night is wasted.

The test: could a competent contractor who has never seen the project do this
from the issue alone, and would you recognise a correct result when you saw it?
If not, the agent will not manage either.

## What an overnight run does

The exact step-by-step procedure, including what to do when a run is cut off
mid-task, lives in [`RUNBOOK-NIGHTLY.md`](RUNBOOK-NIGHTLY.md). In outline:

1. Reads `CLAUDE.md`, this file, and the runbook.
2. Lists open issues labelled `agent-ready`, skipping any labelled `agent-wip`.
3. Picks **one**. Lowest risk first. Relabels it `agent-wip`.
4. Branches as `agent/<issue-number>-<slug>`.
5. Implements, verifying as it goes.
6. Runs the full floor: `docker build`, `verify-injections.sh`, Playwright.
7. Opens a pull request with the reviewer agent's description and a link to the
   CI screenshot artifact.
8. Comments on the issue with what it did and what it did not verify.
9. Stops. It does not start a second task, and it does not merge.

A run that is cut off partway through is expected rather than exceptional. It
pushes what works, writes down on the issue what is done and what is next, and
leaves the `agent-wip` label in place. The following run finds that stale claim
and resumes the same branch instead of starting over.

If it cannot get CI green, it opens the pull request as a **draft**, explains
exactly what is failing, and labels the issue `agent-blocked`. A red draft with
an honest explanation is far more useful than a green pull request that got
there by deleting a test.

## The Routine needs the GitHub connector

A scheduled run is a fresh cloud session, and it only has the tools the
Routine was created with. A Routine created without the GitHub connector
fires a session that can read the code but cannot touch the GitHub API - no
reading issues, no labels, no comments, no pull requests. It looks like it is
working, spends its budget, and produces nothing.

This is not hypothetical: it is how the first two test firings of this
Routine behaved. Step 0 of the runbook now checks for it explicitly so the
failure is loud and cheap instead of silent and expensive.

If runs come back blocked on this, recreate the Routine from the Routines
screen on claude.ai with the GitHub connector attached, or from a session
that holds it. Everything else about the setup stays the same - the schedule,
the prompt, and the runbook are unchanged.

## Cost control

Tokens are the real constraint, so the run is bounded on purpose:

- One issue per run. Not a queue drain.
- If the task looks like more than a few files, the agent stops and asks for it
  to be split.
- Blocked means stop, not retry in a loop.

Raise the limit only after several weeks of output you would have merged anyway.

## Your part - ten minutes a morning

Open the pull requests, look at the screenshots, merge or close. Skipping this
is how the system degrades: unreviewed branches pile up, the agents start
building on unverified work, and within a week the repo is full of plausible
code nobody has read.

Closing a pull request is a completely normal outcome. Say why in a comment -
that comment is training data for the next run in the most literal sense, since
the next agent reads the issue history.

## Adding a second project later

Do not copy the Routine first. Copy the floor first:

1. A `CLAUDE.md` that is actually true.
2. A verification command that fails when the project is broken.
3. A backlog of well-scoped issues.

Then, and only then, schedule it. A project without those three gets you volume,
not progress.
