# SPEC.md — Task Dashboard (Microservices, Spec-Driven)

> Specyfikacja dla Claude Code działającego w trybie OpenSpec (Spec-Driven Development).
> Ten dokument jest **single source of truth**. Każda zmiana kodu MUSI być poprzedzona aktualizacją tej specyfikacji.
> Wymagania używają konwencji RFC 2119 (MUST / SHOULD / MAY). Kryteria akceptacyjne mają formę Given/When/Then.

---

## 1. Cel i zakres

Prosty dashboard zadaniowy (kanban-style) w architekturze mikroserwisowej. System składa się z trzech niezależnych serwisów uruchamianych jedną komendą przez Docker Compose. Auth jest **headless** — wystawia wyłącznie API, nie posiada własnego UI. Cała warstwa prezentacji znajduje się we frontendzie.

**Out of scope (MVP):** powiadomienia, komentarze do kart, załączniki, historia zmian, paginacja, wyszukiwanie, reset hasła, OAuth zewnętrzny.

---

## 2. Architektura

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  frontend    │────▶│  task-service    │────▶│  auth-service    │
│  React/TS    │     │  Java/Spring     │     │  Python/FastAPI  │
│  + Tailwind  │     │  + PostgreSQL    │     │  + PostgreSQL    │
└──────────────┘     └──────────────────┘     └──────────────────┘
       │                      ▲                         │
       └──────────────────────┼── login/register ───────┘
                             JWT (RS256)
