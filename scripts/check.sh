#!/usr/bin/env bash
# Runs every case's regression suite against the fixed code, then against the
# buggy code. A case is ok when the fixed code passes every test and the buggy
# code fails at least one. A buggy version that does not build or run does not
# count as failing its tests.
set -uo pipefail

cd "$(dirname "$0")/.."
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1

for tool in bun go dotnet; do
  command -v "$tool" >/dev/null || { echo "check.sh: $tool is not on PATH" >&2; exit 2; }
done

logs=$(mktemp -d)
trap 'rm -rf "$logs"' EXIT

language() {
  if compgen -G "$1/*.csproj" >/dev/null; then echo "C#"
  elif compgen -G "$1/*_test.go" >/dev/null; then echo "Go"
  elif compgen -G "$1/*.test.ts" >/dev/null; then echo "TypeScript"
  else echo "unknown"; fi
}

# run <case dir> <fixed|buggy> <log file>. Returns the test runner's exit status.
run() {
  local dir=$1 variant=$2 tags=""
  [[ $variant == buggy ]] && tags=buggy
  case "$(language "$dir")" in
    TypeScript) VARIANT=$variant bun test "./$dir" ;;
    Go) go test -count=1 -v -tags="$tags" "./$dir" ;;
    "C#") dotnet test "$dir" -p:Variant="$variant" ;;
    *) echo "no test suite found in $dir"; return 1 ;;
  esac >"$3" 2>&1
}

# counts <case dir> <log file>. Prints "<failed> <total>" tests, as the runner reported them.
counts() {
  local log=$2 failed=0 passed=0
  case "$(language "$1")" in
    TypeScript)
      failed=$(grep -c '^(fail) ' "$log")
      passed=$(sed -nE 's/^ *([0-9]+) pass$/\1/p' "$log" | head -1) ;;
    Go)
      failed=$(grep -c '^--- FAIL: ' "$log")
      passed=$(grep -c '^--- PASS: ' "$log") ;;
    "C#")
      failed=$(sed -nE 's/.* Failed: +([0-9]+),.*/\1/p' "$log" | head -1)
      passed=$(sed -nE 's/.* Passed: +([0-9]+),.*/\1/p' "$log" | head -1) ;;
  esac
  failed=${failed:-0} passed=${passed:-0}
  echo "$failed $((failed + passed))"
}

cases=(cases/*/)
cases=("${cases[@]%/}")

echo "Running ${#cases[@]} suites against the fixed code..."
fixed_status=()
for dir in "${cases[@]}"; do
  run "$dir" fixed "$logs/${dir##*/}.fixed"
  fixed_status+=($?)
done

echo "Running the same suites against the buggy code..."
echo
problems=0
results=()
for i in "${!cases[@]}"; do
  dir=${cases[$i]} name=${cases[$i]##*/}
  run "$dir" buggy "$logs/$name.buggy"
  buggy_status=$?
  read -r fixed_failed fixed_total < <(counts "$dir" "$logs/$name.fixed")
  read -r buggy_failed buggy_total < <(counts "$dir" "$logs/$name.buggy")

  verdict=ok note=""
  if (( fixed_status[i] != 0 || fixed_failed > 0 || fixed_total == 0 )); then
    verdict=FAIL note="the fixed code must pass every test"
  elif (( buggy_status == 0 )); then
    verdict=FAIL note="the buggy code must fail at least one test"
  elif (( buggy_failed == 0 )); then
    verdict=FAIL note="the buggy code did not build or run"
  fi
  results+=("$verdict")
  [[ $verdict == ok ]] || problems=$((problems + 1))

  printf '%-4s  %-36s %-10s  fixed: %2d/%-2d pass   buggy: %2d/%-2d fail%s\n' \
    "$verdict" "$name" "$(language "$dir")" \
    $((fixed_total - fixed_failed)) "$fixed_total" "$buggy_failed" "$buggy_total" "${note:+  ($note)}"
done

for i in "${!cases[@]}"; do
  [[ ${results[$i]} == ok ]] && continue
  name=${cases[$i]##*/}
  for variant in fixed buggy; do
    echo
    echo "---- $name ($variant), last 60 lines of output ----"
    tail -n 60 "$logs/$name.$variant"
  done
done

echo
if (( problems > 0 )); then
  echo "$problems of ${#cases[@]} cases FAILED"
  exit 1
fi
echo "All ${#cases[@]} cases ok: every fixed version passes, every buggy version fails."
