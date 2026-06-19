## MODIFIED Requirements

### Requirement: Status color badge

The frontend SHALL display a card's status on the main card view as a filled pill
badge color-coded by status: `OPEN` gray, `TODO` yellow/amber, `IN_PROGRESS` blue,
`REVIEW` purple, `DONE` green. The badge SHALL render a stage-tinted background, a
leading dot in the stage color, and the uppercase status label in the stage color.
The badge SHALL be a self-contained inline pill — its color SHALL NOT fill the entire
card or surrounding content.

#### Scenario: Status shown with status-specific color

- **WHEN** a card with a given status is rendered on the board
- **THEN** its status is shown inside a pill badge whose dot and text color match the
  status (OPEN→gray, TODO→amber, IN_PROGRESS→blue, REVIEW→purple, DONE→green) over a
  matching tinted background

#### Scenario: Color confined to the badge

- **WHEN** the status badge is rendered
- **THEN** the status-specific color (tint background, dot, and text) is confined to the
  badge pill and is not applied as a fill of the entire card or surrounding content

#### Scenario: Badge label matches the column

- **WHEN** a card renders in a status column
- **THEN** the badge's uppercase label matches that column's status name

## ADDED Requirements

### Requirement: Board toolbar with issue count

The frontend SHALL render a board toolbar above the columns containing a "Board" title
and a muted subtitle showing the total number of cards currently loaded, in the form
"· N issues". The count SHALL reflect the number of cards across all five columns and
SHALL stay in sync as cards are created or deleted. The primary "Create issue" button
SHALL be presented on the opposite (trailing) side of the same toolbar.

#### Scenario: Toolbar shows total issue count

- **WHEN** the board has finished loading its cards
- **THEN** the toolbar shows a "Board" title and a subtitle reading "· N issues" where N
  equals the total number of loaded cards

#### Scenario: Count updates on create and delete

- **WHEN** a card is created or deleted
- **THEN** the toolbar's "N issues" count updates to the new total

#### Scenario: Create button in the toolbar

- **WHEN** the toolbar renders
- **THEN** the primary "Create issue" button is shown on the trailing side of the toolbar
