# The nightly run - exact procedure

This is what a scheduled session does, start to finish. The Routine's prompt is
deliberately short and points here, so the procedure is versioned in the repo
and can be corrected without touching the schedule.

Read `CLAUDE.md` and `docs/AGENT-NETWORK.md` before this file. The hard rules in
`CLAUDE.md` override anything here.

---

## 0. Preflight - stop conditions

Check these first. If any holds, **stop and report. Do not improvise.**

| Condition | Why you stop |
|-----------|--------------|
| `CLAUDE.md` is missing | The agent infrastructure has not been merged to the default branch. You have no rules to work under. |
| `scripts/verify-injections.sh` is missing | There is no verification floor. Work done now cannot be checked. |
| CI is red on the default branch | The baseline is broken. Anything you build on it inherits that. Report which check is failing. |
| No issue is labelled `agent-ready` | The queue is empty. This is a normal, successful outcome - say so and stop. |

Stopping is a successful outcome. It is always better than guessing.

## 1. Pick exactly one issue

List open issues labelled `agent-ready`.

- Skip any also labelled `agent-wip` **unless** the claim is stale: the claim
  comment is more than 6 hours old. A stale claim means a previous run was cut
  off mid-task - see step 6 on resuming.
- Skip any labelled `needs-human` or `agent-blocked`.
- Among the rest, prefer **lowest stated risk first**, then oldest.

Take one. Not two. The single-issue limit is what keeps a bad night cheap.

## 2. Claim it

Add the `agent-wip` label and post a comment:

```
Starting work. Session: <this session's URL>
Branch: agent/<issue-number>-<slug>
```

The claim is what stops two runs colliding on the same issue, so do it before
writing any code.

## 3. Branch

```bash
git fetch origin
git checkout -B agent/<issue-number>-<slug> origin/<default-branch>
```

Always branch from the current default branch, never from another agent branch.

## 4. Implement

Use the `dev` subagent. Give it the issue body verbatim, plus the acceptance
criteria restated in your own words. If you cannot restate the criteria as a
checkable sentence, the issue is ambiguous - go to step 7 and label it
`needs-human`.

Scope is the issue and nothing else. Note anything else you spot for a future
issue; do not fix it.

## 5. Verify - the floor, in full

```bash
docker build -t sw-ea:verify .
./scripts/verify-injections.sh sw-ea:verify
cd tests && npm ci && npx playwright test
```

Then run the `qa` subagent against the change. It reports; it does not fix. Take
its blockers back to `dev` and repeat until they are gone.

Never delete or weaken a check to get green. A failing assertion is a finding,
not an obstacle. If a check fails for a reason your change did not cause -
upstream drift, for instance - that is a finding worth its own issue, and you
say so rather than silencing it.

## 6. If you run out of budget mid-task

A session that stops mid-task is expected, not a failure. What matters is that
the next run can pick it up, so **leave the trail before you need it**:

- Commit and push whatever is working to the branch. A pushed half-change with
  an honest note beats an unpushed whole one.
- Comment on the issue: what is done, what is not, what you were about to do
  next, and anything you learned that is not obvious from the diff.
- Leave `agent-wip` in place.

A later run that finds a stale `agent-wip` claim with an existing
`agent/<number>-*` branch **resumes that branch** - it does not start over and
does not open a second branch for the same issue.

## 7. Hand off

Push the branch and open a pull request against the default branch. Use the
`reviewer` subagent to write the description.

- CI green - open it as a normal pull request.
- CI red, or the `qa` agent has an unresolved blocker - open it as a **draft**,
  say exactly what is failing, and label the issue `agent-blocked`.

Then comment on the issue linking the pull request, and remove `agent-wip`.

If the issue turned out to be ambiguous, risky, or a judgement call: open no
pull request, label it `needs-human`, and comment explaining precisely what
decision you could not make and what you would recommend. That is a good night's
work.

## 8. Stop

Do not pick up a second issue. Do not merge. Do not deploy. Do not run
`build-and-push.ps1`, the AWS CLI, or anything touching ECR or ECS.

Post a short summary of the run: which issue, what happened, what a human needs
to look at.

---

## Notes on the schedule

Firings are short and independent by design, not as a workaround for usage
limits. A session near the end of a long context produces worse work than a
fresh one, so several bounded runs beat one long run even when budget is not the
constraint. Everything the next run needs is in the repo and in the issue - that
is why step 6 insists on leaving the trail.

Changing the cadence is a change to the Routine, not to this file. Changing the
procedure is a change to this file, not to the Routine.
