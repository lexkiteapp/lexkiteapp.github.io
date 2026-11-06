#!/usr/bin/env bash
# Run an xcodebuild test command; keep the full log, print EVERY failing assertion (not only the last lines) + the tail, keep the exit code.
# On failure also print the .xcresult summary: bundles that crash / never bootstrap / fail to build print nothing per test in the log.
# Usage: xctest.sh <log-file> xcodebuild test …
log=$1; shift
"$@" > "$log" 2>&1; rc=$?
grep -E "error: -\[|: error:|Test Case .* failed|Test Suite .* failed|Testing failed|encountered an error|unexpected exit|\*\* TEST" "$log" | sort -u | head -120 | sed 's/^.*error: /::error::/'
tail -25 "$log"
if [ $rc -ne 0 ]; then
  res=$(grep -A1 "Test session results" "$log" | grep -o '/.*\.xcresult' | tail -1)
  [ -n "$res" ] && xcrun xcresulttool get test-results summary --path "$res" --compact 2>&1 | python3 -c '
import json,sys
try: d=json.load(sys.stdin)
except Exception: sys.exit(0)
print("xcresult:", d.get("result"), "passed", d.get("passedTests"), "failed", d.get("failedTests"), "skipped", d.get("skippedTests"))
for f in d.get("testFailures", [])[:60]: print("::error::%s %s: %s" % (f.get("targetName",""), f.get("testName",""), f.get("failureText","")[:300]))
for e in d.get("errors", [])[:20]: print("::error::xcresult:", (e.get("message") or str(e))[:400])
'
  # crash reason (uncaught exception / fatalError text) only lives in the test process console, not in the xcodebuild log
  [ -n "$res" ] && xcrun xcresulttool get log --path "$res" --type console 2>/dev/null | grep -iE -B2 -A12 "terminating|exception|fatal error|reason:|precondition|assertion failed" | head -80
fi
exit $rc
