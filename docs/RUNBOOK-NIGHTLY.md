# The nightly run - exact procedure

<!-- Generated from the Agent smith template (github.com/ohadis7/Agent-smith).
     This is this project's copy and is meant to drift as its needs do. -->

This is what a scheduled session does for Shalibo Wellness, start to finish. The
Routine's prompt is deliberately short and points here, so the procedure is
versioned in the repo and can be corrected without touching the schedule.

Read `CLAUDE.md` before this file. Its hard rules override anything here.

---

## 0. Preflight - stop conditions

Check these first, before cloning or reading anything. If any holds, **stop and
report. Do not improvise.**

### Check your capabilities before you spend anything

Your first action is to establish that you can do this job at all. Try to list
the repository's open issues.

**If you have no GitHub API access, or the call fails: stop right there.** Do not
clone, do not read the codebase, do not start work you have no way to hand off.
Say this and nothing else:

```
BLOCKED: no GitHub API access. This run cannot read the queue, claim an issue,
or open a pull request. The Routine needs the GitHub connector attached.
```

A run that stops here costs seconds. A run that skips this check spends its whole
budget discovering the same thing at the end, with nothing to show for it.

Then run `scripts/preflight.sh` if the project has one, and note which
capabilities are available - you will need to say so later.

### The other stop conditions

| Condition | Why you stop |
|-----------|--------------|
| `CLAUDE.md` is missing | The agent setup was never merged to the default branch. You have no rules to work under. |
| The verification command is missing | There is no floor. Work done now cannot be checked. |
| CI is red on the default branch | The baseline is broken and anything you build inherits it. Report which check is failing. |
| No issue is labelled `agent-ready` | The queue is empty. A normal, successful outcome - say so and stop. |

Stopping is a successful outcome. It is always better than guessing.

## 1. Pick exactly one issue

List open issues labelled `agent-ready`.

- Skip any also labelled `agent-wip`, **unless** the claim is stale - its claim
  comment is more than 6 hours old. A stale claim means a previous run was cut
  off mid-task; see step 6 on resuming.
- Skip anything labelled `needs-human` or `agent-blocked`.
- Among the rest, prefer **lowest stated risk first**, then oldest.

Take one. Not two. The single-issue limit is what keeps a bad night cheap.

## 2. Claim it

Add the `agent-wip` label and post a comment:

```
Starting work. Session: <this session's URL>
Branch: agent/<issue-number>-<slug>
```

The claim is what stops two runs colliding, so do it before writing any code.

## 3. Branch

```bash
git fetch origin
git checkout -B agent/<issue-number>-<slug> origin/<default-branch>
```

Always branch from the current default branch, never from another agent branch.

## 4. Implement

Use the `dev` subagent. Give it the issue body verbatim, plus the acceptance
criteria restated in your own words. If you cannot restate them as a checkable
sentence, the issue is ambiguous - go to step 7 and label it `needs-human`.

Scope is the issue and nothing else. Note anything else you notice for a future
issue; do not fix it.

## 5. Verify

```bash
docker build -t sw-ea:verify .
./scripts/verify-injections.sh sw-ea:verify
cd tests && npm ci && npx playwright test
```

## 5a. The QA gate - nothing passes here without a verdict

Run the `qa` subagent against the change. It tests independently and returns one
of two verdicts as its final line:

```
VERDICT: PASS - no blockers. Proceed to review.
VERDICT: FAIL - N blocker(s). Back to dev.
```

**This is a gate, not advice.** No pull request is opened until QA returns PASS -
not a draft, not a work-in-progress, nothing.

On FAIL: hand its blockers back to `dev`, let it fix them, and run `qa` again on
the new state. Repeat. There is no round limit and no "close enough": a third
round costs another loop, a wrong PASS costs the owner's trust in every night
that follows.

Two rules keep the gate meaningful:

- **`qa` never fixes anything.** The moment it does, it is reviewing its own work
  and the independence that makes its verdict worth reading is gone.
- **`dev` never overrules it.** If `dev` believes a blocker is wrong, it says so
  in its response and `qa` re-examines. It does not proceed regardless.

If you are still on FAIL when your budget runs out, that is not a failure of the
night - go to step 6, push what you have, and say exactly which blockers are
still open so the next run picks up the argument where you left it.

**If a capability is missing.** A cloud session may lack a Docker daemon, a
database, or a browser. That is an environment limitation, not something to work
around:

- Run everything you can.
- Push the branch and let CI run the rest. Read the CI result and treat it
  exactly as you would a local run - if it is red, the work is not done.
- State in the pull request which checks you ran yourself and which you
  delegated.

Never write "verified" for something you did not observe. An unverifiable claim
is worse than an admitted gap, because the human reading it at 8am cannot tell
the two apart.

Never delete or weaken a check to get green. A failing assertion is a finding. If
it fails for a reason your change did not cause, that is a finding worth its own
issue - say so rather than silencing it.

## 6. If you run out of budget mid-task, or QA will not pass

Expected, not a failure. What matters is that the next run can pick it up, so
**leave the trail before you need it**:

- Commit and push whatever works. A pushed half-change with an honest note beats
  an unpushed whole one.
- Comment on the issue: what is done, what is not, what you were about to do
  next, and anything you learned that the diff does not show.
- Leave `agent-wip` in place.
- If QA is still failing, list its open blockers in that comment verbatim. The
  next run should not have to rediscover them.

A later run that finds a stale claim with an existing `agent/<number>-*` branch
**resumes that branch**. It does not start over and does not open a second
branch for the same issue.

## 7. Hand off

**Only reachable with `VERDICT: PASS` from step 5a.** If QA has not passed, you
are not here - you are in step 6.

Push the branch and open the pull request. There is no further approval step:
QA has already been over this work in depth, and a third agent re-reading the
same diff costs another round without buying much.

- CI green - open it as a normal pull request.
- CI red - open it as a **draft**, say exactly what is failing, and label the
  issue `agent-blocked`. A QA pass does not override a red build; they check
  different things.

### Write the description yourself

This is what earns the human's two minutes, so do not compress it into "fixes
the issue":

- **What changed** - one or two sentences, plain language.
- **Why** - the issue it closes.
- **Risk** - what could break, and how to revert.
- **Verified** - the commands you actually ran and what came back.
- **Not verified** - explicit, including anything you delegated to CI rather
  than ran yourself. This is the most valuable section and the one you will be
  most tempted to skip.
- **QA** - the report from step 5a: what was exercised, what was not, and the
  verdict line itself.

### When to get a second opinion anyway

The `reviewer` subagent is available and is **not** a required step. Use it when
a cold read of the diff is worth the round:

- the change touches anything `CLAUDE.md` flags as high risk - the build, the
  data, the critical path
- it is large, or spread across more files than the issue implied
- QA passed but you are uneasy, and can say why

Routine changes go straight to the pull request. Your judgement decides, and
"used it because I was unsure" is always a defensible answer.

Then comment on the issue linking the pull request, and remove `agent-wip`.

If the issue turned out to be ambiguous, risky, or a judgement call: open no pull
request, label it `needs-human`, and comment explaining precisely what decision
you could not make and what you would recommend. That is a good night's work.

## 8. Stop

Do not pick up a second issue. Do not merge. Do not deploy.

Post a short summary: which issue, what happened, what a human needs to look at.
