---
name: intervals
description: Start, stop, or check the auto-commit watcher that commits and pushes work at a fixed interval. Use when the user says "start intervals", "run intervals", "stop intervals", "auto commit", "auto push", or asks to keep their GitHub contributions updated while they work.
---

# intervals

Runs `scripts/intervals.sh`, which watches the repo and commits + pushes whenever
something actually changed.

## Start it

Default interval (15s, as originally requested):

```bash
./scripts/intervals.sh
```

A saner interval — same contribution graph, readable history:

```bash
./scripts/intervals.sh 900     # every 15 minutes
```

Preview without committing:

```bash
./scripts/intervals.sh 15 --dry
```

Run it in the background so it survives while other work continues, and tell the
user where the log is:

```bash
nohup ./scripts/intervals.sh 900 > /tmp/intervals.log 2>&1 &
```

## Stop it

```bash
pkill -f intervals.sh
```

## Check on it

```bash
pgrep -f intervals.sh >/dev/null && echo running || echo stopped
tail -20 /tmp/intervals.log
git log --oneline -10
```

## What it will not do

- **No empty commits.** If nothing changed, nothing is committed. Fabricating
  activity with no work behind it misrepresents the contribution graph to anyone
  reading it, and buries real commits in noise.
- **No secrets.** It re-checks staged files against `.env`, `*.pem`, `*.key`,
  `id_rsa`, and `credentials.json` after staging, and refuses the commit if any
  match — gitignore rules drift, and a key pushed to a public remote is
  unrecoverable.

## Interval guidance

Worth saying once if the user is choosing: GitHub's contribution graph counts
**days that have at least one commit**, not commit volume. One real commit fills
the same square as 240. A short interval only changes how granular (and how
broken) the intermediate commits are — most 15-second snapshots capture
mid-edit states that do not build.

If they want it anyway, run it — it is their repo and their own real work. Just
make sure they have heard it once.
