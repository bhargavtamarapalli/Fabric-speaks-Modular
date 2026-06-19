#!/bin/bash
# scripts/smoke-test.sh
# Usage: ./scripts/smoke-test.sh [url]

URL=$1

if [[ -z "$URL" ]]; then
  echo "Usage: ./scripts/smoke-test.sh [url]"
  exit 1
fi

echo "Running smoke test for $URL..."

# Wait for service to be ready (max 30s)
for i in {1..6}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/health")
  if [ "$STATUS" == "200" ]; then
    echo "SUCCESS: Service is healthy (200 OK)"
    exit 0
  fi
  echo "Wait for healthy response... ($STATUS)"
  sleep 5
done

echo "FAILURE: Service did not return 200 OK within 30s"
exit 1
