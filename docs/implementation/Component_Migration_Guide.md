# Component Migration Guide

This guide outlines the process for migrating components from local implementations to the shared `@espice/ui` package.

## Migration Status

### ✅ Completed Migrations
- **Button**: Migrated to `@espice/ui` in some files
- **Input**: Available in `@espice/ui`
- **Label**: Available in `@espice/ui`
- **LoadingSpinner**: Available in `@espice/ui`

### 🔄 In Progress
- **Button**: Some files still using local components
- **Input**: Some files still using local components

### ⏳ Pending
- **Card**: Need to add to `@espice/ui`
- **Modal**: Need to add to `@espice/ui`
- **Progress**: Need to add to `@espice/ui`
- **Badge**: Need to add to `@espice/ui`
- **Separator**: Need to add to `@espice/ui`
- **Tabs**: Need to add to `@espice/ui`
- **Switch**: Need to add to `@espice/ui`
- **Textarea**: Need to add to `@espice/ui`

## Migration Steps

### 1. Update Import Statements

**Before:**
```tsx
import { Button } from './ui/button';
import { Button } from '../components/ui/button';
import Button from './Button';
```

**After:**
```tsx
import { Button } from '@espice/ui';
```

### 2. Update Package Dependencies

Add `@espice/ui` to the application's package.json:

```json
{
  "dependencies": {
    "@espice/ui": "^1.0.0"
  }
}
```

### 3. Remove Local Component Files

After migration, remove the local component files:
- `apps/desktop/src/components/ui/button.tsx`
- `apps/desktop/src/components/ui/input.tsx`
- `apps/desktop/src/components/Button.tsx`
- `apps/desktop/src/components/Input.tsx`

### 4. Update TypeScript Configuration

Ensure the application can resolve the `@espice/ui` package by updating tsconfig.json:

```json
{
  "compilerOptions": {
    "paths": {
      "@espice/ui": ["../../packages/ui/src"]
    }
  }
}
```

## Files Requiring Migration

### Desktop App (`apps/desktop/src/`)

#### Pages
- `pages/ASMExtractionPage.tsx` - ✅ Already using `@espice/ui`
- `pages/UploadPage.tsx` - ✅ Already using `@espice/ui`
- `pages/SPICEGenerationPage.tsx` - ✅ Already using `@espice/ui`
- `pages/WebScrapingPage.tsx` - ✅ Already using `@espice/ui`
- `pages/EnhancedWebScrapingPage.tsx` - 🔄 Needs migration
- `pages/SiliconValidationPage.tsx` - 🔄 Needs migration
- `pages/SPICEExtractionIntegrationPage.tsx` - 🔄 Needs migration
- `pages/PDKCompatibilityPage.tsx` - 🔄 Needs migration

#### Components
- `components/Layout.tsx` - 🔄 Needs migration
- `components/FileUpload.tsx` - 🔄 Needs migration
- `components/PDFViewer.tsx` - 🔄 Needs migration
- `components/ErrorBoundary.tsx` - 🔄 Needs migration
- `components/ParameterTable.tsx` - 🔄 Needs migration
- `components/RealTimeExtractionViewer.tsx` - 🔄 Needs migration
- `components/DatasheetUploadModal.tsx` - 🔄 Needs migration
- `components/EnhancedPdfViewer.tsx` - 🔄 Needs migration
- `components/ProductDataUploadModal.tsx` - 🔄 Needs migration
- `components/ASMDataInputForm.tsx` - 🔄 Needs migration
- `components/ASMSpiceExtractionPanel.tsx` - 🔄 Needs migration
- `components/AnimatedPDFViewer.tsx` - 🔄 Needs migration
- `components/TauriContextWarning.tsx` - 🔄 Needs migration
- `components/MCPModelGenerationModal.tsx` - 🔄 Needs migration
- `components/ModelGenerationModal.tsx` - 🔄 Needs migration
- `components/TestDataUpload.tsx` - 🔄 Needs migration

## Migration Script

Use the following script to automate the migration:

```bash
# Find all files using local Button components
find apps/desktop/src -name "*.tsx" -exec grep -l "from.*button" {} \;

# Replace imports (example)
sed -i 's/from.*ui\/button/from "@espice\/ui"/g' apps/desktop/src/**/*.tsx
```

## Testing After Migration

1. **Build Test**: Ensure the application builds without errors
2. **Runtime Test**: Check that components render correctly
3. **Functionality Test**: Verify that component interactions work
4. **Style Test**: Confirm that styling is consistent

## Rollback Plan

If issues arise during migration:

1. Revert import statements to local components
2. Restore local component files from git history
3. Remove `@espice/ui` dependency
4. Test application functionality

## Next Steps

1. **Complete Button Migration**: Migrate remaining Button imports
2. **Add Missing Components**: Add Card, Modal, Progress, etc. to `@espice/ui`
3. **Migrate Other Components**: Update Input, Label, and other component imports
4. **Remove Local Files**: Clean up local component implementations
5. **Update Documentation**: Update component usage documentation 