# ESpice Web Application

A modern web application for extracting curves from semiconductor datasheet graphs using advanced image processing and AI techniques.

## Features

- **Graph Extraction**: Upload datasheet images and extract curves using OpenCV and advanced image processing
- **Color Detection**: Automatically detect colors in graphs for curve separation
- **FastAPI Integration**: Real-time curve extraction using FastAPI backend service
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Processing**: Live feedback during extraction process
- **Data Export**: Download extracted curves as CSV files

## Technology Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing
- **Radix UI** - Accessible UI primitives
- **Lucide React** - Beautiful icons

### Backend Integration
- **FastAPI** - High-performance Python web framework
- **OpenCV** - Computer vision library for image processing
- **NumPy** - Numerical computing library
- **Pillow** - Python Imaging Library

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (for the FastAPI backend)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ESpice/website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Start the FastAPI backend service**
   ```bash
   # In a separate terminal, from the ESpice root directory
   ./scripts/start-curve-extraction-service-web.ps1
   ```

5. **Open your browser**
   - Web app: http://localhost:3000
   - FastAPI docs: http://localhost:8002/docs

### Using PowerShell Scripts

The project includes convenient PowerShell scripts for easy setup:

```powershell
# Start the web app
./scripts/start-web-app.ps1

# Start the curve extraction service
./scripts/start-curve-extraction-service-web.ps1
```

## Project Structure

```
website/
├── src/
│   ├── components/
│   │   ├── ui/           # Reusable UI components
│   │   └── layout/       # Layout components (Header, Footer)
│   ├── pages/            # Page components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   ├── styles/           # Global styles
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── public/               # Static assets
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## API Integration

The web app communicates with the FastAPI backend service for curve extraction:

### Endpoints

- `GET /health` - Service health check
- `POST /api/curve-extraction/detect-colors` - Detect colors in uploaded image
- `POST /api/curve-extraction/extract-curves` - Extract curves from image

### Service Configuration

The FastAPI service runs on port 8002 and is configured in the `WebCurveExtractionService` class in `GraphExtractionPage.tsx`.

## Development

### Adding New Components

1. Create component in `src/components/ui/` for reusable components
2. Use TypeScript interfaces for props
3. Follow the existing naming conventions
4. Add proper JSDoc comments

### Styling

- Use Tailwind CSS classes for styling
- Follow the design system defined in `tailwind.config.js`
- Use CSS custom properties for theming
- Maintain responsive design principles

### State Management

- Use React hooks for local state
- Use React Context for global state
- Keep components focused and single-purpose

## Deployment

### Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Docker Deployment

The project includes a Dockerfile for containerized deployment:

```bash
docker build -t espice-web .
docker run -p 3000:3000 espice-web
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Troubleshooting

### Common Issues

1. **Port conflicts**: If port 3000 is in use, Vite will automatically use the next available port
2. **FastAPI service not available**: Ensure the backend service is running on port 8002
3. **CORS issues**: The FastAPI service is configured to allow requests from localhost:3000

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=true npm run dev
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Contact the development team 