# Repository Cleanup Ledger

This ledger makes cleanup reviewable before anyone deletes, closes, drops, rewrites, or mutates repository, Git, or GitHub state.

## Quick path

1. Inventory the candidate without changing state.
2. Classify the candidate and choose a preservation decision.
3. Get explicit approval for destructive or remote-state actions.
4. Perform one approved cleanup action at a time.
5. Verify the result and update the status.

## Required cleanup record

| Field | Required content |
| --- | --- |
| Area | Repo docs, generated local artifacts, branch, stash, PR, issue, remote branch, or external artifact. |
| Candidate | Public-safe identifier only; do not include secrets, local absolute paths, or private stash contents. |
| Evidence/refs | Read-only evidence such as file path, branch name, PR/issue number, merge state, or Engram reference. |
| Classification | Preserve, supersede, safe-local-clean, needs-owner-review, or destructive-action-required. |
| Preserve decision | Keep, export, summarize in Engram, replace with link, or no preservation needed. |
| Approval | Named approver and approval reference for destructive or remote mutation actions. |
| Action | No action, document, move, delete, close, drop, prune, or rewrite. |
| Verification | Command, reviewer check, or state comparison after the action. |
| Status | Pending, approved, completed, blocked, or intentionally preserved. |

## Current inventory

| Area | Candidate | Evidence/refs | Classification | Preserve decision | Approval | Action | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Repo docs | `.atl/skill-registry.md` is tracked while `.atl/` is ignored for local cache safety. | `git ls-files '.atl/*'`; file states it is auto-generated registry context. | needs-owner-review | Preserve until the project decides whether generated skill registry belongs in repo, Engram, or local-only state. | Required before removal. | No action in this slice. | Confirmed tracked by read-only `git ls-files`. | Pending |
| Generated local artifacts | Ignored local `coverage/`, `node_modules/`, and `.turbo/` artifacts are present in app/package folders. | Read-only workspace inventory; ignored by `.gitignore`. | safe-local-clean | No repo preservation needed; do not commit generated artifacts. | Required before scripted or bulk cleanup. | No action in this slice. | Confirmed not listed by `git ls-files` cleanup-candidate query. | Pending |
| Local branches | Multiple Phase 1 and roadmap branches remain after `main` has Phase 1 foundation. | Read-only `git branch --list --verbose`. | needs-owner-review | Preserve branch names and reachability evidence before deletion. | Required before local branch deletion. | No action in this slice. | Branch list captured in Engram apply progress, not committed here. | Pending |
| Remote branches | Multiple Phase 1 and roadmap remote branches remain. | Read-only `git branch --remotes --verbose`. | destructive-action-required | Preserve merged/closed PR mapping and latest commit before deleting remote refs. | Required before remote branch deletion. | No action in this slice. | Remote branch list captured in Engram apply progress, not committed here. | Pending |
| Local stashes | Two local stashes exist from Phase 1 split work. | Read-only `git stash list`; stash contents were not exported to repo docs. | destructive-action-required | Preserve private stash details in Engram or owner notes before any drop. | Required before `git stash drop` or `git stash clear`. | No action in this slice. | Stash count and labels captured in Engram apply progress, not committed here. | Pending |
| GitHub PRs | Merged and closed Phase 1 PRs exist, including replaced closed chain PRs. | Read-only `gh pr list --state all`. | needs-owner-review | Preserve PR numbers, titles, state, and merge/closure context before any cleanup comment or closure workflow. | Required before GitHub mutation. | No action in this slice. | PR list captured in Engram apply progress, not committed here. | Pending |
| GitHub issues | Closed Phase 1 and roadmap issues exist. | Read-only `gh issue list --state all`. | intentionally preserved | Preserve as public audit trail unless a maintainer approves a future archival action. | Required before GitHub mutation. | No action in this slice. | Issue list captured in Engram apply progress, not committed here. | Intentionally preserved |

## Preservation gates

### Before local file cleanup

- [ ] Working tree is clean or every local change is intentionally preserved.
- [ ] Candidate is ignored/generated or explicitly approved for removal.
- [ ] No source, docs, configuration, lockfile, or evidence artifact is removed without review.
- [ ] Public-safety scan passes after cleanup.

### Before branch or remote-ref cleanup

- [ ] Branch owner or maintainer approval is recorded.
- [ ] Latest commit, merge base, merge status, and associated PR/issue are recorded.
- [ ] Remote branches are never deleted from an automated apply run without explicit human approval.
- [ ] Rollback path is known before deletion.

### Before stash cleanup

- [ ] Stash owner confirms the stash is obsolete.
- [ ] Stash message, base branch, and safe summary are recorded outside public docs when content may be private.
- [ ] Stash contents are not pasted into public repo files.
- [ ] Drop one stash at a time and verify the stash list after each action.

### Before GitHub PR or issue cleanup

- [ ] PR or issue state is reviewed read-only first.
- [ ] Public audit value is preserved; closed and merged items normally remain as historical record.
- [ ] Any comment, label, closure, or reopening action has explicit maintainer approval.
- [ ] Post-action state is verified with `gh` read-only commands.

## Out of scope for this slice

- Deleting tracked files.
- Removing ignored local artifacts.
- Dropping stashes.
- Deleting local or remote branches.
- Closing, reopening, commenting on, labeling, or otherwise mutating GitHub issues or PRs.