```

### 2.1. Serwisy

| Serwis         | Stack                              | DB                    | Rola |
|----------------|------------------------------------|-----------------------|------|
| `auth-service` | Python + FastAPI (MUST)            | PostgreSQL (`authdb`)  | Tożsamość, rejestracja, logowanie, wydawanie JWT, zarządzanie użytkownikami |
| `task-service` | Java 21 + Spring Boot              | PostgreSQL (`taskdb`)  | CRUD kart, autoryzacja oparta o JWT |
| `frontend`     | TypeScript + React + Vite + TailwindCSS | —                | UI logowania, rejestracji i tablicy zadań |

> Nazewnictwo ujednolicone z wytycznymi klienta: `auth-service`, `task-service`. W całej specyfikacji `task-service` ≡ wcześniejszy „backend”.

> Każdy serwis MUSI mieć osobną bazę danych (database-per-service). Serwisy NIE współdzielą schematu.

### 2.2. Model uwierzytelniania (headless)

- `auth-service` jest jedynym serwisem znającym hasła. Hasła MUSZĄ być hashowane (bcrypt lub argon2).
- `auth-service` wydaje **JWT podpisany kluczem prywatnym RS256**.
- `auth-service` udostępnia klucz publiczny pod `GET /.well-known/jwks.json` (lub statyczny PEM przez zmienną środowiskową).
- `task-service` waliduje JWT **lokalnie** kluczem publicznym. `task-service` NIE odpytuje `auth-service` przy każdym żądaniu.
- JWT MUSI zawierać claims: `sub` (user id), `email`, `role` (`ADMIN` | `USER`), `exp`, `iat`.

---

## 3. Model danych

### 3.1. auth-service — `users`

| Kolumna         | Typ          | Ograniczenia |
|-----------------|--------------|--------------|
| `id`            | UUID         | PK |
| `email`         | VARCHAR      | UNIQUE, NOT NULL |
| `password_hash` | VARCHAR      | NOT NULL |
| `role`          | VARCHAR      | NOT NULL, IN (`ADMIN`, `USER`), default `USER` |
| `created_at`    | TIMESTAMPTZ  | NOT NULL |

### 3.2. task-service — `cards`

| Kolumna        | Typ          | Ograniczenia |
|----------------|--------------|--------------|
| `id`           | UUID         | PK |
| `title`        | VARCHAR      | NOT NULL |
| `description`  | TEXT         | NULL |
| `status`       | VARCHAR      | NOT NULL, IN (`OPEN`,`TODO`,`IN_PROGRESS`,`REVIEW`,`DONE`), default `OPEN` |
| `creator_id`   | UUID         | NOT NULL (id z auth-service, **nie** FK — inny serwis) |
| `assignee_id`  | UUID         | NULL |
| `created_at`   | TIMESTAMPTZ  | NOT NULL |
| `updated_at`   | TIMESTAMPTZ  | NOT NULL |

> `creator_id` i `assignee_id` referują użytkowników z serwisu `auth-service`. Z uwagi na rozdział baz NIE są kluczami obcymi. `task-service` ufa `sub`/`role` z zwalidowanego JWT.

### 3.3. Statusy

Dozwolone wartości: `OPEN`, `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`.
Przejścia: **dowolny → dowolny** (brak wymuszonego przepływu). Walidowana jest wyłącznie przynależność do enuma.

---

## 4. Role i uprawnienia

### 4.1. Admin główny (bootstrap)

- MUSI istnieć od startu systemu.
- Seedowany przez `auth-service` przy starcie na podstawie zmiennych `BOOTSTRAP_ADMIN_EMAIL` i `BOOTSTRAP_ADMIN_PASSWORD`.
- Seed MUSI być **idempotentny**: jeśli użytkownik o tym emailu istnieje, nie nadpisuje go.
- **Decyzja: `.env`, nie migracja.** Uzasadnienie: hasło nie trafia do repozytorium ani do plików migracji (brak plaintextu/hardcoded hasha w historii Git), zmiana poświadczeń nie wymaga edycji migracji, a hash powstaje tą samą ścieżką co dla zwykłych użytkowników. Migracja seedująca wymuszałaby zapis hasła w kodzie źródłowym, co jest gorszą praktyką.

### 4.2. Macierz uprawnień

| Akcja                                   | ADMIN | USER |
|-----------------------------------------|-------|------|
| Rejestracja konta (niezalogowany)       | n/d   | ✅ (samodzielnie email+hasło) |
| Tworzenie użytkownika                    | ✅    | ❌ |
| Awansowanie użytkownika na admina        | ✅    | ❌ |
| Widok kart                               | wszystkie | tylko utworzone przez siebie LUB przypisane do siebie |
| Tworzenie karty                          | ✅ (dowolny assignee) | ✅ (auto-przypisanie do siebie) |
| Zmiana statusu karty                     | każdej | tylko utworzonych przez siebie |
| Zmiana przypisania (assignee)            | każdej | tylko utworzonych przez siebie |
| Usunięcie karty                          | każdej | tylko utworzonych przez siebie |

> Niezalogowany użytkownik MOŻE jedynie: zarejestrować się i zalogować. Wszystkie inne endpointy MUSZĄ zwracać `401`.
> USER tworzący kartę jest automatycznie ustawiany jako `creator_id` ORAZ `assignee_id`.
> Reguła widoczności i edycji USER-a opiera się o `creator_id` (edycja) i `creator_id`/`assignee_id` (widok), porównywane z `sub` z JWT.

---

## 5. Kontrakty API

> Wszystkie żądania chronione wymagają nagłówka `Authorization: Bearer <jwt>`.
> Format błędu (wszędzie): `{ "error": { "code": string, "message": string } }`.
> Kody: `200` OK, `201` Created, `204` No Content (DELETE), `400` walidacja, `401` brak/zły token, `403` brak uprawnień, `404` nie znaleziono, `409` konflikt (np. email zajęty).

### 5.1. auth-service API (headless)

```
POST   /register
  body:    { email, password }
  resp:    201 { id, email, role }
  errors:  400 (zła walidacja), 409 (email zajęty)

POST   /login
  body:    { email, password }
  resp:    200 { access_token, token_type: "Bearer", expires_in }
  errors:  401 (złe dane)

GET    /users/me                         [auth required]
  resp:    200 { id, email, role }

GET    /.well-known/jwks.json
  resp:    200 { keys: [...] }            # klucz publiczny do walidacji w task-service

POST   /admin/users                      [ADMIN only]
  body:    { email, password, role? }
  resp:    201 { id, email, role }
  errors:  403, 409

POST   /admin/users/{id}/promote         [ADMIN only]
  resp:    200 { id, email, role: "ADMIN" }
  errors:  403, 404

GET    /admin/users                      [ADMIN only]   # potrzebne by admin mógł wybrać assignee
  resp:    200 [ { id, email, role } ]
```

### 5.2. task-service API

```
GET    /api/cards                        [auth required]
  # ADMIN: wszystkie. USER: creator_id == me OR assignee_id == me.
  resp:    200 [ Card ]

