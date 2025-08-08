# Dev Agent UI Implementation Guide

## Overview

This guide provides specific instructions for the dev.mdc agent when implementing UI components in the ESpice project. Follow these guidelines strictly to ensure consistency with the unified theme system.

## Critical Rules for Dev Agent

### 1. Theme System Compliance

**ALWAYS use the unified theme system:**
- **Theme File**: `apps/desktop/src/styles/theme-system.css`
- **Theme Toggle**: `apps/desktop/src/components/ui/ThemeToggle.tsx`
- **Theme Utils**: `apps/desktop/src/lib/theme-utils.ts`

**NEVER hardcode colors, spacing, or typography values.**

### 2. Component Implementation Checklist

Before implementing any UI component, ensure:

- [ ] Uses CSS variables from `theme-system.css`
- [ ] Works in both light and dark themes
- [ ] Uses unified component classes (`.btn`, `.card`, `.input`, etc.)
- [ ] Includes proper TypeScript types
- [ ] Has accessibility attributes (aria-labels, roles)
- [ ] Uses semantic HTML elements
- [ ] Includes proper focus management
- [ ] Has smooth transitions using `var(--transition-normal)`

### 3. File Structure Requirements

```
apps/desktop/src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── [ComponentName].tsx
│   │   └── ThemeToggle.tsx
│   └── [feature]/             # Feature-specific components
├── styles/
│   ├── theme-system.css       # Unified theme system
│   └── design-system.css      # Design system utilities
└── lib/
    ├── utils.ts              # Utility functions
    └── theme-utils.ts        # Theme utilities
```

## Implementation Standards

### Component Template

```tsx
"use client"

import React from 'react';
import { cn } from '@/lib/utils';

interface ComponentNameProps {
  className?: string;
  // ... other props
}

export const ComponentName: React.FC<ComponentNameProps> = ({ 
  className,
  // ... other props
}) => {
  return (
    <div className={cn("base-component-classes", className)}>
      {/* Component content using theme variables */}
    </div>
  );
};
```

### Color Usage

**ALWAYS use HSL format with CSS variables:**

```tsx
// ✅ CORRECT - Use CSS variables
<div className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
  Content
</div>

// ❌ WRONG - Hardcoded colors
<div className="bg-green-500 text-white">
  Content
</div>
```

### Button Implementation

```tsx
// Use unified button classes
<button className="btn btn-primary btn-md">
  Action
</button>

<button className="btn btn-secondary btn-sm">
  Secondary
</button>

<button className="btn btn-outline btn-lg">
  Outline
</button>
```

### Card Implementation

```tsx
<div className="card">
  <div className="card-header">
    <h3 className="text-lg font-semibold">Card Title</h3>
  </div>
  <div className="card-content">
    <p className="text-muted">Card content</p>
  </div>
  <div className="card-footer">
    <button className="btn btn-primary">Action</button>
  </div>
</div>
```

### Input Implementation

```tsx
<div className="form-group">
  <label htmlFor="input-id" className="form-label">
    Label
  </label>
  <input 
    id="input-id"
    type="text" 
    className="input"
    placeholder="Enter text..."
  />
  <div className="form-description">
    Description text
  </div>
</div>
```

### Status Indicators

```tsx
<span className="status status-success">Success</span>
<span className="status status-warning">Warning</span>
<span className="status status-error">Error</span>
<span className="status status-info">Info</span>
```

## Theme Testing Requirements

### 1. Test Both Themes

Every component must be tested in both light and dark modes:

```tsx
// Test component in both themes
const TestComponent = () => {
  const [isDark, setIsDark] = useState(false);
  
  return (
    <div className={isDark ? 'dark' : ''}>
      <YourComponent />
      <button onClick={() => setIsDark(!isDark)}>
        Toggle Theme
      </button>
    </div>
  );
};
```

### 2. Accessibility Testing

```tsx
// Ensure proper accessibility
<button 
  className="btn btn-primary"
  aria-label="Save changes"
  aria-describedby="save-description"
>
  Save
</button>
<div id="save-description" className="sr-only">
  Saves the current form data
</div>
```

### 3. Responsive Testing

```tsx
// Test responsive behavior
<div className="responsive-grid responsive-grid-2">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## Common Patterns

### Form Implementation

```tsx
const FormComponent = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  return (
    <form className="form">
      <div className="form-group">
        <label htmlFor="email" className="form-label">Email</label>
        <input 
          id="email"
          type="email" 
          className={cn("input", errors.email && "border-error")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <div id="email-error" className="form-error">
            {errors.email}
          </div>
        )}
      </div>
      
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Submit
        </button>
        <button type="button" className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
};
```

### Data Display

```tsx
// Table implementation
<table className="data-table">
  <thead>
    <tr>
      <th>Parameter</th>
      <th>Value</th>
      <th>Unit</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td className="font-mono">Vds</td>
      <td className="font-mono">650</td>
      <td>V</td>
    </tr>
  </tbody>
