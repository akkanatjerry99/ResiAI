# AI Coding Agent Instructions

This document guides AI agents to be productive in this repo by codifying architecture, workflows, and conventions.

## Tech Stack
- **Framework**: React (Frontend), likely Vite/Next.js based on structure.
- **Styling**: Tailwind CSS with custom utility classes (e.g., `bg-glass-panel`, `text-main`).
- **Icons**: Lucide React.
- **Language**: TypeScript.

## UI Component Patterns
Reflect the high standards established in `components/PatientCard.tsx`:

### 1. Accessibility (Mandatory)
- **Semantic HTML**: Use `<article>`, `<header>`, `<section>`, `<h3>` instead of generic `<div>`.
- **Interactive Elements**:
  - Add `role="button"` and `tabIndex={0}` for clickable non-button elements.
  - Implement `onKeyDown` (Enter/Space) alongside `onClick`.
  - Ensure visible focus states: `focus-visible:outline-none focus-visible:ring-2`.
  - Minimum touch target size: `min-w-[44px] min-h-[44px]` for mobile.
- **ARIA**:
  - `aria-label` providing full context (e.g., "Patient John Doe, Room 101" vs just "Card").
  - `aria-hidden="true"` for decorative icons.
  - `role="status"` for badges/indicators.
  - `aria-live="polite"` for dynamic alerts.

### 2. Performance
- **Memoization**:
  - Wrap list items/heavy components in `React.memo`.
  - Use `useMemo` for expensive style/data calculations.
  - Use `useCallback` for event handlers passed to children.
- **Loading States**:
  - Use Skeleton loaders (animate-pulse) that match the layout dimensions to prevent layout shift.
  - Do not just show a spinner; mirror the component structure.

### 3. Styling & Layout
- **Tailwind**: Use arbitrary values `[]` sparingly; prefer theme tokens.
- **Glassmorphism**: Use project utilities `bg-glass-panel`, `bg-glass-depth`, `border-glass-border`.
- **Responsive**: Support mobile-first; hide/show elements using `hidden sm:inline`.
- **Z-Index**: Handle stacking contexts explicitly (e.g., `z-10` for absolute actions over content).

## Code Structure
- **Imports**: Group React hooks, Types, then Icons.
- **Types**: Import shared types from `../types`.
- **Logic**: Extract complex logic (like color mapping) into memoized helper functions inside the component or utility files.

## Example: Component Template
```tsx
import React, { useMemo, useCallback } from 'react';
import { Icon } from 'lucide-react';

interface Props {
  data: Data;
  onClick: () => void;
  isLoading?: boolean;
}

const Component: React.FC<Props> = ({ data, onClick, isLoading = false }) => {
  const styles = useMemo(() => computeStyles(data), [data]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  if (isLoading) return <Skeleton />;

  return (
    <article 
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      className="focus-visible:ring-2..."
    >
      {/* Content */}
    </article>
  );
};

export default React.memo(Component);
```