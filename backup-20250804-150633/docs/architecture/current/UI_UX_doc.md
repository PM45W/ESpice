# ESpice UI/UX Design Guidelines

> **IMPORTANT**: This document has been updated. For the latest comprehensive UI development guidelines, see [UI_Design_Guidelines.md](./UI_Design_Guidelines.md)

## Design System Overview

### Brand Identity
- **Primary Color**: `#00b388` (ESpice Green) - Hong Kong Microelectronics and Research Institute
- **Secondary Colors**: 
  - `#1a1a1a` (Dark Gray)
  - `#f5f5f5` (Light Gray)
  - `#ffffff` (White)
- **Typography**: Roboto font family
- **Design Philosophy**: Professional, clean, and efficient for technical workflows

### Design Principles
- **Clarity**: Interfaces are intuitive, with clear visual hierarchies to minimize cognitive load
- **Efficiency**: Components are designed to streamline workflows like datasheet input and parameter visualization
- **Consistency**: Uniform styling across components ensures a cohesive user experience
- **Accessibility**: Adheres to WCAG 2.1 guidelines, ensuring inclusivity for all users
- **Modularity**: Components are reusable and customizable to support future extensions

### Color Palette

#### Primary Colors
```css
:root {
  --primary-color: #00b388;
  --primary-hover: #009973;
  --primary-active: #008060;
  --primary-light: #e6f7f2;
}
```

#### Neutral Colors
```css
:root {
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-muted: #999999;
  --background-primary: #ffffff;
  --background-secondary: #f5f5f5;
  --border-color: #e0e0e0;
  --border-hover: #cccccc;
}
```

#### Semantic Colors
```css
:root {
  --success-color: #28a745;
  --warning-color: #ffc107;
  --error-color: #dc3545;
  --info-color: #17a2b8;
}
```

## Typography

### Font Stack
```css
font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Helvetica Neue', Arial, sans-serif;
```

### Type Scale
```css
:root {
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */
}
```

### Font Weights
- **Light**: 300
- **Regular**: 400
- **Medium**: 500
- **Bold**: 700

## Component Library

### Buttons

#### Primary Button
```css
.btn-primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.btn-primary:hover {
  background-color: var(--primary-hover);
}
```

#### Secondary Button
```css
.btn-secondary {
  background-color: transparent;
  color: var(--primary-color);
  border: 2px solid var(--primary-color);
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background-color: var(--primary-color);
  color: white;
}
```

#### Button Sizes
- **Small**: `padding: 0.5rem 1rem; font-size: 0.875rem;`
- **Medium**: `padding: 0.75rem 1.5rem; font-size: 1rem;`
- **Large**: `padding: 1rem 2rem; font-size: 1.125rem;`

### Input Fields

#### Text Input
```css
.input-field {
  border: 2px solid var(--border-color);
  border-radius: 0.375rem;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  background-color: var(--background-primary);
}

.input-field:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}
```

#### Input States
- **Default**: Gray border
- **Focus**: Primary color border with light shadow
- **Error**: Red border with error message
- **Success**: Green border
- **Disabled**: Grayed out with reduced opacity

### Cards

#### Basic Card
```css
.card {
  background-color: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
```

#### Card Variants
- **Interactive**: Hover effects and clickable
- **Static**: No hover effects
- **Bordered**: Stronger border for emphasis
- **Elevated**: More pronounced shadow

## Layout System

### Grid System
```css
.grid {
  display: grid;
  gap: 1.5rem;
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
```

### Spacing Scale
```css
:root {
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 1rem;      /* 16px */
  --space-lg: 1.5rem;    /* 24px */
  --space-xl: 2rem;      /* 32px */
  --space-2xl: 3rem;     /* 48px */
  --space-3xl: 4rem;     /* 64px */
}
```

### Container Widths
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.container-sm { max-width: 640px; }
.container-md { max-width: 768px; }
.container-lg { max-width: 1024px; }
.container-xl { max-width: 1280px; }
```

## PDF Viewer and Annotation Tool

### Manual Annotation Tool Features

#### PDF Display
- **High DPI Support**: Crisp rendering on high-resolution displays
- **Zoom Controls**: 50% to 300% zoom range with keyboard shortcuts
- **Fullscreen Mode**: F11 toggle for maximum viewing area
- **Responsive Layout**: Adapts to different screen sizes
- **Boundary Constraints**: Prevents drawing outside PDF area

#### Annotation Controls
```css
/* Toolbar */
.annotation-toolbar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Tool Groups */
.tool-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 6px;
  background: #f1f5f9;
}

/* Tool Buttons */
.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background: #e2e8f0;
  color: #334155;
}

