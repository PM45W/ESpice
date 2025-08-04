# ESpice Project Structure

## Root Directory Structure

```
ESpice/
├── src/                          # Frontend React application
│   ├── components/               # Reusable UI components
│   ├── pages/                    # Page-level components
│   ├── services/                 # Business logic and API services
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── hooks/                    # Custom React hooks
│   ├── store/                    # State management (future)
│   ├── styles/                   # CSS stylesheets
│   └── assets/                   # Static assets
├── src-tauri/                    # Rust backend (Tauri)
│   ├── src/                      # Rust source code
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── docs/                         # Project documentation
├── public/                       # Public static files
├── examples/                     # Example files and test data
├── backend/                      # Legacy backend (if any)
├── tasks/                        # Development tasks and todos
├── .cursor/                      # Cursor IDE configuration
├── .vscode/                      # VS Code configuration
├── dist/                         # Build output
├── node_modules/                 # Node.js dependencies
└── Configuration files
```

## Detailed Structure

### Frontend (`src/`)

#### Components (`src/components/`)
```
components/
├── __tests__/                    # Component unit tests
├── Button.tsx                    # Reusable button component
├── DebugInfo.tsx                 # Debug information display
├── ErrorBoundary.tsx             # Error boundary wrapper
├── FileUpload.tsx                # File upload with drag-drop
├── Input.tsx                     # Reusable input component
├── Layout.tsx                    # Main application layout
├── ModelGenerationModal.tsx      # SPICE model generation modal
├── ParameterTable.tsx            # Parameter display and editing
├── PDFViewer.tsx                 # PDF viewing component
├── TauriContextWarning.tsx       # Tauri context warnings
└── ThemeToggle.tsx               # Theme switching component
```

#### Pages (`src/pages/`)
```
pages/
├── DocumentsPage.tsx             # Document management page
├── GraphExtractionPage.tsx       # Graph/curve extraction page
├── ModelsPage.tsx                # SPICE models page
├── SettingsPage.tsx              # Application settings
└── UploadPage.tsx                # File upload page
```

#### Services (`src/services/`)
```
services/
├── curveExtractionService.ts     # Curve extraction logic
├── database.ts                   # Database operations
├── pdfProcessor.ts               # PDF processing service
├── spiceGenerator.ts             # SPICE model generation
└── spiceTemplates.ts             # SPICE model templates
```

#### Types (`src/types/`)
```
types/
├── index.ts                      # Main type definitions
└── pdf.ts                        # PDF-specific types
```

#### Styles (`src/styles/`)
```
styles/
├── buttons.css                   # Button component styles
├── documents.css                 # Document page styles
├── error.css                     # Error component styles
├── graph-extraction.css          # Graph extraction styles
├── inputs.css                    # Input component styles
├── layout.css                    # Layout component styles
├── pages.css                     # Page-level styles
├── parameter-table.css           # Parameter table styles
├── pdf-viewer.css                # PDF viewer styles
├── spice-models.css              # SPICE model styles
├── theme.css                     # Theme and color variables
└── upload.css                    # Upload component styles
```

### Backend (`src-tauri/`)

#### Rust Source (`src-tauri/src/`)
```
src/
├── curve_extraction.rs           # Image processing and curve extraction
├── lib.rs                        # Library entry point
└── main.rs                       # Application entry point
```

#### Configuration (`src-tauri/`)
```
├── Cargo.toml                    # Rust dependencies and build config
├── tauri.conf.json               # Tauri application configuration
├── capabilities/                 # Tauri security capabilities
├── icons/                        # Application icons
└── target/                       # Build artifacts
```

### Documentation (`docs/`)

#### Core Documentation
```
docs/
├── Implementation.md             # Main implementation plan
├── project_structure.md          # This file - project structure
├── UI_UX_doc.md                  # UI/UX design guidelines
├── Bug_tracking.md               # Bug tracking and fixes
├── debugging-guide.md            # Advanced debugging procedures
└── workflow-status.md            # Current development workflow tracking
```

#### Domain Knowledge
```
docs/
├── domain/                       # Domain-specific knowledge
│   ├── semiconductor-basics.md   # Semiconductor fundamentals
│   ├── asm/                      # ASM model documentation
│   └── mvsg/                     # MVSG model documentation
```

#### Architecture & Context
```
docs/
├── architecture/                 # System architecture
│   └── overview.md               # Architecture overview
├── context/                      # Development context
│   ├── development-context.md    # Development guidelines
│   ├── mcp_datasheet.md          # MCP datasheet context
│   ├── reference-adpatation.md   # Reference adaptation
│   └── prompt/                   # AI prompt templates
```

