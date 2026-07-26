#!/usr/bin/env bash
# intervals — auto-commit and push work at a fixed interval.
#
#   ./scripts/intervals.sh            # default 15s interval
#   ./scripts/intervals.sh 900        # every 15 minutes
#   ./scripts/intervals.sh 15 --dry   # print what it would do, commit nothing
#
# Commits ONLY when something actually changed. It will never create empty
# commits: a green square with no work behind it is a lie about your activity,
# and it also makes the history useless for finding real changes.

set -uo pipefail

INTERVAL="${1:-15}"
DRY_RUN=""
[[ "${2:-}" == "--dry" ]] && DRY_RUN="1"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "intervals: not inside a git repository" >&2
  exit 1
}
cd "$REPO_ROOT" || exit 1

BRANCH="$(git branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  echo "intervals: detached HEAD — checkout a branch first" >&2
  exit 1
fi

# Anything matching these must never be committed, regardless of gitignore state.
SECRET_PATTERN='(^|/)\.env($|\.)|\.pem$|\.key$|(^|/)id_rsa|credentials\.json$'

log() { printf '%s  %s\n' "$(date '+%H:%M:%S')" "$*"; }

# Builds a commit subject from what actually changed, so the log stays readable
# instead of 200 identical "wip" lines.
build_message() {
  local files areas count subject
  files="$(git diff --cached --name-only)"
  count="$(printf '%s\n' "$files" | grep -c . )"

  # Group by the most meaningful path segment (feature dir, or top-level).
  areas="$(printf '%s\n' "$files" \
    | awk -F/ '{
        if ($1 == "src" && $2 == "features" && NF >= 3) print $2"/"$3;
        else if ($1 == "src" && NF >= 2) print $1"/"$2;
        else print $1;
      }' \
    | sort -u | head -3 | paste -sd ',' - | sed 's/,/, /g')"

  if [[ "$count" -eq 1 ]]; then
    subject="Update $(printf '%s' "$files")"
  else
    subject="Update ${areas} (${count} files)"
  fi

  local stats
  stats="$(git diff --cached --shortstat | sed 's/^ *//')"
  printf '%s\n\n%s\n\nAuto-committed by intervals (%ss).\n' "$subject" "$stats" "$INTERVAL"
}

log "watching $REPO_ROOT on '$BRANCH' every ${INTERVAL}s${DRY_RUN:+ (dry run)}"
log "stop with Ctrl-C"

while true; do
  if [[ -n "$(git status --porcelain)" ]]; then
    git add -A

    # Re-check after staging: gitignore can drift, and a leaked key is
    # unrecoverable once it is on a public remote.
    if git diff --cached --name-only | grep -qE "$SECRET_PATTERN"; then
      log "REFUSING: a secret-looking file is staged. Unstaging and pausing."
      git diff --cached --name-only | grep -E "$SECRET_PATTERN" | sed 's/^/         /'
      git reset >/dev/null
      sleep "$INTERVAL"
      continue
    fi

    if git diff --cached --quiet; then
      git reset >/dev/null
      sleep "$INTERVAL"
      continue
    fi

    MESSAGE="$(build_message)"

    if [[ -n "$DRY_RUN" ]]; then
      log "would commit: $(printf '%s' "$MESSAGE" | head -1)"
      git reset >/dev/null
    else
      if git commit -q -m "$MESSAGE"; then
        log "committed: $(git log -1 --pretty=%s)"
        if git push -q origin "$BRANCH" 2>/dev/null; then
          log "pushed to origin/$BRANCH"
        else
          log "push failed (will retry next interval)"
        fi
      fi
    fi
  fi

  sleep "$INTERVAL"
done
