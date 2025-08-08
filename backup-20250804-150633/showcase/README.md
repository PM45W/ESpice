# ESpice Showcase

A modern, interactive showcase website for the ESpice platform, featuring an interactive architecture explorer and professional presentation of the SPICE model generation system.

## Features

- **Interactive Architecture Explorer**: Clickable nodes showing detailed component information
- **Professional Design**: Modern UI with smooth animations and transitions
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Data**: Live metrics and status information for each component
- **Category Filtering**: Filter components by category (Core, Production, Enterprise, etc.)
- **Component Details**: Detailed information panels with documentation and configuration examples

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion for smooth transitions
- **Graph Visualization**: ReactFlow for interactive architecture diagrams
- **Icons**: Lucide React for consistent iconography
- **Build Tool**: Vite for fast development and building
- **Syntax Highlighting**: React Syntax Highlighter for code examples

## Project Structure

```
showcase/
├── src/
│   ├── components/
│   │   ├── ArchitectureGraph.tsx    # Main architecture visualization
│   │   ├── CustomNode.tsx           # Custom node component for ReactFlow
│   │   └── ComponentDetails.tsx     # Sidebar for component details
│   ├── data/
│   │   └── architectureData.ts      # Architecture data and connections
│   ├── types/
│   │   └── index.ts                 # TypeScript type definitions
│   ├── App.tsx                      # Main application component
│   ├── main.tsx                     # React entry point
│   └── index.css                    # Global styles and Tailwind imports
├── public/
│   └── assets/                      # Static assets
├── package.json                     # Dependencies and scripts
├── vite.config.ts                   # Vite configuration
├── tailwind.config.js               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
└── index.html                       # HTML entry point
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   Navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Architecture Components

The showcase includes detailed information about all ESpice platform components:

### Core Services
- **Frontend**: React + Tauri desktop application
- **API Gateway**: Central request routing and orchestration
- **MCP Server**: AI agent orchestration and tool management
- **PDF Service**: PDF processing and text extraction
- **Image Service**: Image processing and curve extraction
- **Table Service**: Table detection and data extraction
- **SPICE Service**: SPICE model generation

### Infrastructure
- **Database**: SQLite + Redis storage layer
- **External APIs**: Foundry integration and validation

## Interactive Features

### Architecture Explorer
- **Clickable Nodes**: Click any component to see detailed information
- **Category Filtering**: Filter by Core, Production, Enterprise, Infrastructure, or Data
- **Real-time Metrics**: View live performance data for each component
- **Connection Visualization**: See data flow between components
- **Zoom and Pan**: Navigate the architecture diagram with mouse controls

### Component Details
- **Comprehensive Information**: Description, features, technologies, and documentation
- **Performance Metrics**: Real-time stats including RPS, response time, CPU, and memory usage
- **Configuration Examples**: YAML configuration snippets for each component
- **Dependencies**: Visual representation of component dependencies
- **Status Indicators**: Live status showing active, inactive, or maintenance states

## Design System

### Colors
- **Primary**: Green gradient (#00b388 to #16a34a)
- **Secondary**: Gray scale for text and backgrounds
- **Status Colors**: Green (active), Yellow (maintenance), Gray (inactive)

### Typography
- **Primary Font**: Inter for UI elements
- **Monospace**: JetBrains Mono for code and technical content

### Components
- **Cards**: Rounded corners with subtle shadows
- **Buttons**: Primary (filled) and secondary (outlined) variants
- **Nodes**: Custom ReactFlow nodes with status indicators
- **Panels**: Sliding sidebars with smooth animations

## Development

### Adding New Components

1. **Update types** in `src/types/index.ts`
2. **Add component data** in `src/data/architectureData.ts`
3. **Update node icons** in `src/components/CustomNode.tsx` if needed
4. **Test the visualization** in the architecture explorer

### Styling

The project uses Tailwind CSS with custom components defined in `src/index.css`. Key classes:

- `.btn-primary`: Primary button styling
- `.btn-secondary`: Secondary button styling
- `.card`: Card component styling
- `.gradient-text`: Gradient text effect

### Animations

Framer Motion is used for all animations. Key patterns:

- **Page Transitions**: Fade in/out between sections
- **Component Details**: Slide in from right
- **Node Interactions**: Scale and hover effects
- **Loading States**: Staggered animations for lists

## Deployment

### Static Hosting

The showcase can be deployed to any static hosting service:

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy the `dist/` folder** to your hosting service

### Docker Deployment

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the ESpice platform and follows the same licensing terms.

## Support

For questions or issues with the showcase:

1. Check the documentation in the component details
2. Review the architecture data for component information
3. Open an issue in the main ESpice repository

---

Built with ❤️ for the semiconductor engineering community 