#### Implementation Details
```
docs/
├── implementation/               # Implementation details
│   └── data-extraction-system.md # Data extraction system
└── bug-fixes/                   # Bug fix documentation
    └── pdf-worker-fix.md         # PDF worker fix details
```

### Public Assets (`public/`)
```
public/
├── pdf.worker.min.js             # PDF.js worker file
├── tauri.svg                     # Tauri logo
└── vite.svg                      # Vite logo
```

### Examples (`examples/`)
```
examples/
├── curve_data.db                 # Example curve data
├── curve_extract_gui_fixed.py    # Fixed curve extraction example
├── curve_extract_gui_legacy.py   # Legacy curve extraction
├── curve_extractor.py            # Python curve extractor
├── curve_output/                 # Example output files
├── pdf_extractor.py              # Python PDF extractor
├── README.md                     # Examples documentation
└── BUGFIX_REPORT.md              # Bug fix report
```

### Configuration Files

#### Root Level
```
├── package.json                  # Node.js dependencies and scripts
├── package-lock.json             # Locked dependency versions
├── tsconfig.json                 # TypeScript configuration
├── tsconfig.node.json            # Node.js TypeScript config
├── vite.config.ts                # Vite build configuration
├── index.html                    # HTML entry point
├── .gitignore                    # Git ignore patterns
├── README.md                     # Project overview
├── SETUP.md                      # Setup instructions
├── PRD.md                        # Product requirements
├── UI_DEVELOPMENT_GUIDE.md       # UI development guide
└── tasks/todo.md                 # Development tasks
```

#### Development Scripts
```
├── check-status.ps1              # Check development status
├── kill-ports.ps1                # Kill development ports
└── test_servers.ps1              # Test server scripts
```

## File Organization Patterns

### Component Structure
- **Functional Components**: Use React hooks and TypeScript
- **Props Interface**: Define clear prop interfaces for each component
- **Error Boundaries**: Wrap components that may fail
- **CSS Modules**: Use component-specific CSS files

### Service Layer
- **Singleton Pattern**: Use singleton pattern for services
- **Type Safety**: All service methods have proper TypeScript types
- **Error Handling**: Comprehensive error handling in all services
- **Async Operations**: Proper async/await patterns

### Type Definitions
- **Interface Naming**: Use PascalCase for interfaces (e.g., `PDFProcessingResult`)
- **Type Exports**: Export types from dedicated type files
- **Generic Types**: Use generics for reusable type patterns
- **Union Types**: Use union types for variant data structures

### Styling Approach
- **Component-Specific CSS**: Each component has its own CSS file
- **Design Tokens**: Use CSS custom properties for consistent theming
- **Responsive Design**: Mobile-first responsive design
- **Accessibility**: WCAG 2.1 compliance

## Build and Deployment Structure

### Development Build
```
npm run dev          # Start development server
npm run tauri:dev    # Start Tauri development
```

### Production Build
```
npm run build        # Build frontend
npm run tauri:build  # Build desktop application
```

### Build Output
```
dist/                # Frontend build output
src-tauri/target/    # Rust build artifacts
```

## Environment-Specific Configurations

### Development Environment
- **Hot Reload**: Enabled for both frontend and backend
- **Debug Mode**: Full debugging capabilities
- **Source Maps**: Enabled for debugging
- **Error Overlay**: React error overlay enabled

### Production Environment
- **Optimization**: Full optimization enabled
- **Minification**: Code minification
- **Tree Shaking**: Unused code elimination
- **Security**: Tauri security policies enforced

## Asset Organization

### Static Assets
- **Icons**: Application icons in multiple sizes
- **Images**: Static images and graphics
- **Fonts**: Custom fonts and typography
- **Worker Files**: Web workers for heavy processing

### Generated Assets
- **Build Artifacts**: Generated during build process
- **Cache Files**: Temporary cache files
- **Log Files**: Application logs and debugging

## Documentation Placement

### Code Documentation
- **JSDoc Comments**: Inline documentation for functions and classes
- **README Files**: Component and service documentation
- **Type Definitions**: Self-documenting TypeScript types

### Project Documentation
- **Implementation Plan**: High-level implementation strategy
- **Architecture Docs**: System design and structure
- **Domain Knowledge**: Semiconductor and SPICE model knowledge
- **Bug Tracking**: Known issues and solutions

## Security Considerations

### Tauri Security
- **Capabilities**: Configured in `src-tauri/capabilities/`
- **API Permissions**: Restricted API access
- **File System**: Limited file system access
- **Network**: Controlled network access

### Frontend Security
- **Input Validation**: All user inputs validated
- **XSS Prevention**: React's built-in XSS protection
- **CSRF Protection**: Not applicable for desktop app
- **Content Security Policy**: Configured for Tauri 