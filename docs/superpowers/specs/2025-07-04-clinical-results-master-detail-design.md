# Clinical Results Tab — Master-Detail Redesign

## Problem

The current `ClinicalResultCard` renders all metric rows inline, making the card stretch vertically when a test has many values. This makes it hard to scan the list of results, especially for doctors who need to quickly identify abnormal reports.

## Goal

Replace the single-column card list with a **master-detail** layout:

- **Left column (master):** compact cards showing only summary info
- **Right column (detail):** full report detail when a card is selected; empty state when nothing is selected

## Component Architecture

```
ClinicalResultsTab.jsx (orchestrator, 2-column shell)
├── [Left column]
│   ├── cr-toolbar (title + "New Result" button)
│   ├── cr-category-section per category
│   │   └── cr-card-grid
│   │       └── ClinicalResultCompactCard × N
│   └── cr-empty-state (no results returned)
├── [Right column]
│   ├── ClinicalResultDetailPanel (selected card)
│   │   ├── Badge bar + Edit button
│   │   ├── Title + metadata line
│   │   ├── Full metrics table
│   │   ├── Doctor assessment
│   │   ├── Patient summary
│   │   └── View file link (if attached)
│   └── cr-empty-detail-state (no selection)
└── ClinicalResultModal (unchanged — opened by Edit button)
```

### New components

| Component | Responsibility |
|---|---|
| `ClinicalResultCompactCard` | Renders summary info for the left column. Click → select. Accepts `result`, `isSelected`, `onSelect`. |
| `ClinicalResultDetailPanel` | Renders full detail in the right column. Accepts `result`, `canManage`, `onEdit`. Edit → calls `onEdit(result)` → opens `ClinicalResultModal`. |

### Modified components

| Component | Change |
|---|---|
| `ClinicalResultsTab` | Add `selectedResultId` state, 2-column CSS shell, keyboard interaction. |

### Unchanged components

`ClinicalResultModal`, `ClinicalResultFilePane`, `ClinicalResultFormPane` — no changes.

## Left column — ClinicalResultCompactCard

### Layout

```
┌──────────────────────────────────────┐
│ [CRITICAL] [RESULT_READY]            │  ← status badges (inline)
│ CBC — Complete Blood Count           │  ← test name (bold, truncate)
│ ⚠ 2 abnormal values                  │  ← abnormal count (red/orange)
│ Lab: Medilab · Jun 15, 2025          │  ← lab + date (muted, single line)
│ ─────────────────────────────────    │
│ Assessment: Patient shows...   (2 dòng, truncate) │
│ Summary: No prior...          (1 dòng, truncate)  │
└──────────────────────────────────────┘
```

### States

- **Default:** subtle border, white bg
- **Selected:** primary border (blue), subtle primary bg tint (`--primary-subtle`)
- **Hover:** slight shadow lift, cursor pointer
- **Draft:** `Draft` badge shown (same as current)
- **Empty/loading:** skeleton cards matching compact card shape

### Props

```ts
{
  result: MedicalDocumentResponse;
  isSelected: boolean;
  onSelect: (result: MedicalDocumentResponse) => void;
}
```

## Right column — ClinicalResultDetailPanel

### Layout (selected state)

```
┌──────────────────────────────────────────┐
│ [CRITICAL] [CBC] [Draft]    [✏️ Edit]   │  ← badges + edit button
│──────────────────────────────────────────│
│ CBC — Complete Blood Count               │
│ Medilab · June 15, 2025                  │
│──────────────────────────────────────────│
│ Metrics:                                 │
│ ┌───────────┬────────┬───────┬────────┐ │
│ │ WBC       │ 6.8    │ K/µL  │ NORM   │ │
│ │ RBC       │ 4.2    │ M/µL  │ NORM   │ │
│ │ Hemoglobin│ 10.1   │ g/dL  │ LOW  ⚠ │ │
│ │ Hematocrit│ 32.5   │ %     │ LOW  ⚠ │ │
│ │ Platelets │ 250    │ K/µL  │ NORM   │ │
│ └───────────┴────────┴───────┴────────┘ │
│──────────────────────────────────────────│
│ Assessment:                               │
│ Patient shows mild anemia...              │
│──────────────────────────────────────────│
│ Patient summary:                          │
│ No prior similar findings.                │
│──────────────────────────────────────────│
│ 📄 View file → opens in new tab          │
└──────────────────────────────────────────┘
```

- Metrics table uses the same colors as current `cr-flag-chip` for abnormal flags
- Edit button → calls `onEdit(result)` → opens `ClinicalResultModal`

### Layout (empty state)

```
┌──────────────────────────────────────────┐
│                                          │
│            📋 Select a result             │
│     Click a result from the left panel   │
│     to view its full details here.       │
│                                          │
└──────────────────────────────────────────┘
```

### Props

```ts
{
  result: MedicalDocumentResponse | null;
  canManage: boolean;
  onEdit: (result: MedicalDocumentResponse) => void;
}
```

## Column sizing

```css
.cr-master-shell {
  display: grid;
  grid-template-columns: 1fr 1.5fr;  /* ~40% / ~60% */
  gap: 1rem;
  min-height: 28rem;
}
```

On screens < 768px, stack vertically.

## CSS

All new CSS in `doctor-shared-records.css`, using `cr-` prefix with token variables (`var(--primary)`, `var(--surface)`, etc.) — consistent with the existing restyle.

## Data flow

1. `ClinicalResultsTab` fetches results via `getAppointmentResults(appointmentId)`
2. Groups results by category via `groupByCategory()`
3. Renders categories in left column with `ClinicalResultCompactCard` per result
4. Click card → `setSelectedResult(result)` → right column renders `ClinicalResultDetailPanel`
5. Edit click → `onEdit(result)` → opens `ClinicalResultModal` (same flow as today)
6. Modal saves → `onSaved` refreshes the list and clears selection

## Error handling

- Fetch error: existing `sr-error-state` in tab
- Empty results: existing `cr-empty-state` in left column
- No selection: new `cr-empty-detail-state` in right column
- Save error: existing toast in `ClinicalResultModal`

## Testing

- `ClinicalResultCompactCard` renders summary fields, highlights when selected
- `ClinicalResultDetailPanel` renders full metrics, shows empty state when `result` is null, edit click fires `onEdit`
- `ClinicalResultsTab` selects card, shows detail panel, clears selection on modal close
