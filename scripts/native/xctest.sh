#!/usr/bin/env bash
# Run an xcodebuild test command; keep the full log, print EVERY failing assertion (not only the last lines) + the tail, keep the exit code.
# Usage: xctest.sh <log-file> xcodebuild test …
log=$1; shift
"$@" > "$log" 2>&1; rc=$?
grep -E "error: -\[|: error:|Test Case .* failed|Test Suite .* failed|\*\* TEST" "$log" | sort -u | head -120 | sed 's/^.*error: /::error::/'
tail -25 "$log"
exit $rc