.tool-btn.active {
  background: #3b82f6;
  color: white;
}
```

#### Annotation Boxes
```css
/* Annotation Boxes */
.annotation-box {
  position: absolute;
  pointer-events: auto;
  transition: all 0.2s ease;
  border-radius: 2px;
  border: 2px solid;
  background-color: rgba(0, 0, 0, 0.1);
}

.annotation-box:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.annotation-box.selected {
  border-width: 3px;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

/* Box Labels */
.box-label {
  position: absolute;
  top: -20px;
  left: 0;
  background: var(--primary-color);
  color: white;
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
}
```

#### Zoom Controls
```css
/* Zoom Level Display */
.zoom-level {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  min-width: 40px;
  text-align: center;
  padding: 0 4px;
}

/* Coordinate Display */
.coordinate-display {
  font-size: 11px;
  font-weight: 500;
  color: #059669;
  font-family: 'Monaco', 'Menlo', monospace;
  padding: 0 8px;
  min-width: 80px;
}
```

#### Keyboard Shortcuts
- **Zoom In**: `+` or `=`
- **Zoom Out**: `-`
- **Reset Zoom**: `0`
- **Fullscreen**: `F11`
- **Previous Page**: `←`
- **Next Page**: `→`
- **Select Tool**: `V`
- **Draw Tool**: `B`
- **Delete Tool**: `D`
- **Undo**: `Ctrl+Z`
- **Redo**: `Ctrl+Y`
- **Save**: `Ctrl+S`
- **Escape**: Cancel current operation

#### Color Coding System
```css
:root {
  --color-table: #3B82F6;
  --color-graph: #10B981;
  --color-parameter: #F59E0B;
  --color-text: #8B5CF6;
  --color-figure: #EC4899;
  --color-header: #6B7280;
  --color-footer: #6B7280;
  --color-custom: #9CA3AF;
}
```

#### Debug Features
- **Canvas Size Display**: Shows current canvas dimensions
- **Mouse Coordinates**: Real-time coordinate tracking
- **Boundary Indicators**: Visual PDF boundary markers
- **Test Box**: Verification of positioning system

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

### Responsive Patterns
- **Mobile**: Single column layout, stacked elements
- **Tablet**: Two-column layout where appropriate
- **Desktop**: Multi-column layout, side-by-side content
- **Large Desktop**: Maximum content width, enhanced spacing

## User Experience Flow

### File Upload Flow
1. **Drag & Drop Zone**: Clear visual indication of drop area
2. **File Validation**: Real-time feedback on file type and size
3. **Processing State**: Progress indicator with status messages
4. **Results Display**: Clear presentation of extracted data
5. **Error Handling**: Helpful error messages with recovery options

### Parameter Management Flow
1. **Data Display**: Clean table format with sorting and filtering
2. **Editing**: Inline editing with validation
3. **Bulk Operations**: Select multiple items for batch actions
4. **Export Options**: Multiple format support (CSV, JSON, SPICE)

### SPICE Model Generation Flow
1. **Template Selection**: Choose appropriate model type
2. **Parameter Mapping**: Visual mapping of extracted parameters
3. **Validation**: Real-time validation of model parameters
4. **Preview**: Preview generated SPICE model
5. **Export**: Download in various formats

## Accessibility Standards

### WCAG 2.1 AA Compliance
- **Color Contrast**: Minimum 4.5:1 ratio for normal text
- **Focus Indicators**: Clear focus states for all interactive elements
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Text Scaling**: Support for 200% zoom without horizontal scrolling

### Accessibility Features
```css
/* Focus indicators */
.focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Interactive States

### Hover States
- **Buttons**: Color change and slight scale
- **Cards**: Enhanced shadow
- **Links**: Underline and color change
- **Inputs**: Border color change

### Active States
- **Buttons**: Darker color and scale down
- **Cards**: Reduced shadow
- **Inputs**: Focus ring

### Loading States
- **Spinners**: Consistent loading animation
- **Skeletons**: Placeholder content while loading
- **Progress Bars**: Clear progress indication

## Error Handling

### Error Messages
- **Clear and Concise**: Simple, actionable error messages
- **Contextual**: Show errors near the relevant field
- **Recovery Options**: Provide clear next steps
- **Consistent Styling**: Red color scheme for errors

### Success Messages
- **Positive Feedback**: Green color scheme for success
- **Auto-dismiss**: Automatically hide after 3-5 seconds
- **Clear Actions**: Indicate what happened and next steps

## Performance Considerations

### Loading Optimization
- **Lazy Loading**: Load components and data as needed
- **Skeleton Screens**: Show loading placeholders
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Image Optimization**: Compress and optimize images

### Animation Guidelines
- **Duration**: 200-300ms for micro-interactions
- **Easing**: Use `ease-out` for natural feel
- **Performance**: Use `transform` and `opacity` for smooth animations
- **Reduced Motion**: Respect user preferences

## Component Guidelines

### File Upload Component
- **Drag & Drop**: Visual feedback for drag states
- **File Validation**: Real-time validation with clear messages
- **Progress Indicator**: Show processing progress
- **Error Recovery**: Clear error messages with retry options

### Parameter Table Component
- **Sortable Columns**: Click headers to sort
- **Filtering**: Search and filter capabilities
- **Inline Editing**: Click to edit values
- **Bulk Actions**: Select multiple items for operations

### PDF Viewer Component
- **Page Navigation**: Clear page controls
- **Zoom Controls**: Zoom in/out functionality
- **Search**: Text search within PDF
- **Responsive**: Adapt to different screen sizes

### Graph Extraction Component
- **Color-Based Detection**: Advanced color detection for curve extraction
- **Axis Configuration**: User-configurable X and Y axis labels and ranges
- **Data Point Extraction**: Pixel-level analysis for accurate curve data
- **CSV Export**: Structured data export with customizable headers
- **Real-Time Overlays**: Visual feedback for detected graphs and curves

### Table Detection Component
- **Multi-Stage Detection**: Text content analysis, column alignment, parameter classification
- **Confidence Scoring**: Percentage confidence for each detection
- **Interactive Labels**: Hover tooltips with detection details
- **Parameter Classification**: Automatic identification of parameter-specific tables

## Design Tokens

### CSS Custom Properties
```css
:root {
  /* Colors */
  --primary-color: #00b388;
  --primary-hover: #009973;
  --primary-active: #008060;
  
  /* Typography */
  --font-family: 'Roboto', sans-serif;
  --font-size-base: 1rem;
  --line-height-base: 1.5;
  
  /* Spacing */
  --spacing-unit: 0.25rem;
  --spacing-xs: var(--spacing-unit);
  --spacing-sm: calc(var(--spacing-unit) * 2);
  --spacing-md: calc(var(--spacing-unit) * 4);
  --spacing-lg: calc(var(--spacing-unit) * 6);
  --spacing-xl: calc(var(--spacing-unit) * 8);
  
  /* Border Radius */
  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.375rem;
  --border-radius-lg: 0.5rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

## Implementation Notes

### CSS Organization
- **Component-Specific**: Each component has its own CSS file
- **Global Styles**: Shared styles in global CSS files
- **Design Tokens**: Centralized in theme.css
- **Responsive**: Mobile-first approach with progressive enhancement

### Best Practices
- **Consistent Naming**: Use BEM methodology for CSS classes
- **Modular Components**: Self-contained components with clear interfaces
- **Performance**: Optimize for rendering performance
- **Maintainability**: Clear structure and documentation
- **Testing**: Visual regression testing for UI components 

## Light Mode Palette Optimization (2024)

### Rationale
To reduce eye strain and improve user-friendliness, the light mode palette now uses soft off-white backgrounds and dark gray text, avoiding harsh pure white/black contrast. Accent and card backgrounds are subtly differentiated for visual comfort. All colors maintain accessibility standards.

### Updated Color Variables
- `--background`: `220 20% 98%` (soft off-white)
- `--foreground`: `240 10% 10%` (dark gray)
- `--card`: `0 0% 99%` (off-white)
- `--card-foreground`: `240 10% 10%`
- `--popover`: `0 0% 98%` (off-white)
- `--popover-foreground`: `240 10% 10%`
- `--primary`: `142.1 60% 38%` (muted green)
- `--primary-foreground`: `355.7 100% 97.3%`
- `--secondary`: `220 16% 94%` (soft light gray)
- `--secondary-foreground`: `240 5.9% 15%`
- `--muted`: `220 16% 94%`
- `--muted-foreground`: `240 3.8% 46.1%`
- `--accent`: `220 16% 92%` (soft accent background)
- `--accent-foreground`: `240 5.9% 15%`
- `--destructive`: `0 70% 60%`
- `--destructive-foreground`: `0 0% 98%`
- `--border`: `220 13% 90%`
- `--input`: `220 13% 90%`
- `--ring`: `142.1 60% 38%`

### Accessibility
All color pairs have been checked for sufficient contrast (WCAG AA or better). The palette is designed for long-term use and visual comfort.

### Implementation Notes
- All changes are variable-driven and propagate throughout the UI.
- Status indicators and feedback colors remain soft and readable.
- See `src/index.css` for the full variable definitions. 