POST   /api/cards                        [auth required]
  body:    { title, description?, assignee_id? }
  # USER: assignee_id ignorowane, ustawiane na siebie. ADMIN: dowolny assignee_id.
  resp:    201 Card

PATCH  /api/cards/{id}/status            [auth required]
  body:    { status }
  # ADMIN: dowolna karta. USER: tylko własne (creator_id == me).
  resp:    200 Card
  errors:  400 (zły status), 403, 404

PATCH  /api/cards/{id}/assignee          [auth required]
  body:    { assignee_id }
  # ADMIN: dowolna karta. USER: tylko własne.
  resp:    200 Card
  errors:  403, 404

DELETE /api/cards/{id}                   [auth required]
  # ADMIN: dowolna. USER: tylko własne.
  resp:    204
  errors:  403, 404

GET    /api/health
  resp:    200 { status: "ok" }
```

`Card` = `{ id, title, description, status, creator_id, assignee_id, created_at, updated_at }`.

---

## 6. Frontend (React/TS + TailwindCSS)

- MUSI używać **TailwindCSS** do stylowania (utility-first, konfiguracja `tailwind.config.js`).
- MUSI obsługiwać: rejestrację, logowanie, wylogowanie (czyszczenie tokenu).
- MUSI renderować tablicę z 5 kolumnami statusów.
- MUSI pozwalać: tworzyć kartę, zmieniać status (przód/tył — przeniesienie między kolumnami), usuwać kartę.
- MUSI ukrywać/wyłączać akcje niedozwolone dla roli/własności karty (UI odzwierciedla macierz z sekcji 4.2).
- ADMIN MUSI móc wskazać assignee z listy użytkowników (`GET /admin/users`).
- Token JWT przechowywany w pamięci aplikacji lub `localStorage` (MVP). Adres API z env (`VITE_API_BASE_URL`, `VITE_AUTH_BASE_URL`).
- SHOULD: obsługa stanów ładowania i błędów (np. `401` → przekierowanie na login).
- **UWAGA build-time:** zmienne `VITE_*` są wstrzykiwane do bundla podczas `vite build`, NIE w runtime. Adresy API produkcyjne (CloudFront/ALB) MUSZĄ być znane w momencie budowania obrazu/artefaktu (patrz sekcja 12.4). Build lokalny i build pod AWS używają różnych wartości tych zmiennych.

---

## 7. Docker / uruchomienie

- MUSI istnieć `docker-compose.yml` w katalogu głównym uruchamiający **cały system jedną komendą**: `docker compose up --build`.
- Serwisy: `frontend`, `task-service`, `auth-service`, `auth-db` (Postgres), `task-db` (Postgres).
- Bazy MUSZĄ używać healthchecków; `task-service`/`auth-service` startują po `healthy` swoich baz (`depends_on: condition: service_healthy`).
- Konfiguracja przez `.env` w katalogu głównym. MUSI być dołączony `.env.example` z wszystkimi kluczami.
- Klucze RS256: para generowana przy buildzie/starcie `auth-service` LUB dostarczona przez env. Klucz publiczny dostępny dla `task-service`.

### 7.1. Wymagane zmienne (.env.example)

```
# auth-service
AUTH_DB_URL=postgresql://auth:auth@auth-db:5432/authdb
JWT_PRIVATE_KEY_PATH=/keys/private.pem
JWT_PUBLIC_KEY_PATH=/keys/public.pem
JWT_EXPIRES_IN=3600
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=change-me

# task-service
TASK_DB_URL=jdbc:postgresql://task-db:5432/taskdb
TASK_DB_USER=task
TASK_DB_PASSWORD=task
JWT_PUBLIC_KEY_PATH=/keys/public.pem
# lub: AUTH_JWKS_URL=http://auth-service:8000/.well-known/jwks.json

