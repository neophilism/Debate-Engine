#!/usr/bin/env bash
# CI-only ephemeral ClamAV daemon. Uses a synthetic signature, never claims
# current real-world malware coverage or touches real candidate material.
set -euo pipefail
if [[ "$CI" != "true" || -z "$GITHUB_ENV" ]]; then
  echo "This bootstrap is restricted to disposable GitHub CI." >&2
  exit 2
fi
root="$(mktemp -d /tmp/pde-ci-clamd.XXXXXX)"
mkdir -m 700 "$root/db"
export PDE_CLAMD_CI_ROOT="$root"
node --input-type=module <<'NODE'
import {writeFileSync} from 'node:fs';
const marker='PDE-TEST-ONLY-BLOCKED-CONTENT-2026';
const signature=Buffer.from(marker,'utf8').toString('hex');
writeFileSync(process.env.PDE_CLAMD_CI_ROOT+'/db/pde-ci.ndb','PDE.Test.Blocked:0:*:'+signature+'\n',{mode:0o600});
NODE
socket="$root/clamd.sock"
cat > "$root/clamd.conf" <<EOF
Foreground yes
LogTime yes
LogFile $root/clamd.log
LocalSocket $socket
LocalSocketMode 600
FixStaleSocket yes
DatabaseDirectory $root/db
OfficialDatabaseOnly no
StreamMaxLength 65M
MaxFileSize 65M
MaxScanSize 65M
MaxThreads 2
ReadTimeout 60
EOF
clamd --config-file="$root/clamd.conf" > "$root/stdout.log" 2>&1 &
pid=$!
for attempt in $(seq 1 60); do
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "ClamAV failed to start with the synthetic CI signature." >&2
    tail -n 80 "$root/stdout.log" >&2
    tail -n 80 "$root/clamd.log" >&2 || true
    exit 1
  fi
  if [[ -S "$socket" ]]; then
    echo "PDE_CLAMD_SOCKET=$socket" >> "$GITHUB_ENV"
    echo "ClamAV native Unix socket started for CI-only INSTREAM acceptance."
    exit 0
  fi
  sleep 1
done
echo "ClamAV did not expose its Unix socket within the acceptance timeout." >&2
tail -n 80 "$root/stdout.log" >&2
tail -n 80 "$root/clamd.log" >&2 || true
exit 1
