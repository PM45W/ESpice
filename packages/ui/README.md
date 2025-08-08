# @espice/ui

Shared UI components for ESpice applications.

## Installation

```bash
npm install @espice/ui
```

## Usage

```tsx
import { Button, Input, Label, LoadingSpinner } from '@espice/ui'

function MyComponent() {
  return (
    <div>
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="Enter your email" />
      <Button>Submit</Button>
      <LoadingSpinner size="md" />
    </div>
  )
}
```

## Available Components

- Button, Input, Label, LoadingSpinner
- Dialog, Modal, Popover, DropdownMenu
- FileUpload, PDFViewer, GraphViewer
- ParameterTable, BatchProgress

## Development

```bash
npm run build
npm run dev
npm test
``` 