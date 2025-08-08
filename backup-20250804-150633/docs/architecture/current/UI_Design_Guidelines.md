# ESpice UI Design Guidelines

## Overview

This document provides comprehensive guidelines for UI development in the ESpice project. All developers must follow these guidelines to ensure consistency, accessibility, and user experience excellence.

## Theme System

### Unified Theme Architecture

The ESpice application uses a unified theme system with synchronized dark and light modes:

- **Theme File**: `apps/desktop/src/styles/theme-system.css`
- **Theme Toggle**: `apps/desktop/src/components/ui/ThemeToggle.tsx`
- **CSS Variables**: All colors, spacing, and typography defined as CSS custom properties

### Theme Implementation Rules

1. **ALWAYS use CSS variables** - Never hardcode colors, spacing, or typography values
2. **Use HSL format** for CSS-in-JS compatibility: `hsl(var(--primary))`
3. **Test both themes** - Every component must work in both light and dark modes
4. **Smooth transitions** - Use `var(--transition-normal)` for theme changes
5. **Consistent naming** - Follow the established variable naming convention

### Color Usage Guidelines

#### Primary Colors
```css
/* Use for main actions, brand elements */
background: hsl(var(--primary));
color: hsl(var(--primary-foreground));
```

#### Semantic Colors
```css
/* Success states */
background: hsl(var(--success-50));
color: hsl(var(--success-700));

/* Warning states */
background: hsl(var(--warning-50));
color: hsl(var(--warning-700));

/* Error states */
background: hsl(var(--error-50));
color: hsl(var(--error-700));

/* Info states */
background: hsl(var(--info-50));
color: hsl(var(--info-700));
```

#### Neutral Colors
```css
/* Backgrounds */
background: hsl(var(--background));
background: hsl(var(--card));

/* Text */
color: hsl(var(--foreground));
color: hsl(var(--muted-foreground));

/* Borders */
border-color: hsl(var(--border));
```

## Component System

### Component Structure

Every UI component must follow this structure:

```tsx
"use client"

import React from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  className?: string;
  // ... other props
}

export const Component: React.FC<ComponentProps> = ({ 
  className,
  // ... other props
}) => {
  return (
    <div className={cn("base-component-classes", className)}>
      {/* Component content */}
    </div>
  );
};
```

### Component Guidelines

1. **Use `cn()` utility** for class merging
2. **Accept `className` prop** for customization
3. **Use semantic HTML** elements
4. **Include proper TypeScript types**
5. **Add accessibility attributes** (aria-labels, roles, etc.)

### Button System

Use the unified button classes:

```tsx
// Primary button
<button className="btn btn-primary btn-md">Action</button>

// Secondary button
<button className="btn btn-secondary btn-md">Secondary</button>

// Outline button
<button className="btn btn-outline btn-md">Outline</button>

// Ghost button
<button className="btn btn-ghost btn-md">Ghost</button>

// Destructive button
<button className="btn btn-destructive btn-md">Delete</button>
```

### Card System

Use the unified card classes:

```tsx
<div className="card">
  <div className="card-header">
    <h3>Card Title</h3>
  </div>
  <div className="card-content">
    <p>Card content</p>
  </div>
  <div className="card-footer">
    <button className="btn btn-primary">Action</button>
  </div>
</div>
```

### Input System

Use the unified input classes:

```tsx
<input 
  type="text" 
  className="input" 
  placeholder="Enter text..."
/>
```

### Status Indicators

Use the unified status classes:

```tsx
<span className="status status-success">Success</span>
<span className="status status-warning">Warning</span>
<span className="status status-error">Error</span>
<span className="status status-info">Info</span>
```

## Typography System

### Font Families

- **Sans-serif**: `var(--font-family-sans)` - For general text
- **Monospace**: `var(--font-family-mono)` - For code, data, technical content

### Font Sizes

```css
.text-xs    /* 0.75rem - 12px */
.text-sm    /* 0.875rem - 14px */
.text-base  /* 1rem - 16px */
.text-lg    /* 1.125rem - 18px */
.text-xl    /* 1.25rem - 20px */
.text-2xl   /* 1.5rem - 24px */
.text-3xl   /* 1.875rem - 30px */
.text-4xl   /* 2.25rem - 36px */
```

### Font Weights

```css
.font-light    /* 300 */
.font-normal   /* 400 */
.font-medium   /* 500 */
.font-semibold /* 600 */
.font-bold     /* 700 */
```

### Typography Guidelines

