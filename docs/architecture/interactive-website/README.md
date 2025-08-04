# ESpice Interactive Architecture Explorer

A modern, interactive web application for exploring the ESpice platform architecture with zoom, pan, hover animations, and detailed component documentation. Inspired by the MRDI (Hong Kong Microelectronics Research and Development Institute) design aesthetic.

## 🎯 Features

### **Interactive Architecture Graph**
- **Zoom & Pan**: Navigate through the architecture with smooth zoom and pan controls
- **Hover Animations**: Components animate and highlight on hover
- **Clickable Nodes**: Click any component to view detailed documentation
- **Category Filtering**: Filter components by category (Core, Production, Enterprise, Infrastructure, Data)
- **Real-time Stats**: Live platform statistics and metrics

### **Component Details Panel**
- **Comprehensive Documentation**: Detailed overview, API docs, configuration, and troubleshooting
- **Performance Metrics**: Real-time performance data for each component
- **Technology Stack**: Complete technology breakdown for each service
- **Dependency Mapping**: Visual representation of service dependencies

### **Workflow Simulation**
- **Animated Processing**: Watch a datasheet flow through the entire system
- **Step-by-step Visualization**: Real-time progress through each processing stage
- **Performance Tracking**: Monitor processing times and completion rates
- **Interactive Controls**: Start, stop, and reset simulation

### **Modern UI/UX**
- **MRDI-Inspired Design**: Clean, professional design inspired by Hong Kong Microelectronics Research and Development Institute
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Smooth Animations**: Framer Motion powered animations throughout
- **Accessibility**: WCAG compliant with keyboard navigation support

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ 
- npm or yarn

### **Installation**
```bash
# Navigate to the interactive website directory
cd docs/architecture/interactive-website

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:3001`

### **Build for Production**
```bash
# Build the application
npm run build

# Preview the build
npm run preview
```

## 🏗️ Architecture

### **Technology Stack**
- **Frontend**: React 18 + TypeScript
- **UI Framework**: Tailwind CSS
- **Animations**: Framer Motion
- **Graph Visualization**: React Flow
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Markdown**: React Markdown
- **Syntax Highlighting**: React Syntax Highlighter

### **Project Structure**
```
src/
├── components/
│   ├── ArchitectureGraph.tsx    # Main interactive graph
│   ├── CustomNode.tsx           # Custom node components
│   ├── CustomEdge.tsx           # Custom edge components
│   ├── ComponentDetails.tsx     # Component documentation panel
│   └── WorkflowSimulator.tsx    # Workflow simulation
├── data/
│   └── architectureData.ts      # Complete architecture data
├── types/
│   └── index.ts                 # TypeScript type definitions
├── App.tsx                      # Main application component
├── main.tsx                     # Application entry point
└── index.css                    # Global styles
```

## 🎨 Design System

### **Color Palette**
Inspired by MRDI's professional design:
- **Primary**: Blue gradient (#0ea5e9 to #0284c7)
- **Secondary**: Slate grays (#64748b to #334155)
- **Accent**: Orange (#f26b32)
- **Success**: Green (#22c55e)
- **Warning**: Amber (#f59e0b)
- **Error**: Red (#ef4444)

### **Typography**
- **Primary Font**: Inter (Google Fonts)
- **Monospace**: JetBrains Mono
- **Responsive**: Scales from 12px to 24px

### **Components**
- **Cards**: Soft shadows with rounded corners
- **Buttons**: Gradient backgrounds with hover effects
- **Panels**: Glass morphism with backdrop blur
- **Animations**: Smooth transitions and micro-interactions

## 🔧 Configuration

### **Customization**
The application is highly customizable through:

1. **Architecture Data**: Modify `src/data/architectureData.ts` to add/remove components
2. **Styling**: Update `tailwind.config.js` for theme customization
3. **Animations**: Adjust Framer Motion settings in components
4. **Layout**: Modify component positioning and sizing

### **Environment Variables**
```bash
# Development
VITE_API_URL=http://localhost:8000
VITE_ENVIRONMENT=development

# Production
VITE_API_URL=https://api.espice.com
VITE_ENVIRONMENT=production
```

## 📊 Data Structure

### **Component Data**
Each component includes:
- Basic info (name, type, port, description)
- Performance metrics (RPS, response time, error rate)
- Technology stack
- Dependencies
- Documentation (overview, API, config, troubleshooting)
- Visual properties (position, color, icon)

### **Connection Data**
Each connection includes:
- Source and target components
- Connection type (HTTP, database, cache, etc.)
- Status and labels
- Visual properties

## 🎯 Usage Guide

### **Exploring the Architecture**
1. **Zoom**: Use mouse wheel or zoom controls
2. **Pan**: Click and drag to move around
3. **Filter**: Use category filters to focus on specific areas
4. **Click**: Click any component for detailed information
5. **Hover**: Hover over components for quick preview

### **Component Details**
1. **Overview**: General description and features
2. **API**: REST API documentation and examples
3. **Configuration**: Setup and configuration guides
4. **Troubleshooting**: Common issues and solutions

### **Workflow Simulation**
1. **Start**: Click "Start Simulation" to begin
2. **Watch**: Observe the data flow through each step
3. **Monitor**: Track progress and performance metrics
4. **Reset**: Click "Reset" to start over

## 🔍 Features in Detail

### **Interactive Graph Features**
- **Smooth Zoom**: 0.1x to 2x zoom levels
- **Pan Navigation**: Drag to explore large architectures
- **Node Highlighting**: Visual feedback on hover and selection
- **Edge Animations**: Flowing animations for active connections
- **Category Filtering**: Show/hide component categories
- **Search**: Find components by name or type

### **Component Panel Features**
- **Tabbed Interface**: Organized documentation sections
- **Syntax Highlighting**: Code examples with proper formatting
- **Performance Charts**: Real-time metrics visualization
- **Dependency Tree**: Visual dependency relationships
- **Technology Tags**: Easy-to-scan technology stack
- **Status Indicators**: Real-time component status

### **Workflow Features**
- **Step-by-step Animation**: Visual progression through pipeline
- **Progress Tracking**: Real-time completion status
- **Performance Metrics**: Processing time and throughput
- **Error Handling**: Visual error states and recovery
- **Timeline View**: Chronological workflow visualization

## 🚀 Deployment

### **Static Hosting**
```bash
# Build the application
npm run build

# Deploy to any static hosting service
# - Netlify
# - Vercel
# - GitHub Pages
# - AWS S3
```

### **Docker Deployment**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "preview"]
```

## 🤝 Contributing

### **Development Setup**
```bash
# Clone the repository
git clone <repository-url>
cd espice/docs/architecture/interactive-website

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### **Code Style**
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks

## 📱 Browser Support

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 🔗 Related Documentation

- [ESpice Architecture Overview](../ESpice_Architecture_Diagram.md)
- [ESpice Presentation](../ESpice_Presentation.md)
- [VS Code Viewing Guide](../VSCODE_DIAGRAM_VIEWING_GUIDE.md)
- [Main ESpice Documentation](../../../README.md)

## 📄 License

This project is part of the ESpice platform and follows the same licensing terms.

---

**Built with ❤️ for the semiconductor industry, inspired by MRDI's commitment to excellence in microelectronics research and development.** 