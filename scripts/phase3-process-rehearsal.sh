#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point to the disposable migrated rehearsal database}"
: "${AUTH_OTP_PEPPER:?AUTH_OTP_PEPPER must be set for the rehearsal}"
: "${MFA_ENCRYPTION_KEY_B64:?MFA_ENCRYPTION_KEY_B64 must be set for the rehearsal}"

if [[ ${#AUTH_OTP_PEPPER} -lt 32 ]]; then
  echo "AUTH_OTP_PEPPER must contain at least 32 characters" >&2
  exit 1
fi

binary="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/dvassist-api-rehearsal"
workdir="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/dvassist-api-rehearsal-logs"
mkdir -p "$workdir"
pids=()

cleanup() {
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  for pid in "${pids[@]}"; do
    wait "$pid" 2>/dev/null || true
  done
  rm -f "$binary"
  rm -rf "$workdir"
}
trap cleanup EXIT

go build -o "$binary" ./cmd/api

start_instance() {
  local port="$1"
  local trusted_cidrs="$2"
  local log_file="$workdir/api-$port.log"
  APP_ENV=development \
    HTTP_ADDR="127.0.0.1:$port" \
    WEB_ROOT=../../apps/web \
    DATABASE_URL="$DATABASE_URL" \
    AUTH_OTP_PEPPER="$AUTH_OTP_PEPPER" \
    MFA_ENCRYPTION_KEY_B64="$MFA_ENCRYPTION_KEY_B64" \
    TRUSTED_PROXY_CIDRS="$trusted_cidrs" \
    "$binary" >"$log_file" 2>&1 &
  LAST_PID=$!
  pids+=("$LAST_PID")
}

wait_for_health() {
  local port="$1"
  local attempt
  for attempt in {1..50}; do
    if curl --fail --silent "http://127.0.0.1:$port/healthz" >/dev/null; then
      return 0
    fi
    sleep 0.2
  done
  cat "$workdir/api-$port.log" >&2
  echo "API on port $port did not become healthy" >&2
  return 1
}

stop_instance() {
  local pid="$1"
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}

post_challenge() {
  local port="$1"
  local email="$2"
  local forwarded_for="$3"
  local response_file="$workdir/response.json"
  curl --silent --show-error --output "$response_file" --write-out '%{http_code}' \
    -H 'Content-Type: application/json' \
    -H "X-Forwarded-For: $forwarded_for" \
    --data "{\"email\":\"$email\"}" \
    "http://127.0.0.1:$port/api/v1/auth/challenges"
}

expect_status() {
  local expected="$1"
  local actual="$2"
  local description="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "$description: got HTTP $actual, expected HTTP $expected" >&2
    cat "$workdir/response.json" >&2
    exit 1
  fi
}

run_id="$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"
email="process-rehearsal-$run_id@example.test"

# A loopback-only synthetic proxy range lets the two real API processes exercise
# the configured forwarded chain. The address ranges below are documentation
# ranges and are not tied to any real applicant or deployment.
start_instance 18081 127.0.0.0/8
api_one_pid="$LAST_PID"
start_instance 18082 127.0.0.0/8
api_two_pid="$LAST_PID"
wait_for_health 18081
wait_for_health 18082

for attempt in 1 2 3 4; do
  if (( attempt % 2 == 1 )); then
    port=18081
  else
    port=18082
  fi
  status="$(post_challenge "$port" "$email" '198.51.100.10, 127.0.0.2')"
  expect_status 200 "$status" "shared email limit request $attempt"
done
status="$(post_challenge 18082 "$email" '198.51.100.10, 127.0.0.2')"
expect_status 429 "$status" "shared email limit across API processes"

stop_instance "$api_one_pid"
start_instance 18081 127.0.0.0/8
restarted_pid="$LAST_PID"
wait_for_health 18081
status="$(post_challenge 18081 "$email" '198.51.100.10, 127.0.0.2')"
expect_status 429 "$status" "shared email limit after API process restart"

for attempt in {1..8}; do
  email="trusted-proxy-$run_id-$attempt@example.test"
  status="$(post_challenge 18082 "$email" '198.51.100.55, 127.0.0.2')"
  expect_status 200 "$status" "trusted forwarded client request $attempt"
done
email="trusted-proxy-$run_id-new-client@example.test"
status="$(post_challenge 18082 "$email" '198.51.100.56, 127.0.0.2')"
expect_status 200 "$status" "new trusted forwarded client"
for attempt in {2..8}; do
  email="trusted-proxy-$run_id-next-$attempt@example.test"
  status="$(post_challenge 18082 "$email" '198.51.100.56, 127.0.0.2')"
  expect_status 200 "$status" "trusted forwarded client request $attempt"
done
email="trusted-proxy-$run_id-next-limit@example.test"
status="$(post_challenge 18082 "$email" '198.51.100.56, 127.0.0.2')"
expect_status 429 "$status" "trusted forwarded client rate limit"

stop_instance "$api_two_pid"
stop_instance "$restarted_pid"
start_instance 18081 192.0.2.0/24
untrusted_one_pid="$LAST_PID"
start_instance 18082 192.0.2.0/24
untrusted_two_pid="$LAST_PID"
wait_for_health 18081
wait_for_health 18082

for attempt in {1..8}; do
  email="untrusted-proxy-$run_id-$attempt@example.test"
  forwarded_ip="198.51.100.$((100 + attempt)), 192.0.2.2"
  if (( attempt % 2 == 1 )); then
    port=18081
  else
    port=18082
  fi
  status="$(post_challenge "$port" "$email" "$forwarded_ip")"
  expect_status 200 "$status" "untrusted forwarded header request $attempt"
done
email="untrusted-proxy-$run_id-limit@example.test"
status="$(post_challenge 18082 "$email" '198.51.100.199, 192.0.2.2')"
expect_status 429 "$status" "untrusted forwarded header ignored across API processes"

echo "Synthetic live-process rehearsal passed: shared counters, restart persistence, trusted forwarded client, and ignored untrusted X-Forwarded-For."