1. **Use semantic HTML** - `<h1>`, `<h2>`, `<p>`, etc.
2. **Maintain hierarchy** - Don't skip heading levels
3. **Use monospace for** - Code, data tables, technical parameters
4. **Use sans-serif for** - General text, labels, descriptions

## Spacing System

### Spacing Scale

```css
.p-xs  /* 0.25rem - 4px */
.p-sm  /* 0.5rem - 8px */
.p-md  /* 1rem - 16px */
.p-lg  /* 1.5rem - 24px */
.p-xl  /* 2rem - 32px */

.m-xs  /* 0.25rem - 4px */
.m-sm  /* 0.5rem - 8px */
.m-md  /* 1rem - 16px */
.m-lg  /* 1.5rem - 24px */
.m-xl  /* 2rem - 32px */
```

### Spacing Guidelines

1. **Use consistent spacing** - Stick to the defined scale
2. **Prefer padding over margin** - For component internals
3. **Use margin for** - Component spacing and layout
4. **Maintain rhythm** - Use consistent spacing patterns

## Layout System

### Grid System

Use the responsive grid classes:

```tsx
<div className="responsive-grid responsive-grid-2">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### Container System

```tsx
<div className="page-container">
  <div className="page-header">
    <h1 className="page-title">Page Title</h1>
    <p className="page-description">Page description</p>
  </div>
  {/* Page content */}
</div>
```

### Panel System

```tsx
<div className="unified-panel">
  <div className="unified-panel-header">
    <h3>Panel Title</h3>
  </div>
  <div className="unified-panel-content">
    {/* Panel content */}
  </div>
  <div className="unified-panel-footer">
    {/* Panel actions */}
  </div>
</div>
```

## Accessibility Guidelines

### WCAG 2.1 AA Compliance

1. **Color Contrast** - Minimum 4.5:1 ratio for normal text
2. **Focus Indicators** - Clear focus states for all interactive elements
3. **Keyboard Navigation** - Full keyboard accessibility
4. **Screen Reader Support** - Proper ARIA labels and semantic HTML
5. **Text Scaling** - Support for 200% zoom without horizontal scrolling

### Accessibility Implementation

```tsx
// Proper button with accessibility
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

// Proper form with labels
<label htmlFor="email" className="form-label">
  Email Address
</label>
<input 
  id="email"
  type="email" 
  className="input"
  aria-describedby="email-error"
/>
<div id="email-error" className="form-error">
  Please enter a valid email address
</div>
```

### Focus Management

```css
/* Focus ring for all interactive elements */
.btn:focus-visible,
.input:focus-visible,
.card:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

## Responsive Design

### Breakpoints

```css
/* Mobile First Approach */
/* Base styles for mobile */

/* Tablet (768px and up) */
@media (min-width: 768px) {
  /* Tablet-specific styles */
}

/* Desktop (1024px and up) */
@media (min-width: 1024px) {
  /* Desktop-specific styles */
}

/* Large Desktop (1280px and up) */
@media (min-width: 1280px) {
  /* Large desktop-specific styles */
}
```

### Responsive Guidelines

1. **Mobile-first approach** - Start with mobile styles
2. **Progressive enhancement** - Add features for larger screens
3. **Touch-friendly** - Minimum 44px touch targets
4. **Readable text** - Minimum 16px font size on mobile
5. **Flexible layouts** - Use CSS Grid and Flexbox

## Animation Guidelines

### Animation Principles

1. **Purposeful animations** - Only animate for functional reasons
2. **Consistent timing** - Use defined transition variables
3. **Smooth easing** - Use `ease-in-out` for natural feel
4. **Performance** - Use `transform` and `opacity` for smooth animations
5. **Reduced motion** - Respect user preferences

### Animation Implementation

```css
/* Use defined transition variables */
transition: all var(--transition-normal);

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Error Handling

### Error States

```tsx
// Input with error state
<div className="form-group">
  <label htmlFor="email" className="form-label">Email</label>
  <input 
    id="email"
    type="email" 
    className={cn("input", hasError && "border-error")}
    aria-invalid={hasError}
    aria-describedby={hasError ? "email-error" : undefined}
  />
  {hasError && (
    <div id="email-error" className="form-error">
      {errorMessage}
    </div>
  )}
</div>

// Status message
<div className="status status-error">
  {errorMessage}
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

## Form Guidelines

### Form Structure

