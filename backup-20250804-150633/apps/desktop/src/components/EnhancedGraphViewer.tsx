import React, { useMemo } from 'react';
import { CurveData, GraphConfig } from '../types';
import '../styles/enhanced-graph-viewer.css';

interface EnhancedGraphViewerProps {
  curves: CurveData[];
  config: GraphConfig;
  title?: string;
  width?: number;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showAxisLabels?: boolean;
  showTitle?: boolean;
}

const EnhancedGraphViewer: React.FC<EnhancedGraphViewerProps> = ({
  curves,
  config,
  title = "Extracted Graph Data",
  width = 800,
  height = 600,
  showGrid = true,
  showLegend = true,
  showAxisLabels = true,
  showTitle = true,
}) => {
  // Debug logging for component props
  console.log('=== EnhancedGraphViewer Debug ===');
  console.log('Curves received:', curves);
  console.log('Config received:', config);
  console.log('Width:', width, 'Height:', height);
  console.log('Curves count:', curves?.length || 0);
  
  if (curves && curves.length > 0) {
    curves.forEach((curve, index) => {
      console.log(`Curve ${index}:`, {
        name: curve.name,
        color: curve.color,
        pointsCount: curve.points.length,
        firstPoint: curve.points[0],
        lastPoint: curve.points[curve.points.length - 1]
      });
    });
  }

  const margin = 80; // Define margin at component level
  const graphData = useMemo(() => {
    if (!curves || curves.length === 0) return null;

    // Use the original config bounds (like legacy code does)
    const minX = config.x_min * config.x_scale;
    const maxX = config.x_max * config.x_scale;
    const minY = 0; // Always start Y-axis at 0
    const maxY = config.y_max * config.y_scale;

    // Add small padding for better visualization
    const xPadding = (maxX - minX) * 0.02;
    const yPadding = maxY * 0.02;
    
    const finalMinX = Math.max(0, minX - xPadding);
    const finalMaxX = maxX + xPadding;
    const finalMinY = 0; // Always 0
    const finalMaxY = maxY + yPadding;

    // Debug logging
    console.log('=== Graph Bounds Debug ===');
    console.log('Config bounds:', { x_min: config.x_min, x_max: config.x_max, y_min: config.y_min, y_max: config.y_max });
    console.log('Scale factors:', { x_scale: config.x_scale, y_scale: config.y_scale });
    console.log('Scaled bounds:', { minX, maxX, minY, maxY });
    console.log('Final bounds:', { finalMinX, finalMaxX, finalMinY, finalMaxY });

    return {
      minX: finalMinX,
      maxX: finalMaxX,
      minY: finalMinY,
      maxY: finalMaxY,
      xRange: finalMaxX - finalMinX,
      yRange: finalMaxY - finalMinY,
    };
  }, [curves, config]);

  // Helper function to calculate uniform intervals
  const calculateInterval = (range: number) => {
    if (range <= 5) return 0.5;
    if (range <= 10) return 1;
    if (range <= 25) return 2.5;
    if (range <= 50) return 5;
    if (range <= 100) return 10;
    if (range <= 250) return 25;
    if (range <= 500) return 50;
    return Math.ceil(range / 10);
  };

  const transformPoint = (x: number, y: number) => {
    if (!graphData) return { x: 0, y: 0 };

    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;

    // Transform coordinates using config bounds (like legacy code)
    const transformedX = margin + ((x - graphData.minX) / graphData.xRange) * plotWidth;
    const transformedY = height - margin - ((y - graphData.minY) / graphData.yRange) * plotHeight;

    return { x: transformedX, y: transformedY };
  };

  const generateGridLines = () => {
    if (!showGrid || !graphData) return null;

    const gridLines = [];
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;

    // Calculate uniform intervals
    const xInterval = calculateInterval(graphData.xRange);
    const yInterval = calculateInterval(graphData.yRange);

    // X-axis grid lines with uniform intervals
    const xSteps = Math.ceil(graphData.xRange / xInterval);
    for (let i = 0; i <= xSteps; i++) {
      const x = graphData.minX + (xInterval * i);
      if (x > graphData.maxX) break;
      
      const transformedX = margin + ((x - graphData.minX) / graphData.xRange) * plotWidth;
      
      gridLines.push(
        <line
          key={`x-grid-${i}`}
          x1={transformedX}
          y1={margin}
          x2={transformedX}
          y2={height - margin}
          stroke="hsl(var(--foreground))"
          strokeWidth="1"
          opacity="0.6"
        />
      );

      // X-axis labels - show all labels
      if (showAxisLabels) {
        gridLines.push(
          <text
            key={`x-label-${i}`}
            x={transformedX}
            y={height - margin + 25}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            fontSize="11"
            fontFamily="Inter, sans-serif"
            fontWeight="500"
          >
            {x.toFixed(1)}
          </text>
        );
      }
    }

    // Y-axis grid lines with uniform intervals
    const ySteps = Math.ceil(graphData.yRange / yInterval);
    for (let i = 0; i <= ySteps; i++) {
      const y = graphData.minY + (yInterval * i);
      if (y > graphData.maxY) break;
      
      const transformedY = height - margin - ((y - graphData.minY) / graphData.yRange) * plotHeight;
      
      gridLines.push(
        <line
          key={`y-grid-${i}`}
          x1={margin}
          y1={transformedY}
          x2={width - margin}
          y2={transformedY}
          stroke="hsl(var(--foreground))"
          strokeWidth="1"
          opacity="0.6"
        />
      );

      // Y-axis labels - show all labels
      if (showAxisLabels) {
        gridLines.push(
          <text
            key={`y-label-${i}`}
            x={margin - 15}
            y={transformedY + 4}
            textAnchor="end"
            fill="hsl(var(--foreground))"
            fontSize="11"
            fontFamily="Inter, sans-serif"
            dominantBaseline="middle"
            fontWeight="500"
          >
            {y.toFixed(1)}
          </text>
        );
      }
    }

    // Add X-axis line at Y=0 (the dark line that should be the X-axis)
    const xAxisY = height - margin - ((0 - graphData.minY) / graphData.yRange) * plotHeight;
    gridLines.push(
      <line
        key="x-axis-line"
        x1={margin}
        y1={xAxisY}
        x2={width - margin}
        y2={xAxisY}
        stroke="hsl(var(--foreground))"
        strokeWidth="2"
        opacity="0.9"
      />
    );

    return gridLines;
  };

  const generateCurvePaths = () => {
    if (!curves || curves.length === 0) return null;

    // Define fallback colors for curves without colors
    const fallbackColors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FFEAA7', // Yellow
      '#DDA0DD', // Plum
      '#98D8C8', // Mint
      '#F7DC6F', // Gold
      '#BB8FCE', // Purple
      '#85C1E9'  // Light Blue
    ];

    return curves.map((curve, curveIndex) => {
      if (curve.points.length < 2) return null;

      // Use curve color or fallback color
      const curveColor = curve.color && curve.color.trim() !== '' 
        ? curve.color 
        : fallbackColors[curveIndex % fallbackColors.length];

      // Enhanced debug logging
      console.log(`=== Curve ${curveIndex} Debug ===`);
      console.log(`Name: ${curve.name}`);
      console.log(`Original color: "${curve.color}"`);
      console.log(`Final color: "${curveColor}"`);
      console.log(`Color type: ${typeof curveColor}`);
      console.log(`Color length: ${curveColor.length}`);
      console.log(`Points count: ${curve.points.length}`);

      // Sort points by x coordinate
      const sortedPoints = [...curve.points].sort((a, b) => a.x - b.x);
      
      // Generate smooth path using quadratic curves
      let pathData = '';
      sortedPoints.forEach((point, index) => {
        const transformed = transformPoint(point.x, point.y);
        if (index === 0) {
          pathData += `M ${transformed.x} ${transformed.y}`;
        } else if (index === 1) {
          pathData += ` L ${transformed.x} ${transformed.y}`;
        } else {
          // Use quadratic curves for smoother lines
          const prevPoint = transformPoint(sortedPoints[index - 1].x, sortedPoints[index - 1].y);
          const controlX = (prevPoint.x + transformed.x) / 2;
          pathData += ` Q ${controlX} ${prevPoint.y} ${transformed.x} ${transformed.y}`;
        }
      });

      return (
        <g key={`curve-${curveIndex}`}>
          {/* Smooth curve line */}
          <path
            d={pathData}
            stroke={curveColor}
            strokeWidth="3"
            fill="none"
            opacity="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Add data points with better visibility */}
          {sortedPoints.map((point, pointIndex) => {
            const transformed = transformPoint(point.x, point.y);
            return (
              <g key={`point-${curveIndex}-${pointIndex}`}>
                {/* Clean data point without borders */}
                <circle
                  cx={transformed.x}
                  cy={transformed.y}
                  r="3"
                  fill={curveColor}
                  stroke="none"
                  opacity="1"
                />
              </g>
            );
          })}
        </g>
      );
    });
  };

  const generateLegend = () => {
    if (!showLegend || !curves || curves.length === 0) return null;

    // Define fallback colors for curves without colors
    const fallbackColors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FFEAA7', // Yellow
      '#DDA0DD', // Plum
      '#98D8C8', // Mint
      '#F7DC6F', // Gold
      '#BB8FCE', // Purple
      '#85C1E9'  // Light Blue
    ];

    const legendItems = curves.map((curve, index) => {
      const legendY = 40 + index * 25;
      
      // Use curve color or fallback color
      const curveColor = curve.color && curve.color.trim() !== '' 
        ? curve.color 
        : fallbackColors[index % fallbackColors.length];
      
      return (
        <g key={`legend-${index}`}>
          <line
            x1={width - 200}
            y1={legendY}
            x2={width - 180}
            y2={legendY}
            stroke={curveColor}
            strokeWidth="3"
          />
          <text
            x={width - 170}
            y={legendY + 4}
            fill="hsl(var(--foreground))"
            fontSize="12"
            fontFamily="Inter, sans-serif"
            fontWeight="500"
          >
            {curve.name}
          </text>
        </g>
      );
    });

    return (
      <g>
        <rect
          x={width - 210}
          y={20}
          width={190}
          height={curves.length * 25 + 20}
          fill="hsl(var(--background))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          rx="4"
          opacity="0.95"
        />
        {legendItems}
      </g>
    );
  };

  const generateAxisLabels = () => {
    if (!showAxisLabels || !graphData) return null;

    return (
      <g>
        {/* X-axis label */}
        <text
          x={width / 2}
          y={height - 20}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          fontSize="14"
          fontFamily="Inter, sans-serif"
          fontWeight="500"
        >
          {config.x_axis_name || 'X-Axis'}
        </text>

        {/* Y-axis label */}
        <text
          x={20}
          y={height / 2}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          fontSize="14"
          fontFamily="Inter, sans-serif"
          fontWeight="500"
          transform={`rotate(-90, 20, ${height / 2})`}
        >
          {config.y_axis_name || 'Y-Axis'}
        </text>

        {/* Axis values */}
        <text
          x={margin - 10}
          y={height - margin + 20}
          textAnchor="end"
          fill="hsl(var(--muted-foreground))"
          fontSize="12"
          fontFamily="Inter, sans-serif"
        >
          {graphData.minX.toFixed(1)}
        </text>
        <text
          x={width - margin + 10}
          y={height - margin + 20}
          textAnchor="start"
          fill="hsl(var(--muted-foreground))"
          fontSize="12"
          fontFamily="Inter, sans-serif"
        >
          {graphData.maxX.toFixed(1)}
        </text>
        <text
          x={margin - 10}
          y={height - margin + 4}
          textAnchor="end"
          fill="hsl(var(--muted-foreground))"
          fontSize="12"
          fontFamily="Inter, sans-serif"
        >
          {graphData.minY.toFixed(1)}
        </text>
        <text
          x={margin - 10}
          y={margin - 4}
          textAnchor="end"
          fill="hsl(var(--muted-foreground))"
          fontSize="12"
          fontFamily="Inter, sans-serif"
        >
          {graphData.maxY.toFixed(1)}
        </text>
      </g>
    );
  };

  if (!graphData) {
    return (
      <div className="enhanced-graph-viewer empty">
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M3 3v18h18" stroke="hsl(var(--muted-foreground))" strokeWidth="2" fill="none"/>
            <path d="M7 17l3-3 3 3 4-4" stroke="hsl(var(--muted-foreground))" strokeWidth="2" fill="none"/>
          </svg>
          <p>No data available for visualization</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-graph-viewer" style={{ width: width, height: height }}>
      {/* Only show title if explicitly requested */}
      {showTitle && title && (
        <div className="graph-title">
          <h3>{title}</h3>
        </div>
      )}
      
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="grid-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--muted) / 0.1)"/>
            <stop offset="100%" stopColor="hsl(var(--muted) / 0.05)"/>
          </linearGradient>
        </defs>
        
        {/* Background */}
        <rect width="100%" height="100%" fill="hsl(var(--background))" />
        
        {/* Grid lines */}
        {generateGridLines()}
        
        {/* Axes */}
        <line
          x1={margin}
          y1={height - margin}
          x2={width - margin}
          y2={height - margin}
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
        />
        <line
          x1={margin}
          y1={margin}
          x2={margin}
          y2={height - margin}
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
        />
        
        {/* Curves */}
        {generateCurvePaths()}
        
        {/* Axis labels */}
        {showAxisLabels && generateAxisLabels()}
        
        {/* Legend */}
        {showLegend && generateLegend()}
      </svg>
    </div>
  );
};

export default EnhancedGraphViewer; 