</table>

// Metric card
<div className="metric-card">
  <div className="metric-value">1,234</div>
  <div className="metric-label">Total Parameters</div>
  <div className="metric-trend positive">+12%</div>
</div>
```

### Loading States

```tsx
// Loading spinner
<div className="loading-spinner" />

// Loading overlay
<div className="loading-overlay">
  <div className="loading-spinner" />
</div>

// Skeleton loading
<div className="skeleton">
  <div className="skeleton-line" />
  <div className="skeleton-line" />
</div>
```

## Error Handling

### Error States

```tsx
// Input with error
<input 
  className={cn("input", hasError && "border-error")}
  aria-invalid={hasError}
  aria-describedby={hasError ? "error-message" : undefined}
/>
{hasError && (
  <div id="error-message" className="form-error">
    {errorMessage}
  </div>
)}

// Status message
<div className="status status-error">
  {errorMessage}
</div>
```

## Performance Guidelines

### Optimization

```tsx
// Use React.memo for expensive components
const ExpensiveComponent = React.memo<ComponentProps>(({ 
  className,
  children 
}) => {
  return (
    <div className={cn("base-classes", className)}>
      {children}
    </div>
  );
});

// Lazy loading
const LazyComponent = React.lazy(() => import('./LazyComponent'));

// Conditional rendering
{shouldShow && <LazyComponent />}
```

## Code Review Checklist

Before submitting any UI component, ensure:

- [ ] Uses CSS variables from `theme-system.css`
- [ ] Works in both light and dark themes
- [ ] Uses unified component classes
- [ ] Includes proper TypeScript types
- [ ] Has accessibility attributes
- [ ] Includes error handling
- [ ] Is responsive and mobile-friendly
- [ ] Uses consistent spacing and typography
- [ ] Has smooth transitions
- [ ] Respects reduced motion preferences
- [ ] Includes proper documentation

## Testing Requirements

### 1. Theme Testing
- Test component in light mode
- Test component in dark mode
- Verify smooth theme transitions
- Check color contrast ratios

### 2. Accessibility Testing
- Test with keyboard navigation
- Verify screen reader compatibility
- Check focus management
- Validate ARIA attributes

### 3. Responsive Testing
- Test on mobile (320px+)
- Test on tablet (768px+)
- Test on desktop (1024px+)
- Test on large desktop (1280px+)

### 4. Performance Testing
- Verify smooth animations
- Check for layout shifts
- Test with reduced motion
- Validate bundle size impact

## Common Mistakes to Avoid

### ❌ Don't Do This

```tsx
// Hardcoded colors
<div className="bg-green-500 text-white">
  Content
</div>

// Inconsistent spacing
<div className="p-4 m-2">
  Content
</div>

// Missing accessibility
<button onClick={handleClick}>
  Action
</button>

// No theme support
<div className="bg-white text-black">
  Content
</div>
```

### ✅ Do This Instead

```tsx
// Use CSS variables
<div className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
  Content
</div>

// Consistent spacing
<div className="p-md m-sm">
  Content
</div>

// Proper accessibility
<button 
  className="btn btn-primary"
  onClick={handleClick}
  aria-label="Perform action"
>
  Action
</button>

// Theme-aware
<div className="bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]">
  Content
</div>
```

## Resources

- **Theme System**: `apps/desktop/src/styles/theme-system.css`
- **Design System**: `apps/desktop/src/styles/design-system.css`
- **Theme Utils**: `apps/desktop/src/lib/theme-utils.ts`
- **UI Components**: `apps/desktop/src/components/ui/`
- **Full Guidelines**: `docs/architecture/current/UI_Design_Guidelines.md`

## Quick Reference

### CSS Variables
```css
/* Colors */
--primary, --secondary, --muted, --accent
--background, --foreground, --card, --border
--success, --warning, --error, --info

/* Typography */
--font-family-sans, --font-family-mono
--font-size-xs, --font-size-sm, --font-size-base, etc.

/* Spacing */
--spacing-xs, --spacing-sm, --spacing-md, --spacing-lg, --spacing-xl

/* Transitions */
--transition-fast, --transition-normal, --transition-slow
```

### Component Classes
```css
/* Buttons */
.btn, .btn-primary, .btn-secondary, .btn-outline, .btn-ghost, .btn-destructive
.btn-sm, .btn-md, .btn-lg, .btn-icon

/* Cards */
.card, .card-header, .card-content, .card-footer

/* Forms */
.form, .form-group, .form-label, .form-description, .form-error
.input

/* Status */
.status, .status-success, .status-warning, .status-error, .status-info

/* Layout */
.page-container, .page-header, .page-title, .page-description
.unified-panel, .unified-panel-header, .unified-panel-content, .unified-panel-footer
```

Remember: **Consistency is key**. Always use the unified theme system and follow these guidelines to maintain a cohesive user experience across the ESpice application. 