# frontend (build-time)
VITE_API_BASE_URL=http://localhost:8080
VITE_AUTH_BASE_URL=http://localhost:8000
```

### 7.2. Porty (sugerowane)

`frontend` 3000 → `task-service` 8080 → `auth-service` 8000.

---

## 8. Wymagania niefunkcjonalne

- **NFR-1** Każdy serwis MUSI mieć endpoint health (`/health` / `/actuator/health`).
- **NFR-2** `task-service` NIE MOŻE wykonywać sieciowego wywołania do `auth-service` na ścieżce walidacji tokenu (walidacja lokalna kluczem publicznym).
- **NFR-3** Hasła MUSZĄ być hashowane; plaintext NIE MOŻE pojawić się w bazie ani logach.
- **NFR-4** CORS w `task-service` i `auth-service` MUSI zezwalać na origin frontendu.
- **NFR-5** Sekrety (hasła, klucze) MUSZĄ pochodzić z env, nie z repozytorium.
- **NFR-6** `README.md` MUSI opisywać: jak uruchomić, dane logowania admina, krótki opis architektury i decyzji (headless, RS256, db-per-service).

---

## 9. Kryteria akceptacyjne (Given/When/Then)

### AC-1 — Bootstrap admina
- **Given** świeży system z ustawionym `BOOTSTRAP_ADMIN_EMAIL`/`PASSWORD`
- **When** `auth-service` startuje
- **Then** konto admina istnieje i można się nim zalogować przez `POST /login`
- **And** ponowny restart NIE tworzy duplikatu ani nie nadpisuje hasła

### AC-2 — Samodzielna rejestracja
- **Given** niezalogowany użytkownik
- **When** wywoła `POST /register` z nowym emailem i hasłem
- **Then** powstaje konto z rolą `USER` i może się zalogować

### AC-3 — Rejestracja zajętego emaila
- **Given** email już istnieje
- **When** `POST /register` z tym emailem
- **Then** odpowiedź `409`

### AC-4 — Walidacja JWT lokalnie
- **Given** ważny JWT wydany przez `auth-service`
- **When** `task-service` otrzyma żądanie z tym tokenem
- **Then** `task-service` autoryzuje bez sieciowego wywołania do `auth-service`
- **And** token z błędnym podpisem → `401`

### AC-5 — Widoczność kart (USER)
- **Given** USER A oraz karty: jedna utworzona przez A, jedna przypisana do A, jedna obca
- **When** A wywoła `GET /api/cards`
- **Then** widzi dokładnie dwie pierwsze, nie widzi obcej

### AC-6 — Widoczność kart (ADMIN)
- **Given** karty wielu użytkowników
- **When** ADMIN wywoła `GET /api/cards`
- **Then** widzi wszystkie

### AC-7 — Auto-przypisanie przy tworzeniu przez USER
- **Given** zalogowany USER
- **When** tworzy kartę (nawet podając obcy `assignee_id`)
- **Then** `creator_id` i `assignee_id` == jego id

### AC-8 — Tworzenie z assignee przez ADMIN
- **Given** zalogowany ADMIN i istniejący USER B
- **When** ADMIN tworzy kartę z `assignee_id = B`
- **Then** karta ma `assignee_id == B`

### AC-9 — Zmiana statusu (USER, własna karta)
- **Given** USER i karta utworzona przez niego ze statusem `OPEN`
- **When** ustawia status na `DONE`
- **Then** status == `DONE` (dowolne przejście dozwolone)

### AC-10 — Zmiana statusu cudzej karty przez USER
- **Given** USER i karta przypisana do niego, ale utworzona przez kogoś innego
- **When** próbuje zmienić jej status
- **Then** odpowiedź `403`

### AC-11 — Niepoprawny status
- **Given** dowolna karta
- **When** `PATCH /status` z wartością spoza enuma
- **Then** odpowiedź `400`

### AC-12 — Usuwanie
- **Given** USER i karta cudza
- **When** próbuje ją usunąć
- **Then** `403`; **And** ADMIN usuwający dowolną kartę → `204`

### AC-13 — Tworzenie użytkownika i awans (ADMIN)
- **Given** ADMIN
- **When** `POST /admin/users` tworzy konto, a następnie `POST /admin/users/{id}/promote`
- **Then** użytkownik istnieje i ma rolę `ADMIN`
- **And** ten sam request od USER-a → `403`

### AC-14 — Dostęp bez tokenu
- **Given** brak nagłówka `Authorization`
- **When** żądanie do dowolnego chronionego endpointu
- **Then** `401`

### AC-15 — Jednokomendowy start
- **Given** sklonowane repo i skopiowany `.env`
- **When** `docker compose up --build`
- **Then** wszystkie serwisy wstają zdrowe, frontend dostępny, logowanie adminem działa end-to-end

---

## 10. Struktura repozytorium (docelowa)

```
.
├── docker-compose.yml
├── .env.example
├── README.md
├── SPEC.md
├── auth-service/
│   ├── Dockerfile
│   └── app/...
├── task-service/
│   ├── Dockerfile
│   └── src/main/java/...
├── frontend/
│   ├── Dockerfile
│   └── src/...
└── infra/                      # Faza 2 — AWS (patrz sekcja 12)
    ├── terraform/              # albo: skrypty AWS CLI
    └── README.md
