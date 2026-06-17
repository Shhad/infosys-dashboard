#!/usr/bin/env bash
# AC-1 second half: restart must not duplicate or overwrite the bootstrap admin.
cd /mnt/d/programowanie/projects/infosys-dashboard || exit 1
docker compose restart auth-service >/dev/null 2>&1
for i in $(seq 1 20); do curl -s -o /dev/null http://localhost:8000/health && break; sleep 1; done
B=http://localhost:8000
ADMIN=$(curl -s -X POST $B/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"change-me"}' \
  | sed -E 's/.*"access_token":"([^"]+)".*/\1/')
if [ -n "$ADMIN" ] && [ "${ADMIN:0:2}" = "ey" ]; then
  echo "PASS: admin still logs in with ORIGINAL password after restart (not overwritten)"
else
  echo "FAIL: admin login after restart failed"
fi
N=$(curl -s $B/admin/users -H "Authorization: Bearer $ADMIN" | grep -o 'admin@example.com' | wc -l)
if [ "$N" = "1" ]; then echo "PASS: exactly 1 admin@example.com row (no duplicate)"; else echo "FAIL: found $N admin rows"; fi
