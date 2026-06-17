#!/usr/bin/env bash
# Iteration-2 acceptance checks against the running stack:
#   auth-service @ localhost:8000  +  task-service @ localhost:8080
# Mirrors auth-service/verify.sh. Covers AC-4, AC-5..AC-12, AC-14.
A=http://localhost:8000   # auth
B=http://localhost:8080   # task
pass=0; fail=0
chk(){ if [ "$1" = "$2" ]; then echo "  PASS: $3 ($1)"; pass=$((pass+1)); else echo "  FAIL: $3 (got $1 want $2)"; fail=$((fail+1)); fi; }
code(){ curl -s -o /tmp/tb -w "%{http_code}" "$@"; }
body(){ cat /tmp/tb; }
tok(){ body | sed -E 's/.*"access_token":"([^"]+)".*/\1/'; }
jid(){ body | sed -E 's/.*"id":"([^"]+)".*/\1/'; }
creator(){ body | sed -E 's/.*"creator_id":"([^"]+)".*/\1/'; }
assignee(){ body | sed -E 's/.*"assignee_id":"([^"]+)".*/\1/'; }
login(){ code -X POST $A/login -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}" >/dev/null; tok; }
register(){ code -X POST $A/register -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}" >/dev/null; }
meid(){ code $A/users/me -H "Authorization: Bearer $1" >/dev/null; jid; }

echo "[7.1/NFR-1] task-service health"
c=$(code $B/api/health); chk "$c" 200 "GET /api/health"; echo "    body: $(body)"

echo "[setup] tokens + ids (admin, u1, u2)"
ADMIN=$(login admin@example.com change-me)
register u1@example.com pw12345; U1=$(login u1@example.com pw12345)
register u2@example.com pw12345; U2=$(login u2@example.com pw12345)
ADMINID=$(meid "$ADMIN"); U1ID=$(meid "$U1"); U2ID=$(meid "$U2")
echo "    adminId=$ADMINID u1Id=$U1ID u2Id=$U2ID"

echo "[AC-14] no token -> 401"
c=$(code $B/api/cards); chk "$c" 401 "GET /api/cards no token"

echo "[AC-4] bad / tampered signature -> 401 (validated locally, no auth call)"
c=$(code $B/api/cards -H "Authorization: Bearer not.a.jwt"); chk "$c" 401 "GET /api/cards garbage token"
TAMPER="${U1%.*}.AAAA"
c=$(code $B/api/cards -H "Authorization: Bearer $TAMPER"); chk "$c" 401 "GET /api/cards tampered signature"

echo "[AC-7] USER create auto-assigns self (foreign assignee ignored)"
c=$(code -X POST $B/api/cards -H "Authorization: Bearer $U1" -H 'Content-Type: application/json' \
  -d "{\"title\":\"u1 own\",\"assignee_id\":\"$U2ID\"}")
chk "$c" 201 "POST /api/cards (u1)"
U1CARD=$(jid)
chk "$(creator)" "$U1ID" "u1 card creator==u1"
chk "$(assignee)" "$U1ID" "u1 card assignee==u1 (not u2)"

echo "[AC-8] ADMIN create with explicit assignee=u2"
c=$(code -X POST $B/api/cards -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
  -d "{\"title\":\"admin->u2\",\"assignee_id\":\"$U2ID\"}")
chk "$c" 201 "POST /api/cards (admin, assignee u2)"
U2CARD=$(jid)
chk "$(assignee)" "$U2ID" "admin card assignee==u2"

# admin card assigned to u1 — used for AC-5 visibility and AC-10/AC-12 ownership.
code -X POST $B/api/cards -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
  -d "{\"title\":\"admin->u1\",\"assignee_id\":\"$U1ID\"}" >/dev/null
ADMINCARD_U1=$(jid)

echo "[AC-5] USER sees own-created OR assigned, not others'"
code $B/api/cards -H "Authorization: Bearer $U1" >/dev/null
echo "$(body)" | grep -q "$U1CARD"      && r1=yes || r1=no   # own-created
echo "$(body)" | grep -q "$ADMINCARD_U1" && r2=yes || r2=no  # assigned to u1
echo "$(body)" | grep -q "$U2CARD"      && r3=yes || r3=no   # neither -> must be absent
chk "$r1" yes "u1 sees own-created card"
chk "$r2" yes "u1 sees card assigned to u1"
chk "$r3" no  "u1 does NOT see u2-only card"

echo "[AC-6] ADMIN sees all"
code $B/api/cards -H "Authorization: Bearer $ADMIN" >/dev/null
echo "$(body)" | grep -q "$U1CARD" && echo "$(body)" | grep -q "$U2CARD" && echo "$(body)" | grep -q "$ADMINCARD_U1" && ra=yes || ra=no
chk "$ra" yes "admin sees all three cards"

echo "[AC-9] USER changes status of own card OPEN->DONE"
c=$(code -X PATCH $B/api/cards/$U1CARD/status -H "Authorization: Bearer $U1" -H 'Content-Type: application/json' -d '{"status":"DONE"}')
chk "$c" 200 "PATCH own status -> 200"; echo "    status now: $(body | sed -E 's/.*"status":"([^"]+)".*/\1/')"

echo "[AC-10] USER changes status of card assigned-but-not-created -> 403"
c=$(code -X PATCH $B/api/cards/$ADMINCARD_U1/status -H "Authorization: Bearer $U1" -H 'Content-Type: application/json' -d '{"status":"REVIEW"}')
chk "$c" 403 "PATCH others' status -> 403"

echo "[AC-11] invalid status -> 400"
c=$(code -X PATCH $B/api/cards/$U1CARD/status -H "Authorization: Bearer $U1" -H 'Content-Type: application/json' -d '{"status":"NOPE"}')
chk "$c" 400 "PATCH bad status -> 400"

echo "[AC-12] USER deletes others' card -> 403; ADMIN deletes any -> 204"
c=$(code -X DELETE $B/api/cards/$ADMINCARD_U1 -H "Authorization: Bearer $U1"); chk "$c" 403 "USER delete others' -> 403"
c=$(code -X DELETE $B/api/cards/$ADMINCARD_U1 -H "Authorization: Bearer $ADMIN"); chk "$c" 204 "ADMIN delete any -> 204"
c=$(code -X DELETE $B/api/cards/$ADMINCARD_U1 -H "Authorization: Bearer $ADMIN"); chk "$c" 404 "delete missing -> 404"

echo ""
echo "RESULT: pass=$pass fail=$fail"
[ "$fail" = "0" ] && echo "ALL GREEN" || echo "FAILURES PRESENT"