```

---

## 11. Workflow OpenSpec dla Claude Code

1. **Proposal** — na podstawie tej specyfikacji wygeneruj `proposal.md` per zmiana (np. „auth-service”, „task-service-cards”, „frontend-board”, „docker-compose”, „aws-deploy”). Aktualizuj spec PRZED kodem.
2. **Apply** — implementuj zgodnie z proposalem; każdy task domknięty kryterium z sekcji 9 (faza 1) lub 12.6 (faza 2).
3. **Archive** — po przejściu kryteriów akceptacyjnych zmerguj spec i zarchiwizuj zmianę.

> Zasada nadrzędna: jeśli implementacja wymaga odstępstwa od SPEC.md — najpierw zaktualizuj SPEC.md, potem kod.

> **Kolejność faz:** Faza 1 (lokalny system na docker-compose, AC-1…AC-15) MUSI być ukończona i zielona PRZED rozpoczęciem Fazy 2 (AWS). Faza 2 NIE MOŻE wymagać zmian w kodzie aplikacji — wyłącznie konfiguracja, infrastruktura i CI/CD.

---

## 12. Deployment AWS (Faza 2 — ECS Fargate)

> Ta faza zaczyna się dopiero po zielonej Fazie 1. Cel: ten sam system działający w chmurze, bez zmian w logice aplikacji.

### 12.1. Docelowa architektura

```
                         ┌──────────────────────────┐
   użytkownik ──HTTPS──▶ │  CloudFront (CDN, ACM)    │
                         └────────────┬─────────────┘
                    ┌─────────────────┼──────────────────┐
            default behavior      /api/*  →  ALB     (origin 2)
                    │                                  │
            ┌───────▼────────┐              ┌──────────▼───────────┐
            │ S3 (React SPA) │              │  ALB (HTTPS)         │
            │  OAC-only      │              └──────┬───────┬───────┘
            └────────────────┘                     │       │
                                          ┌─────────▼──┐ ┌──▼──────────┐
                                          │ ECS Fargate│ │ ECS Fargate │
                                          │ task-service│ │ auth-service│
                                          └─────┬───────┘ └──────┬──────┘
                                                │                │
                                          ┌─────▼────────────────▼─────┐
                                          │  RDS PostgreSQL (2 bazy /   │
                                          │  2 instancje)               │
                                          └─────────────────────────────┘
```

### 12.2. Mapowanie komponentów

| Komponent lokalny        | Odpowiednik AWS |
|--------------------------|-----------------|
| `frontend` (statyczny build) | **S3** (bucket prywatny) + **CloudFront** (OAC, certyfikat z **ACM**) |
| `task-service` (kontener)| **ECS Fargate** service za **ALB**, obraz w **ECR** |
| `auth-service` (kontener)| **ECS Fargate** service za **ALB** (osobny target group / ścieżka), obraz w **ECR** |
| `task-db`, `auth-db`     | **RDS PostgreSQL** (osobne instancje LUB jedna instancja z dwiema bazami — patrz 12.3) |
| `.env` / sekrety         | **AWS Secrets Manager** (klucz prywatny RS256, hasła DB, bootstrap admina) |
| zmienne konfiguracyjne   | ECS **task definition** `environment` + `secrets` |

### 12.3. Decyzje upraszczające (rekomendacje dla osoby początkującej w AWS)

- **AWS Copilot CLI** zamiast ręcznego Terraform/CloudFormation. Copilot generuje VPC, klaster ECS, ALB, task definitions i pipeline z kilku poleceń (`copilot init`, `copilot env deploy`, `copilot svc deploy`). To zdecydowanie najmniej konfiguracji przy starcie. Terraform pozostaje opcją (SHOULD), jeśli klient oczekuje IaC do code review — wtedy `infra/terraform/`.
- **RDS:** dla MVP jedna instancja PostgreSQL z dwiema bazami (`authdb`, `taskdb`) jest tańsza i prostsza niż dwie instancje. Rozdział logiczny (osobne bazy + osobni użytkownicy DB) zachowuje zasadę db-per-service na poziomie schematu. Dwie osobne instancje to SHOULD, jeśli wymagana jest pełna izolacja.
- **Routing API:** CloudFront z dwoma origin — S3 (domyślny) i ALB (behavior `/api/*` i `/auth/*`) — pozwala wystawić wszystko pod jedną domeną HTTPS i eliminuje problemy CORS oraz mixed-content. Alternatywa: osobna domena dla API.
- **Region:** `eu-central-1` (Frankfurt) — najbliżej PL, niższe opóźnienia, zgodność z RODO.
- **Koszt:** Fargate rozliczany za czas działania; dla zadania rekrutacyjnego rozważ wyłączanie środowiska po demie. Udokumentuj w `infra/README.md` jak je zniszczyć (`copilot app delete` / `terraform destroy`).

### 12.4. Konfiguracja zależna od środowiska

- `task-service`/`auth-service`: connection string DB, klucze JWT, CORS origin (domena CloudFront) — wstrzykiwane przez task definition (`secrets` → Secrets Manager dla wrażliwych, `environment` dla reszty). Zero zmian w kodzie względem Fazy 1 (NFR-5).
- `frontend`: `VITE_API_BASE_URL`/`VITE_AUTH_BASE_URL` ustawione na domenę CloudFront w momencie **build-time** w CI (patrz sekcja 6). Build produkcyjny jest osobny od lokalnego.
- Klucz prywatny RS256 w Secrets Manager; klucz publiczny dostarczony do `task-service` analogicznie. Para NIE MOŻE trafić do obrazu kontenera ani repo.

### 12.5. Deploy CLI (oczekiwany rezultat)

- MUSI istnieć `infra/` z konfiguracją (Copilot manifests LUB Terraform) oraz `infra/README.md` opisującym krok po kroku: prerekwizyty (AWS CLI, konto, region), kolejność poleceń, jak zniszczyć środowisko.
- SHOULD: skrypt/`Makefile` zamykający deploy w jedną/kilka komend (build → push do ECR → deploy ECS → sync S3 → invalidacja CloudFront).
- SHOULD: pipeline CI/CD (GitHub Actions) budujący obrazy, pushujący do ECR i deployujący — ale ręczny deploy przez CLI jest wystarczający dla MVP.

### 12.6. Kryteria akceptacyjne — AWS

#### AC-16 — Frontend z CloudFront
- **Given** wdrożona infrastruktura
- **When** otwieram domenę CloudFront w przeglądarce
- **Then** ładuje się aplikacja React po HTTPS, a bucket S3 NIE jest dostępny bezpośrednio (tylko przez OAC)

#### AC-17 — API za ALB
- **Given** wdrożone serwisy ECS
- **When** frontend woła `/api/*` i `/auth/*`
- **Then** żądania trafiają przez ALB do właściwych serwisów Fargate i wracają poprawne odpowiedzi

#### AC-18 — Pełny przepływ end-to-end w chmurze
- **Given** wdrożony system
- **When** loguję się adminem (z Secrets Manager), tworzę kartę, zmieniam status, usuwam
- **Then** wszystkie operacje działają jak lokalnie (AC-1…AC-15 przechodzą przeciw środowisku AWS)

#### AC-19 — Sekrety poza repo i obrazem
- **Given** wdrożone serwisy
- **When** inspekcjonuję obrazy ECR i repozytorium
- **Then** klucz prywatny RS256, hasła DB i hasło admina NIE występują w obrazie ani w kodzie — pochodzą z Secrets Manager

#### AC-20 — Odtwarzalność i sprzątanie
- **Given** czyste konto AWS i `infra/README.md`
- **When** wykonuję udokumentowane polecenia
- **Then** środowisko wstaje od zera, a polecenie sprzątające usuwa wszystkie utworzone zasoby (brak osieroconych kosztów)
