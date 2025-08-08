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
  const margin = 80;

  // Calculate proper axis bounds based on data and config
  const graphData = useMemo(() => {
    if (!curves || curves.length === 0) return null;

    // Collect all data points to determine actual bounds
    let allXValues: number[] = [];
    let allYValues: number[] = [];

    curves.forEach(curve => {
      curve.points.forEach(point => {
        allXValues.push(point.x);
        allYValues.push(point.y);
      });
    });

    // Use config bounds as primary, but ensure data fits
    const configMinX = config.x_min * config.x_scale;
    const configMaxX = config.x_max * config.x_scale;
    const configMinY = config.y_min * config.y_scale;
    const configMaxY = config.y_max * config.y_scale;

    // Calculate data bounds
    const dataMinX = Math.min(...allXValues);
    const dataMaxX = Math.max(...allXValues);
    const dataMinY = Math.min(...allYValues);
    const dataMaxY = Math.max(...allYValues);

    // Determine final bounds - use config bounds but ensure data is visible
    let finalMinX = Math.min(configMinX, dataMinX);
    let finalMaxX = Math.max(configMaxX, dataMaxX);
    let finalMinY = Math.min(configMinY, dataMinY);
    let finalMaxY = Math.max(configMaxY, dataMaxY);

    // Force axis intersection visibility based on graph type
    if (config.graph_type === 'output_characteristics' || 
        config.graph_type === 'output_characteristics_log' ||
        config.graph_type === 'transfer_characteristics' ||
        config.graph_type === 'transfer_characteristics_log' ||
        config.graph_type === 'capacitance_characteristics' ||
        config.graph_type === 'capacitance_characteristics_log' ||
        config.graph_type === 'reverse_drain_source_characteristics') {
      // These graphs should start at (0,0) or have visible intersection
      finalMinX = Math.max(0, finalMinX);
      finalMinY = Math.max(0, finalMinY);
    }

    // Add padding to ensure intersection is visible
    const xPadding = (finalMaxX - finalMinX) * 0.05;
    const yPadding = (finalMaxY - finalMinY) * 0.05;

    const paddedMinX = finalMinX - xPadding;
    const paddedMaxX = finalMaxX + xPadding;
    const paddedMinY = finalMinY - yPadding;
    const paddedMaxY = finalMaxY + yPadding;

    return {
      minX: paddedMinX,
      maxX: paddedMaxX,
      minY: paddedMinY,
      maxY: paddedMaxY,
      xRange: paddedMaxX - paddedMinX,
      yRange: paddedMaxY - paddedMinY,
    };
  }, [curves, config]);

  // Calculate optimal tick intervals
  const calculateTickInterval = (range: number, maxTicks: number = 10) => {
    const roughInterval = range / maxTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
    const normalized = roughInterval / magnitude;
    
    let interval = magnitude;
    if (normalized < 1.5) interval = magnitude;
    else if (normalized < 3) interval = 2 * magnitude;
    else if (normalized < 7) interval = 5 * magnitude;
    else interval = 10 * magnitude;
    
    return interval;
  };

  // Transform data point to SVG coordinates
  const transformPoint = (x: number, y: number) => {
    if (!graphData) return { x: 0, y: 0 };

    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;

    const transformedX = margin + ((x - graphData.minX) / graphData.xRange) * plotWidth;
    const transformedY = height - margin - ((y - graphData.minY) / graphData.yRange) * plotHeight;

    return { x: transformedX, y: transformedY };
  };

  // Generate clean grid lines and tick marks
  const generateGridAndTicks = () => {
    if (!graphData) return null;

    const elements = [];
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;

    // Calculate tick intervals
    const xTickInterval = calculateTickInterval(graphData.xRange);
    const yTickInterval = calculateTickInterval(graphData.yRange);

    // Generate X-axis ticks and grid lines
    const xTickCount = Math.floor(graphData.xRange / xTickInterval) + 1;
    for (let i = 0; i <= xTickCount; i++) {
      const xValue = graphData.minX + (i * xTickInterval);
      if (xValue > graphData.maxX) break;

      const transformedX = margin + ((xValue - graphData.minX) / graphData.xRange) * plotWidth;

      // Grid line
      if (showGrid) {
        elements.push(
          <line
            key={`x-grid-${i}`}
            x1={transformedX}
            y1={margin}
            x2={transformedX}
            y2={height - margin}
            stroke="hsl(var(--border))"
            strokeWidth="1"
            opacity="0.3"
          />
        );
      }

      // Tick mark
      elements.push(
        <line
          key={`x-tick-${i}`}
          x1={transformedX}
          y1={height - margin}
          x2={transformedX}
          y2={height - margin + 5}
          stroke="hsl(var(--foreground))"
          strokeWidth="1"
        />
      );

      // Tick label
      if (showAxisLabels) {
        elements.push(
          <text
            key={`x-label-${i}`}
            x={transformedX}
            y={height - margin + 20}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            fontSize="11"
            fontFamily="Inter, sans-serif"
            fontWeight="500"
          >
            {xValue.toFixed(1)}
          </text>
        );
      }
    }

    // Generate Y-axis ticks and grid lines
    const yTickCount = Math.floor(graphData.yRange / yTickInterval) + 1;
    for (let i = 0; i <= yTickCount; i++) {
      const yValue = graphData.minY + (i * yTickInterval);
      if (yValue > graphData.maxY) break;

      const transformedY = height - margin - ((yValue - graphData.minY) / graphData.yRange) * plotHeight;

      // Grid line
      if (showGrid) {
        elements.push(
          <line
            key={`y-grid-${i}`}
            x1={margin}
            y1={transformedY}
            x2={width - margin}
            y2={transformedY}
            stroke="hsl(var(--border))"
            strokeWidth="1"
            opacity="0.3"
          />
        );
      }

      // Tick mark
      elements.push(
        <line
          key={`y-tick-${i}`}
          x1={margin}
          y1={transformedY}
          x2={margin - 5}
          y2={transformedY}
          stroke="hsl(var(--foreground))"
          strokeWidth="1"
        />
      );

      // Tick label
      if (showAxisLabels) {
        elements.push(
          <text
            key={`y-label-${i}`}
            x={margin - 10}
            y={transformedY + 4}
            textAnchor="end"
            fill="hsl(var(--foreground))"
            fontSize="11"
            fontFamily="Inter, sans-serif"
            dominantBaseline="middle"
            fontWeight="500"
          >
            {yValue.toFixed(1)}
          </text>
        );
      }
    }

    return elements;
  };

  // Generate curve paths with corrected capacitance color meanings
  const generateCurvePaths = () => {
    if (!curves || curves.length === 0) return null;

    const fallbackColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];

    return curves.map((curve, curveIndex) => {
      if (curve.points.length < 2) return null;

      // Fix capacitance color meanings
      let curveColor = curve.color;
      if (curve.color && curve.color.trim() !== '') {
        // For capacitance characteristics, map colors correctly
        if (config.graph_type === 'capacitance_characteristics' || 
            config.graph_type === 'capacitance_characteristics_log') {
          switch (curve.color.toLowerCase()) {
            case 'red':
              curveColor = '#FF0000'; // COSS
              break;
            case 'yellow':
              curveColor = '#FFFF00'; // CISS
              break;
            case 'green':
              curveColor = '#00FF00'; // CRSS
              break;
            default:
              curveColor = curve.color;
          }
        } else {
          curveColor = curve.color;
        }
      } else {
        curveColor = fallbackColors[curveIndex % fallbackColors.length];
      }

      // Create path data
      const pathData = curve.points.map((point, index) => {
        const transformed = transformPoint(point.x, point.y);
        return `${index === 0 ? 'M' : 'L'} ${transformed.x} ${transformed.y}`;
      }).join(' ');

      return (
        <g key={`curve-${curveIndex}`}>
          <path
            d={pathData}
            stroke={curveColor}
            strokeWidth="2"
            fill="none"
            opacity="0.9"
          />
          {curve.points.map((point, pointIndex) => {
            const transformed = transformPoint(point.x, point.y);
            return (
              <circle
                key={`point-${curveIndex}-${pointIndex}`}
                cx={transformed.x}
                cy={transformed.y}
                r="2"
                fill={curveColor}
                opacity="0.8"
              />
            );
          })}
        </g>
      );
    });
  };

  // Generate legend with corrected capacitance labels
  const generateLegend = () => {
    if (!showLegend || !curves || curves.length === 0) return null;

    const legendItems = curves.map((curve, index) => {
      let color = curve.color;
      let label = curve.name;

      // Fix capacitance color meanings and labels
      if (config.graph_type === 'capacitance_characteristics' || 
          config.graph_type === 'capacitance_characteristics_log') {
        switch (curve.color.toLowerCase()) {
          case 'red':
            color = '#FF0000';
            label = 'COSS = CGD + CSD';
            break;
          case 'yellow':
            color = '#FFFF00';
            label = 'CISS = CGD + CGS';
            break;
          case 'green':
            color = '#00FF00';
            label = 'CRSS = CGD';
            break;
          default:
            color = curve.color || '#FF6B6B';
            label = curve.name;
        }
      } else {
        color = curve.color || '#FF6B6B';
        label = curve.name;
      }

      const y = 30 + (index * 25);

      return (
        <g key={`legend-${index}`}>
          <line
            x1={width - 150}
            y1={y}
            x2={width - 130}
            y2={y}
            stroke={color}
            strokeWidth="3"
          />
          <text
            x={width - 125}
            y={y + 4}
            fill="hsl(var(--foreground))"
            fontSize="12"
            fontFamily="Inter, sans-serif"
            fontWeight="500"
          >
            {label}
          </text>
        </g>
      );
    });

    return (
      <g className="legend">
        <rect
          x={width - 160}
          y={20}
          width="140"
          height={curves.length * 25 + 10}
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

  // Generate axis labels
  const generateAxisLabels = () => {
    if (!showAxisLabels || !graphData) return null;

    return (
      <g>
        {/* X-axis label */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          fontSize="14"
          fontFamily="Inter, sans-serif"
          fontWeight="600"
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
          fontWeight="600"
          transform={`rotate(-90, 20, ${height / 2})`}
        >
          {config.y_axis_name || 'Y-Axis'}
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
      {showTitle && title && (
        <div className="graph-title">
          <h3>{title}</h3>
        </div>
      )}
      
      <svg width={width} height={height}>
        {/* Background */}
        <rect width="100%" height="100%" fill="hsl(var(--background))" />
        
        {/* Grid lines and tick marks */}
        {generateGridAndTicks()}
        
        {/* Main axes */}
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
        {generateAxisLabels()}
        
        {/* Legend */}
        {generateLegend()}
      </svg>
    </div>
  );
};

export default EnhancedGraphViewer; 