```tsx
<form className="form">
  <div className="form-group">
    <label htmlFor="name" className="form-label">Name</label>
    <input 
      id="name"
      type="text" 
      className="input"
      required
    />
    <div className="form-description">
      Enter your full name
    </div>
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
```

### Form Validation

```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

const validateForm = () => {
  const newErrors: Record<string, string> = {};
  
  if (!email) {
    newErrors.email = 'Email is required';
  } else if (!isValidEmail(email)) {
    newErrors.email = 'Please enter a valid email';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

## Data Display

### Tables

```tsx
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
      <td>Vds</td>
      <td>650</td>
      <td>V</td>
    </tr>
  </tbody>
</table>
```

### Lists

```tsx
<ul className="list">
  <li className="list-item">Item 1</li>
  <li className="list-item">Item 2</li>
  <li className="list-item">Item 3</li>
</ul>
```

### Metrics

```tsx
<div className="metric-card">
  <div className="metric-value">1,234</div>
  <div className="metric-label">Total Parameters</div>
  <div className="metric-trend positive">+12%</div>
</div>
```

## Icon Usage

### Icon Guidelines

1. **Use Lucide React** - Primary icon library
2. **Consistent sizing** - Use defined size classes
3. **Semantic meaning** - Icons should enhance, not replace text
4. **Accessibility** - Always include aria-labels for icon-only buttons

### Icon Implementation

```tsx
import { Download, Upload, Settings } from 'lucide-react';

// Icon with text
<button className="btn btn-primary">
  <Download className="h-4 w-4 mr-2" />
  Download
</button>

// Icon-only button
<button 
  className="btn btn-ghost btn-icon"
  aria-label="Settings"
>
  <Settings className="h-5 w-5" />
</button>
```

## Development Workflow

### Component Development Checklist

- [ ] Uses CSS variables for all styling
- [ ] Works in both light and dark themes
- [ ] Includes proper TypeScript types
- [ ] Has accessibility attributes
- [ ] Includes proper error states
- [ ] Has loading states where appropriate
- [ ] Is responsive across all breakpoints
- [ ] Uses semantic HTML elements
- [ ] Includes proper focus management
- [ ] Has smooth transitions and animations
- [ ] Respects reduced motion preferences
- [ ] Includes proper ARIA labels and descriptions

### Code Review Checklist

- [ ] Follows theme system guidelines
- [ ] Uses unified component classes
- [ ] Implements proper accessibility
- [ ] Includes error handling
- [ ] Is responsive and mobile-friendly
- [ ] Uses consistent spacing and typography
- [ ] Has proper TypeScript types
- [ ] Includes proper documentation

### Testing Guidelines

1. **Theme testing** - Test in both light and dark modes
2. **Accessibility testing** - Use screen readers and keyboard navigation
3. **Responsive testing** - Test on multiple screen sizes
4. **Performance testing** - Ensure smooth animations and transitions
5. **Cross-browser testing** - Test in Chrome, Firefox, Safari, Edge

## File Organization

### Component Structure

```
apps/desktop/src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ThemeToggle.tsx
│   └── [feature]/             # Feature-specific components
├── styles/
│   ├── theme-system.css       # Unified theme system
│   └── design-system.css      # Design system utilities
└── lib/
    └── utils.ts              # Utility functions
```

### Import Guidelines

```tsx
// UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// Utilities
import { cn } from '@/lib/utils';

// Icons
import { Download, Settings } from 'lucide-react';
```

## Performance Guidelines

### Optimization Rules

1. **Use CSS variables** - For dynamic theme changes
2. **Minimize re-renders** - Use React.memo and useMemo appropriately
3. **Lazy load components** - For large or rarely used components
4. **Optimize images** - Use appropriate formats and sizes
5. **Bundle optimization** - Tree-shake unused code

### Best Practices

```tsx
// Optimized component with memo
const OptimizedComponent = React.memo<ComponentProps>(({ 
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

## Conclusion

These guidelines ensure consistency, accessibility, and maintainability across the ESpice application. All developers must follow these guidelines when creating or modifying UI components. Regular reviews and updates to these guidelines will ensure they remain current with best practices and project requirements.

### Key Principles

1. **Consistency** - Use unified design system
2. **Accessibility** - WCAG 2.1 AA compliance
3. **Performance** - Optimized for speed and efficiency
4. **Maintainability** - Clean, well-documented code
5. **User Experience** - Intuitive and responsive design

### Resources

- [Theme System CSS](./theme-system.css)
- [Design System CSS](./design-system.css)
- [Component Library](./ui/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) 