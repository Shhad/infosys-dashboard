## MODIFIED Requirements

### Requirement: User login and token storage

The frontend SHALL provide a login screen that submits email and password to
auth-service `POST /login` and, on success, store the returned `access_token` in
`localStorage` and attach it as a `Bearer` token on subsequent API requests. After
login the app SHALL show the board. When `POST /login` fails with `401` (bad
credentials), the login screen SHALL display the message "Wrong email or password";
it MUST NOT display the session-expiry message and MUST NOT clear an existing
session or redirect.

#### Scenario: Successful login stores token
- **WHEN** a user submits valid credentials
- **THEN** the app stores the `access_token` from the `200` response in `localStorage`
  and renders the board

#### Scenario: Token attached to API calls
- **WHEN** an authenticated request is made to the task service
- **THEN** the request carries an `Authorization: Bearer <token>` header

#### Scenario: Invalid credentials rejected
- **WHEN** a user submits invalid credentials
- **THEN** the app shows an error and does not store a token

#### Scenario: Bad credentials show credential-specific message
- **WHEN** `POST /login` returns `401` because the email or password is wrong
- **THEN** the login screen shows "Wrong email or password"
- **AND** does not show the "session expired" message and does not redirect

### Requirement: Authentication routing and 401 handling

The frontend SHALL require authentication to view the board: an unauthenticated
visitor SHALL be shown the login screen. When an *authenticated* API call returns
`401`, the app SHALL clear the stored token and redirect to the login screen. The
global session-clear/redirect behaviour SHALL NOT apply to the unauthenticated
`POST /login` and `POST /register` requests, whose `401`/error responses are
surfaced to their own forms instead.

#### Scenario: Unauthenticated visitor routed to login
- **WHEN** a visitor without a stored token opens the app
- **THEN** the login screen is shown instead of the board

#### Scenario: 401 redirects to login
- **GIVEN** a logged-in user whose token has expired or been revoked
- **WHEN** an authenticated API call returns `401`
- **THEN** the app clears the token and redirects to the login screen

#### Scenario: Login 401 does not trigger session redirect
- **GIVEN** a visitor on the login screen submitting credentials
- **WHEN** `POST /login` returns `401`
- **THEN** the app does not clear/redirect via the global `401` handler and the
  error is shown on the login form
