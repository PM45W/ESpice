# Frontend Development Rules - ESpice

## Overview
This document establishes specific rules and guidelines for frontend development in the ESpice project, complementing the main project rules.

## Technology Stack
- **Framework**: React 18.3.1 with TypeScript 5.6.2
- **Build Tool**: Vite 6.0.3
- **State Management**: React hooks and context (future: Zustand/Redux)
- **Styling**: CSS modules with design system tokens
- **UI Components**: Lucide React icons, Recharts for data visualization
- **File Processing**: react-dropzone, PDF.js, Tesseract.js

## Core Principles

### 1. TypeScript Strict Mode
- **Always use strict TypeScript configuration**
- **No `any` types without explicit justification**
- **Proper type definitions for all props, state, and API responses**
- **Use discriminated unions for complex state management**

### 2. Component Architecture
- **Functional components with hooks only**
- **Custom hooks for reusable logic**
- **Error boundaries for component error handling**
- **Memoization for expensive computations**

### 3. State Management
- **Local state with useState for component-specific data**
- **useContext for shared state across components**
- **Custom hooks for complex state logic**
- **Avoid prop drilling - use context or state management**

### 4. Performance Optimization
- **React.memo for expensive components**
- **useMemo for expensive calculations**
- **useCallback for function props**
- **Lazy loading for large components**
- **Bundle size monitoring**

## File Organization

### Component Structure
```
src/components/
├── __tests__/           # Component unit tests
├── ui/                  # Basic UI components (Button, Input, etc.)
├── forms/               # Form-related components
├── data/                # Data display components (tables, charts)
├── layout/              # Layout components
└── features/            # Feature-specific components
```

### Service Layer
```
src/services/
├── api/                 # API communication services
├── processing/          # Data processing services
├── storage/             # Database and storage services
└── utils/               # Utility services
```

## Development Guidelines

### 1. Component Development
```typescript
// ✅ Good: Proper TypeScript interfaces
interface ComponentProps {
  data: DataType;
  onAction: (id: string) => void;
  isLoading?: boolean;
}

// ✅ Good: Functional component with proper typing
const MyComponent: React.FC<ComponentProps> = ({ 
  data, 
  onAction, 
  isLoading = false 
}) => {
  // Component logic
};
```

### 2. Custom Hooks
```typescript
// ✅ Good: Custom hook with proper typing
export const useDataProcessing = (data: DataType) => {
  const [result, setResult] = useState<ProcessedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Hook logic
  
  return { result, isLoading, processData };
};
```

### 3. Error Handling
```typescript
// ✅ Good: Proper error boundaries
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component error:', error, errorInfo);
  }
}
```

## Tauri Integration

### 1. Command Invocation
```typescript
// ✅ Good: Proper Tauri command invocation
import { invoke } from '@tauri-apps/api/core';

const processImage = async (imageData: Uint8Array) => {
  try {
    const result = await invoke('extract_image_curves', {
      imageData: Array.from(imageData),
      selectedColors: ['red', 'blue'],
      config: { threshold: 0.5 }
    });
    return result;
  } catch (error) {
    console.error('Tauri command failed:', error);
    throw new Error('Image processing failed');
  }
};
```

### 2. Type Safety for Tauri Commands
```typescript
// ✅ Good: Type definitions for Tauri commands
interface TauriCommands {
  'extract_image_curves': {
    input: {
      imageData: number[];
      selectedColors: string[];
      config: GraphConfig;
    };
    output: ExtractionResult;
  };
  'detect_image_colors': {
    input: { imageData: number[] };
    output: DetectedColor[];
  };
}
```

## Styling Guidelines

### 1. CSS Organization
- **Use CSS modules for component-specific styles**
- **Design system tokens for consistent theming**
- **Responsive design with mobile-first approach**
- **Accessibility compliance (WCAG 2.1)**

### 2. Theme System
```css
/* ✅ Good: CSS custom properties for theming */
:root {
  --primary-color: #00b388;
  --secondary-color: #f5f5f5;
  --text-color: #333;
  --border-radius: 4px;
  --spacing-unit: 8px;
}
```

## Testing Guidelines

### 1. Unit Testing
- **Jest + React Testing Library for component tests**
- **Test user interactions, not implementation details**
- **Mock Tauri commands for isolated testing**
- **Test error states and edge cases**

### 2. Integration Testing
- **Test component integration with Tauri backend**
- **Test data flow between components**
- **Test error handling across the stack**

## Performance Guidelines

### 1. Bundle Optimization
- **Code splitting for large components**
- **Tree shaking for unused imports**
- **Lazy loading for routes**
- **Optimize images and assets**

### 2. Runtime Performance
- **Avoid unnecessary re-renders**
- **Use React DevTools Profiler**
- **Monitor memory usage**
- **Optimize expensive operations**

## Security Guidelines

### 1. Input Validation
- **Validate all user inputs**
- **Sanitize data before processing**
- **Use TypeScript for compile-time validation**

### 2. Tauri Security
- **Follow Tauri security best practices**
- **Validate data before sending to Rust backend**
- **Handle sensitive data appropriately**

## Debugging Guidelines

### 1. Development Tools
- **React DevTools for component debugging**
- **Browser DevTools for performance analysis**
- **TypeScript compiler for type checking**
- **ESLint for code quality**

### 2. Error Tracking
- **Comprehensive error logging**
- **User-friendly error messages**
- **Error boundary implementation**
- **Performance monitoring**

## Code Quality Standards

### 1. ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "react-hooks/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "react-hooks/exhaustive-deps": "error"
  }
}
```

### 2. Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## Integration with Main Rules

### 1. Documentation Compliance
- **Follow main project documentation structure**
- **Update frontend-specific documentation**
- **Maintain consistency with backend rules**

### 2. Workflow Integration
- **Follow main project workflow**
- **Use frontend-specific tools and processes**
- **Coordinate with backend development**

## Future Considerations

### 1. State Management Evolution
- **Consider Zustand for complex state**
- **Implement proper caching strategies**
- **Add offline support capabilities**

### 2. Performance Monitoring
- **Implement real-time performance monitoring**
- **Add bundle size tracking**
- **Monitor user experience metrics**

### 3. Testing Evolution
- **Add E2E testing with Playwright**
- **Implement visual regression testing**
- **Add performance testing**

## References
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tauri Frontend Integration](https://tauri.app/docs/frontend/)
- [Vite Documentation](https://vitejs.dev/) 