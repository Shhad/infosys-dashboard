#!/usr/bin/env bash
# Iteration-1 acceptance checks against a running auth-service (localhost:8000).
B=http://localhost:8000
pass=0; fail=0
chk(){ if [ "$1" = "$2" ]; then echo "  PASS: $3 ($1)"; pass=$((pass+1)); else echo "  FAIL: $3 (got $1 want $2)"; fail=$((fail+1)); fi; }
code(){ curl -s -o /tmp/b -w "%{http_code}" "$@"; }
body(){ cat /tmp/b; }
tok(){ body | sed -E 's/.*"access_token":"([^"]+)".*/\1/'; }

echo "[8.1/AC-15] health"
c=$(code $B/health); chk "$c" 200 "GET /health"; echo "    body: $(body)"

echo "[AC-1] bootstrap admin login"
c=$(code -X POST $B/login -H 'Content-Type: application/json' -d '{"email":"admin@example.com","password":"change-me"}')
chk "$c" 200 "POST /login admin"
ADMIN=$(tok)

echo "[AC-14] protected endpoint auth"
c=$(code $B/users/me); chk "$c" 401 "GET /users/me no token"
c=$(code $B/users/me -H "Authorization: Bearer $ADMIN"); chk "$c" 200 "GET /users/me admin"; echo "    me: $(body)"
c=$(code $B/users/me -H "Authorization: Bearer not.a.jwt"); chk "$c" 401 "GET /users/me bad token"

echo "[AC-2] self register + login"
c=$(code -X POST $B/register -H 'Content-Type: application/json' -d '{"email":"alice@example.com","password":"pw12345"}')
chk "$c" 201 "POST /register alice"; echo "    body: $(body)"
c=$(code -X POST $B/login -H 'Content-Type: application/json' -d '{"email":"alice@example.com","password":"pw12345"}')
chk "$c" 200 "POST /login alice"
ALICE=$(tok)

echo "[AC-3] duplicate register"
c=$(code -X POST $B/register -H 'Content-Type: application/json' -d '{"email":"alice@example.com","password":"pw12345"}')
chk "$c" 409 "POST /register dup"

echo "[AC-13] admin create + promote; USER forbidden"
c=$(code -X POST $B/admin/users -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' -d '{"email":"bob@example.com","password":"pw12345"}')
chk "$c" 201 "POST /admin/users (admin)"
BOBID=$(body | sed -E 's/.*"id":"([^"]+)".*/\1/')
c=$(code -X POST $B/admin/users/$BOBID/promote -H "Authorization: Bearer $ADMIN"); chk "$c" 200 "promote bob"; echo "    promoted: $(body)"
c=$(code -X POST $B/admin/users -H "Authorization: Bearer $ALICE" -H 'Content-Type: application/json' -d '{"email":"x@example.com","password":"pw12345"}')
chk "$c" 403 "POST /admin/users (USER) forbidden"
c=$(code $B/admin/users -H "Authorization: Bearer $ADMIN"); chk "$c" 200 "GET /admin/users (admin)"

echo "[8.5] tampered token rejected"
TAMPER="${ADMIN%.*}.AAAA"
c=$(code $B/users/me -H "Authorization: Bearer $TAMPER"); chk "$c" 401 "tampered signature"

echo "[5.4] JWKS"
c=$(code $B/.well-known/jwks.json); chk "$c" 200 "GET jwks"; echo "    jwks: $(body)"

echo "[8.6] admin JWT claims (decoded payload)"
PL=$(echo "$ADMIN" | cut -d. -f2); pad=$(( (4 - ${#PL} % 4) % 4 ))
for i in $(seq 1 $pad); do PL="$PL="; done
echo "    claims: $(echo "$PL" | tr '_-' '/+' | base64 -d 2>/dev/null)"

echo ""
echo "RESULT: pass=$pass fail=$fail"
[ "$fail" = "0" ] && echo "ALL GREEN" || echo "FAILURES PRESENT"
