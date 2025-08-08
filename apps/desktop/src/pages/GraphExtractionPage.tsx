import React, { useState, useEffect, useRef, useCallback } from 'react';
import { curveExtractionService } from '../services/curveExtractionService';
import { graphQueueService, QueueJob, QueueConfig } from '../services/graphQueueService';
import customGraphTypeService, { CustomGraphType } from '../services/customGraphTypeService';
import { DetectedColor, GraphConfig, GraphPreset, CurveExtractionResult } from '../types';
import EnhancedGraphViewer from '../components/EnhancedGraphViewer';
import CustomGraphTypeModal from '../components/CustomGraphTypeModal';
import { Settings, Plus } from 'lucide-react';
import { Button } from '@espice/ui';
import '../styles/graph-extraction.css';
import productManagementService from '../services/productManagementService';

// Graph type presets with legacy algorithm support
const GRAPH_PRESETS: { [key: string]: GraphPreset } = {
  output_characteristics: {
    graph_type: 'output_characteristics',
    name: 'Output Characteristics',
    x_axis: 'VDS - Drain-to-Source Voltage (V)',
    y_axis: 'ID - Drain Current (A)',
    third_col: 'VGS',
    x_min: 0,
    x_max: 3.0,
    y_min: 0,
    y_max: 500,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'linear',
    color_reps: {
      red: 'VGS = 5V',
      green: 'VGS = 4V',
      yellow: 'VGS = 3V',
      blue: 'VGS = 2V'
    },
    output_filename: 'output_characteristics'
  },
  output_characteristics_log: {
    graph_type: 'output_characteristics_log',
    name: 'Output Characteristics (Log Scale)',
    x_axis: 'VDS - Drain-to-Source Voltage (V)',
    y_axis: 'ID - Drain Current (A)',
    third_col: 'VGS',
    x_min: 0,
    x_max: 3.0,
    y_min: 0.1,
    y_max: 500,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'log',
    color_reps: {
      red: 'VGS = 5V',
      green: 'VGS = 4V',
      yellow: 'VGS = 3V',
      blue: 'VGS = 2V'
    },
    output_filename: 'output_characteristics_log'
  },
  transfer_characteristics: {
    graph_type: 'transfer_characteristics',
    name: 'Transfer Characteristics',
    x_axis: 'VGS - Gate-to-Source Voltage (V)',
    y_axis: 'ID - Drain Current (A)',
    third_col: 'Temperature',
    x_min: 0.5,
    x_max: 5.0,
    y_min: 0,
    y_max: 500,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'linear',
    color_reps: {
      blue: 'T = 25°C',
      red: 'T = 125°C'
    },
    output_filename: 'transfer_characteristics'
  },
  transfer_characteristics_log: {
    graph_type: 'transfer_characteristics_log',
    name: 'Transfer Characteristics (Log Scale)',
    x_axis: 'VGS - Gate-to-Source Voltage (V)',
    y_axis: 'ID - Drain Current (A)',
    third_col: 'Temperature',
    x_min: 0.5,
    x_max: 5.0,
    y_min: 0.1,
    y_max: 500,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'log',
    color_reps: {
      blue: 'T = 25°C',
      red: 'T = 125°C'
    },
    output_filename: 'transfer_characteristics_log'
  },
  capacitance_characteristics: {
    graph_type: 'capacitance_characteristics',
    name: 'Capacitance Characteristics',
    x_axis: 'VDS - Drain-to-Source Voltage (V)',
    y_axis: 'Capacitance (pF)',
    third_col: 'Type',
    x_min: 0,
    x_max: 15,
    y_min: 0,
    y_max: 120,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'linear',
    color_reps: { 
      red: 'COSS = CGD + CSD', 
      yellow: 'CISS = CGD + CGS', 
      green: 'CRSS = CGD'
    },
    output_filename: 'capacitance_characteristics'
  },
  capacitance_characteristics_log: {
    graph_type: 'capacitance_characteristics_log',
    name: 'Capacitance Characteristics (Log Scale)',
    x_axis: 'VDS - Drain-to-Source Voltage (V)',
    y_axis: 'Capacitance (pF)',
    third_col: 'Type',
    x_min: 0,
    x_max: 15,
    y_min: 10,
    y_max: 1000,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'log',
    color_reps: { 
      red: 'COSS = CGD + CSD', 
      yellow: 'CISS = CGD + CGS', 
      green: 'CRSS = CGD'
    },
    output_filename: 'capacitance_characteristics_log'
  },
  on_resistance_characteristics: {
    graph_type: 'on_resistance_characteristics',
    name: 'On-Resistance Characteristics',
    x_axis: 'VGS - Gate-to-Source Voltage (V)',
    y_axis: 'RDS(on) - Drain-to-Source Resistance (mΩ)',
    third_col: 'ID',
    x_min: 2.5,
    x_max: 5.0,
    y_min: 0,
    y_max: 5,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'linear',
    color_reps: { 
      blue: 'ID = 20A',
      green: 'ID = 40A',
      yellow: 'ID = 60A',
      red: 'ID = 80A'
    },
    output_filename: 'on_resistance_characteristics'
  },
  on_resistance_temperature: {
    graph_type: 'on_resistance_temperature',
    name: 'On-Resistance vs Temperature',
    x_axis: 'VGS - Gate-to-Source Voltage (V)',
    y_axis: 'RDS(on) - Drain-to-Source Resistance (mΩ)',
    third_col: 'Temperature',
    x_min: 2.5,
    x_max: 5.0,
    y_min: 0,
    y_max: 5,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'linear',
    color_reps: { 
      blue: 'T = 25°C',
      red: 'T = 125°C'
    },
    output_filename: 'on_resistance_temperature'
  },
  gate_charge_characteristics: {
    graph_type: 'gate_charge_characteristics',
    name: 'Gate Charge Characteristics',
    x_axis: 'VGS - Gate-to-Source Voltage (V)',
    y_axis: 'QG - Gate Charge (nC)',
    third_col: 'VDS',
    x_min: 0,
    x_max: 6,
    y_min: 0,
    y_max: 1000,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'linear',
    color_reps: { 
      blue: 'VDS = 6V',
      red: 'VDS = 12V',
      green: 'VDS = 3V',
      yellow: 'VDS = 9V'
    },
    output_filename: 'gate_charge_characteristics'
  },
  switching_characteristics: {
    graph_type: 'switching_characteristics',
    name: 'Switching Characteristics',
    x_axis: 'Time (ns)',
    y_axis: 'V/I (V/A)',
    third_col: 'Type',
    x_min: 0,
    x_max: 100,
    y_min: 0,
    y_max: 100,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'linear',
    color_reps: { 
      red: 'VDS',
      blue: 'ID',
      green: 'VGS',
      yellow: 'IG'
    },
    output_filename: 'switching_characteristics'
  },
  thermal_characteristics: {
    graph_type: 'thermal_characteristics',
    name: 'Normalized On-State Resistance vs Temperature',
    x_axis: 'Tj - Junction Temperature (°C)',
    y_axis: 'Normalized On-State Resistance RDS(on)',
    third_col: 'Conditions',
    x_min: 0,
    x_max: 150,
    y_min: 0.8,
    y_max: 2.0,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'linear',
    color_reps: { 
      blue: 'ID = 40A, VGS = 5V'
    },
    output_filename: 'thermal_characteristics'
  },
  safe_operating_area: {
    graph_type: 'safe_operating_area',
    name: 'Safe Operating Area',
    x_axis: 'VDS - Drain-to-Source Voltage (V)',
    y_axis: 'ID - Drain Current (A)',
    third_col: 'Type',
    x_min: 0,
    x_max: 100,
    y_min: 0,
    y_max: 1000,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'log',
    y_scale_type: 'log',
    color_reps: { 
      red: 'DC',
      blue: 'Pulse',
      green: 'Single Pulse',
      yellow: 'Repetitive Pulse'
    },
    output_filename: 'safe_operating_area'
  },
  body_diode_characteristics: {
    graph_type: 'body_diode_characteristics',
    name: 'Body Diode Characteristics',
    x_axis: 'VSD - Source-to-Drain Voltage (V)',
    y_axis: 'ISD - Source-to-Drain Current (A)',
    third_col: 'Temperature',
    x_min: 0,
    x_max: 5.0,
    y_min: 0,
    y_max: 500,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'linear',
    color_reps: { 
      blue: 'T = 25°C',
      red: 'T = 125°C'
    },
    output_filename: 'body_diode_characteristics'
  },
  reverse_drain_source_characteristics: {
    graph_type: 'reverse_drain_source_characteristics',
    name: 'Reverse Drain-Source Characteristics',
    x_axis: 'VSD - Source-to-Drain Voltage (V)',
    y_axis: 'ISD - Source-to-Drain Current (A)',
    third_col: 'Temperature',
    x_min: 0,
    x_max: 5.0,
    y_min: 0,
    y_max: 500,
    x_scale: 1,
    y_scale: 1,
    x_scale_type: 'linear',
    y_scale_type: 'linear',
    color_reps: { 
      blue: 'T = 25°C',
      red: 'T = 125°C'
    },
    output_filename: 'reverse_drain_source_characteristics'
  }
};



interface GraphExtractionPageProps {
  setExtractButton: (button: React.ReactNode) => void;
  setServiceStatus: (status: 'checking' | 'available' | 'unavailable') => void;
  setServiceError: (error: string) => void;
  setOnServiceRetry: (retryFn: (() => void) | undefined) => void;
}

const convertPresetToConfig = (preset: GraphPreset): GraphConfig => ({
  graph_type: preset.graph_type,
  x_axis_name: preset.x_axis,
  y_axis_name: preset.y_axis,
  x_min: preset.x_min,
  x_max: preset.x_max,
  y_min: preset.y_min,
  y_max: preset.y_max,
  x_scale: preset.x_scale,
  y_scale: preset.y_scale,
  x_scale_type: preset.x_scale_type,
  y_scale_type: preset.y_scale_type,
  // Optimized defaults for better performance:
  min_size: 1000,
  color_tolerance: 0,
  // Default to optimized mode for better results
  mode: 'optimized',
  use_plot_area: false,
  use_annotation_mask: false,
  use_edge_guided: false,
  use_adaptive_binning: false,
  use_auto_color: false,
  color_reps: preset.color_reps
});

export default function GraphExtractionPage({ 
  setExtractButton, 
  setServiceStatus, 
  setServiceError, 
  setOnServiceRetry 
}: GraphExtractionPageProps) {
  const [customGraphTypes, setCustomGraphTypes] = useState<CustomGraphType[]>([]);
  const [showCustomGraphTypeModal, setShowCustomGraphTypeModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<Uint8Array | null>(null);
  const [detectedColors, setDetectedColors] = useState<DetectedColor[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [config, setConfig] = useState<GraphConfig>(convertPresetToConfig(GRAPH_PRESETS.output_characteristics));
  const [result, setResult] = useState<CurveExtractionResult | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string>('');
  const [serviceStatus, setLocalServiceStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [activeTab, setActiveTab] = useState<'standard' | 'llm' | 'queue'>('standard');
  const [legacyResult, setLegacyResult] = useState<CurveExtractionResult | null>(null);
  const [llmResult, setLlmResult] = useState<CurveExtractionResult | null>(null);
  const [llmPrompt, setLlmPrompt] = useState<string>('');
  const [llmProcessing, setLlmProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Read optional productId query param to support post-extraction auto-save
  const [targetProductId, setTargetProductId] = useState<string | null>(null);

  // Queue Management State
  const [queueConfig, setQueueConfig] = useState<QueueConfig>({
    id: 'default-queue',
    name: 'Graph Extraction Queue',
    mode: 'automatic',
    status: 'active',
    max_concurrent_jobs: 3,
    priority: 'fifo',
    description: 'Default queue for graph extraction jobs'
  });
  const [queueJobs, setQueueJobs] = useState<QueueJob[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string>('');

  // Queue Management Functions
  const loadQueueJobs = useCallback(async () => {
    try {
      setQueueLoading(true);
      setQueueError('');
      
      // Check if service is available
      const isAvailable = await graphQueueService.isServiceAvailable();
      if (!isAvailable) {
        setQueueError('Graph queue service is not available. Please start the service on port 8008.');
        return;
      }

      // Get queue status and jobs
      const queueStatus = await graphQueueService.getQueueStatus(queueConfig.id);
      setQueueConfig(queueStatus);
      
      // For now, we'll use mock data since the actual job listing endpoint might not be implemented
      // In a real implementation, you would fetch jobs from the queue service
      const mockJobs: QueueJob[] = [
        {
          id: 'job-1',
          product_id: 'product-1',
          image_id: 'image-1',
          status: 'pending',
          priority: 'high',
          progress: 0,
          extraction_method: 'standard',
          created_at: new Date().toISOString()
        },
        {
          id: 'job-2',
          product_id: 'product-2',
          image_id: 'image-2',
          status: 'processing',
          priority: 'normal',
          progress: 45,
          extraction_method: 'legacy',
          created_at: new Date(Date.now() - 60000).toISOString(),
          started_at: new Date(Date.now() - 30000).toISOString()
        },
        {
          id: 'job-3',
          product_id: 'product-3',
          image_id: 'image-3',
          status: 'completed',
          priority: 'low',
          progress: 100,
          extraction_method: 'llm',
          created_at: new Date(Date.now() - 120000).toISOString(),
          started_at: new Date(Date.now() - 90000).toISOString(),
          completed_at: new Date(Date.now() - 30000).toISOString()
        }
      ];
      
      setQueueJobs(mockJobs);
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Failed to load queue jobs');
    } finally {
      setQueueLoading(false);
    }
  }, [queueConfig.id]);

  const updateQueueConfig = useCallback(async (newConfig: Partial<QueueConfig>) => {
    try {
      setQueueError('');
      const updatedConfig = await graphQueueService.updateQueue(queueConfig.id, newConfig);
      setQueueConfig(updatedConfig);
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Failed to update queue config');
    }
  }, [queueConfig.id]);

  const updateJobPriority = useCallback(async (jobId: string, priority: QueueJob['priority']) => {
    try {
      setQueueError('');
      await graphQueueService.updateJobPriority(jobId, priority);
      setQueueJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, priority } : job
      ));
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Failed to update job priority');
    }
  }, []);

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      setQueueError('');
      await graphQueueService.cancelJob(jobId);
      setQueueJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: 'failed' as const } : job
      ));
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Failed to cancel job');
    }
  }, []);

  const retryJob = useCallback(async (jobId: string) => {
    try {
      setQueueError('');
      await graphQueueService.retryJob(jobId);
      setQueueJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: 'pending' as const, progress: 0 } : job
      ));
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Failed to retry job');
    }
  }, []);

  const deleteJob = useCallback(async (jobId: string) => {
    try {
      setQueueError('');
      // Note: The current API doesn't have a delete job endpoint, so we'll just remove from local state
      // In a real implementation, you would call graphQueueService.deleteJob(jobId);
      setQueueJobs(prev => prev.filter(job => job.id !== jobId));
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Failed to delete job');
    }
  }, []);

  const batchCancelJobs = useCallback(async () => {
    try {
      setQueueError('');
      if (selectedJobs.length === 0) return;
      
      // Cancel each job individually since there's no batch cancel endpoint
      for (const jobId of selectedJobs) {
        await graphQueueService.cancelJob(jobId);
      }
      
      setQueueJobs(prev => prev.map(job => 
        selectedJobs.includes(job.id) ? { ...job, status: 'failed' as const } : job
      ));
      setSelectedJobs([]);
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Failed to batch cancel jobs');
    }
  }, [selectedJobs]);

  const batchRetryJobs = useCallback(async () => {
    try {
      setQueueError('');
      if (selectedJobs.length === 0) return;
      
      // Retry each job individually since there's no batch retry endpoint
      for (const jobId of selectedJobs) {
        await graphQueueService.retryJob(jobId);
      }
      
      setQueueJobs(prev => prev.map(job => 
        selectedJobs.includes(job.id) ? { ...job, status: 'pending' as const, progress: 0 } : job
      ));
      setSelectedJobs([]);
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Failed to batch retry jobs');
    }
  }, [selectedJobs]);

  const batchDeleteJobs = useCallback(async () => {
    try {
      setQueueError('');
      if (selectedJobs.length === 0) return;
      
      // Note: The current API doesn't have a batch delete endpoint, so we'll just remove from local state
      // In a real implementation, you would call graphQueueService.batchDeleteJobs(selectedJobs);
      setQueueJobs(prev => prev.filter(job => !selectedJobs.includes(job.id)));
      setSelectedJobs([]);
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Failed to batch delete jobs');
    }
  }, [selectedJobs]);

  const toggleJobSelection = useCallback((jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  }, []);

  const selectAllJobs = useCallback(() => {
    setSelectedJobs(queueJobs.map(job => job.id));
  }, [queueJobs]);

  const clearJobSelection = useCallback(() => {
    setSelectedJobs([]);
  }, []);

  const getPriorityColor = useCallback((priority: QueueJob['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getStatusColor = useCallback((status: QueueJob['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const handleExtract = useCallback(async () => {
    if (!imageData) return;

    try {
      setExtracting(true);
      setError('');
      
      let extractionResult: CurveExtractionResult;
      const colorsToUse = selectedColors.length > 0
        ? selectedColors
        : ['red','blue','green','yellow','cyan','magenta','orange','purple'];
      
      if (activeTab === 'llm') {
        // Use LLM-assisted extraction
        extractionResult = await curveExtractionService.extractCurvesLLM(
          imageData,
          colorsToUse,
          config,
          llmPrompt
        );
        setLlmResult(extractionResult);
      } else {
        // Use standard extraction (which is legacy algorithm)
        extractionResult = await curveExtractionService.extractCurves(
          imageData,
          colorsToUse,
          config
        );
      }
      
      setResult(extractionResult);

      // Auto-save CSV to product if productId present
      try {
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('productId');
        setTargetProductId(productId);
        if (productId) {
          // Build array-of-objects rows for CSV persistence
          const rows: any[] = [];
          extractionResult.curves.forEach((curve) => {
            curve.points.forEach((p) => {
              rows.push({
                [config.x_axis_name]: p.x,
                [config.y_axis_name]: p.y,
                Curve: curve.name
              });
            });
          });
          await productManagementService.saveExtractedCSV({
            productId,
            graphType: config.graph_type,
            csvData: rows,
            name: GRAPH_PRESETS[config.graph_type as keyof typeof GRAPH_PRESETS]?.name || config.graph_type,
            description: `Auto-saved from Graph Extraction (${activeTab})`
          });
        }
      } catch (e) {
        console.warn('Auto-save of extracted CSV failed:', e);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  }, [imageData, selectedColors, config, activeTab, llmPrompt]);

  const getCurrentResult = () => {
    switch (activeTab) {
      case 'llm':
        return llmResult;
      default:
        return result;
    }
  };

  // CSV Download Function
  const downloadCSV = useCallback(() => {
    const currentResult = getCurrentResult();
    if (!currentResult || !currentResult.curves || currentResult.curves.length === 0) {
      setError('No data available for download');
      return;
    }

    try {
      // Create CSV content
      let csvContent = `${config.x_axis_name},${config.y_axis_name},Curve\n`;
      
      currentResult.curves.forEach((curve, curveIndex) => {
        curve.points.forEach((point) => {
          csvContent += `${point.x},${point.y},${curve.name}\n`;
        });
      });

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${config.graph_type}_extracted_data.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      setError('Failed to download CSV file');
    }
  }, [getCurrentResult, config]);

  // Excel Download Function
  const downloadExcel = useCallback(() => {
    const currentResult = getCurrentResult();
    if (!currentResult || !currentResult.curves || currentResult.curves.length === 0) {
      setError('No data available for download');
      return;
    }

    try {
      // Create Excel content (XLSX format)
      let excelContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Extracted Data">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">${config.x_axis_name}</Data></Cell>
        <Cell><Data ss:Type="String">${config.y_axis_name}</Data></Cell>
        <Cell><Data ss:Type="String">Curve</Data></Cell>
      </Row>`;
      
      currentResult.curves.forEach((curve) => {
        curve.points.forEach((point) => {
          excelContent += `
      <Row>
        <Cell><Data ss:Type="Number">${point.x}</Data></Cell>
        <Cell><Data ss:Type="Number">${point.y}</Data></Cell>
        <Cell><Data ss:Type="String">${curve.name}</Data></Cell>
      </Row>`;
        });
      });

      excelContent += `
    </Table>
  </Worksheet>
</Workbook>`;

      // Create and download file
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${config.graph_type}_extracted_data.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      setError('Failed to download Excel file');
    }
  }, [getCurrentResult, config]);

  useEffect(() => {
    checkServiceStatus();
    setOnServiceRetry(checkServiceStatus);
    loadCustomGraphTypes();
  }, []);

  const loadCustomGraphTypes = async () => {
    try {
      const types = await customGraphTypeService.getAllCustomGraphTypes();
      setCustomGraphTypes(types);
    } catch (error) {
      console.error('Failed to load custom graph types:', error);
    }
  };

  const handleSaveCustomGraphType = async (graphType: CustomGraphType) => {
    try {
      await customGraphTypeService.saveCustomGraphType(graphType);
      await loadCustomGraphTypes();
    } catch (error) {
      console.error('Failed to save custom graph type:', error);
      alert('Failed to save custom graph type');
    }
  };

  const handleDeleteCustomGraphType = async (id: string) => {
    try {
      await customGraphTypeService.deleteCustomGraphType(id);
      await loadCustomGraphTypes();
    } catch (error) {
      console.error('Failed to delete custom graph type:', error);
      alert('Failed to delete custom graph type');
    }
  };

  useEffect(() => {
    if (activeTab === 'queue') {
      loadQueueJobs();
    }
  }, [activeTab, loadQueueJobs]);

  useEffect(() => {
    setExtractButton(
      <button 
        onClick={handleExtract}
        className="btn btn-primary"
        disabled={extracting || !imageData}
      >
        {extracting ? 'Processing...' : 'Extract Graph'}
      </button>
    );
  }, [extracting, imageData, setExtractButton, handleExtract]);

  const checkServiceStatus = async () => {
    try {
      setLocalServiceStatus('checking');
      const isAvailable = await curveExtractionService.isFastApiAvailable();
      setLocalServiceStatus(isAvailable ? 'available' : 'unavailable');
      setServiceStatus(isAvailable ? 'available' : 'unavailable');
    } catch (error) {
      setLocalServiceStatus('unavailable');
      setServiceStatus('unavailable');
      setServiceError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      setImageData(uint8Array);
      
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);

      // Detect colors
      const colors = await curveExtractionService.detectColors(uint8Array);
      // Deduplicate by name (base color) to avoid 'red' & 'red2'
      const uniqueByName = Array.from(new Map(colors.map(c => [c.name, c])).values());
      setDetectedColors(uniqueByName);
      setSelectedColors(uniqueByName.map(c => c.name));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load image');
    }
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If graph type is changed, update the entire configuration with the new preset
    if (name === 'graph_type') {
      // Check if it's a custom graph type
      const customType = customGraphTypes.find(type => type.id === value);
      if (customType) {
        const customPreset = customGraphTypeService.convertToGraphPreset(customType);
        setConfig(convertPresetToConfig(customPreset));
        curveExtractionService.setGraphPreset(value);
        return;
      }
      
      // Check if it's a built-in preset
      const selectedPreset = GRAPH_PRESETS[value as keyof typeof GRAPH_PRESETS];
      if (selectedPreset) {
        setConfig(convertPresetToConfig(selectedPreset));
        curveExtractionService.setGraphPreset(value);
        return;
      }
    }
    
    // For other fields, update only the specific field
    setConfig(prev => ({
      ...prev,
      [name]: name.includes('min') || name.includes('max') || name.includes('scale') ? parseFloat(value) : value
    }));
  };

  const handleLLMExtract = async () => {
    if (!imageData) return;

    try {
      setLlmProcessing(true);
      setError('');
      
      const colorsToUse = selectedColors.length > 0
        ? selectedColors
        : ['red','blue','green','yellow','cyan','magenta','orange','purple'];
      const extractionResult = await curveExtractionService.extractCurvesLLM(
        imageData,
        colorsToUse,
        config,
        llmPrompt
      );
      
      setLlmResult(extractionResult);
      setResult(extractionResult);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'LLM extraction failed');
    } finally {
      setLlmProcessing(false);
    }
  };

  const clearAll = () => {
    setImagePreview(null);
    setImageData(null);
    setDetectedColors([]);
    setSelectedColors([]);
    setResult(null);
    setLegacyResult(null);
    setLlmResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openResultView = useCallback(() => {
    try {
      const payload = {
        imagePreview,
        result: getCurrentResult(),
        config,
      };
      localStorage.setItem('graphExtractionResult', JSON.stringify(payload));
      window.location.href = '/graph-extraction/result';
    } catch (e) {
      console.error('Failed to open result view', e);
      setError('Failed to open result view');
    }
  }, [imagePreview, config]);

  return (
    <div className="graph-extraction-page">
      {error && (
        <div className="error-popup">
          <div className="error-popup-content">
            <span className="error-message">{error}</span>
            <button onClick={() => setError('')} className="error-close-btn">×</button>
          </div>
        </div>
      )}
      
      <div className="extraction-layout">
        <div className="main-row">
          <div className="upload-panel">
            <div className="upload-section card">
              <div 
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="file-input-hidden"
                />
                {imagePreview ? (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Graph preview" />
                    <div className="image-overlay">
                      <button onClick={clearAll} className="clear-image-btn">×</button>
                    </div>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <p>Click to upload or drag and drop</p>
                    <p className="upload-hint">Supports PNG, JPG, JPEG</p>
                  </div>
                )}
              </div>
              
              <div className="generated-graph-section">
                <div className="generated-graph-container">
                  {getCurrentResult() ? (
                    <EnhancedGraphViewer
                      curves={getCurrentResult()!.curves}
                      config={config}
                      title=""
                      width={583}
                      height={471}
                      showGrid={true}
                      showLegend={true}
                      showAxisLabels={true}
                      showTitle={false}
                    />
                  ) : (
                    <div className="empty-graph-placeholder">
                      <p>Graph will appear here after extraction</p>
                    </div>
                  )}
                </div>
                {getCurrentResult() && (
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="secondary" onClick={openResultView}>Open Result View</Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="config-panel">
            <div className="config-section card">
              <div className="config-content">
                {/* Tabs hidden per request; default to Standard mode */}

                {/* LLM Prompt Section */}
                {activeTab === 'llm' && (
                  <div className="llm-prompt-section">
                    <label>AI Analysis Prompt</label>
                    <textarea
                      value={llmPrompt}
                      onChange={(e) => setLlmPrompt(e.target.value)}
                      placeholder="Describe the graph type, expected curves, and any specific requirements for extraction..."
                      className="llm-prompt-textarea"
                      rows={4}
                    />
                    <div className="llm-info">
                      <p>💡 <strong>Tip:</strong> Be specific about curve types, axis ranges, and expected behavior</p>
                      <p>🔒 <strong>Note:</strong> This feature uses Kimi K2 model and is not commercially available</p>
                    </div>
                  </div>
                )}

                {/* Queue Management Section */}
                {activeTab === 'queue' && (
                  <div className="queue-management-section">
                    {/* Queue Configuration */}
                    <div className="queue-config-section">
                      <h4>Queue Configuration</h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Queue Mode</label>
                          <select
                            value={queueConfig.mode}
                            onChange={(e) => updateQueueConfig({ mode: e.target.value as 'automatic' | 'manual' })}
                            className="form-select"
                          >
                            <option value="automatic">Automatic</option>
                            <option value="manual">Manual</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Queue Status</label>
                          <select
                            value={queueConfig.status}
                            onChange={(e) => updateQueueConfig({ status: e.target.value as 'active' | 'paused' | 'stopped' })}
                            className="form-select"
                          >
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="stopped">Stopped</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Max Concurrent Jobs</label>
                          <input
                            type="number"
                            value={queueConfig.max_concurrent_jobs}
                            onChange={(e) => updateQueueConfig({ max_concurrent_jobs: parseInt(e.target.value) })}
                            className="form-input"
                            min="1"
                            max="10"
                          />
                        </div>
                        <div className="form-group">
                          <label>Priority Strategy</label>
                          <select
                            value={queueConfig.priority}
                            onChange={(e) => updateQueueConfig({ priority: e.target.value as 'fifo' | 'priority' | 'custom' })}
                            className="form-select"
                          >
                            <option value="fifo">First In, First Out</option>
                            <option value="priority">Priority Based</option>
                            <option value="custom">Custom Order</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Queue Statistics */}
                    <div className="queue-stats-section">
                      <h4>Queue Statistics</h4>
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-label">Total Jobs</span>
                          <span className="stat-value">{queueJobs.length}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Pending</span>
                          <span className="stat-value">{queueJobs.filter(job => job.status === 'pending').length}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Processing</span>
                          <span className="stat-value">{queueJobs.filter(job => job.status === 'processing').length}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Completed</span>
                          <span className="stat-value">{queueJobs.filter(job => job.status === 'completed').length}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Failed</span>
                          <span className="stat-value">{queueJobs.filter(job => job.status === 'failed').length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Batch Operations */}
                    {selectedJobs.length > 0 && (
                      <div className="batch-operations-section">
                        <h4>Batch Operations ({selectedJobs.length} selected)</h4>
                        <div className="batch-buttons">
                          <button
                            onClick={batchCancelJobs}
                            className="btn btn-warning btn-sm"
                            title="Cancel selected jobs"
                          >
                            🚫 Cancel
                          </button>
                          <button
                            onClick={batchRetryJobs}
                            className="btn btn-info btn-sm"
                            title="Retry selected jobs"
                          >
                            🔄 Retry
                          </button>
                          <button
                            onClick={batchDeleteJobs}
                            className="btn btn-danger btn-sm"
                            title="Delete selected jobs"
                          >
                            🗑️ Delete
                          </button>
                          <button
                            onClick={clearJobSelection}
                            className="btn btn-secondary btn-sm"
                            title="Clear selection"
                          >
                            ✕ Clear
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Queue Error Display */}
                    {queueError && (
                      <div className="queue-error">
                        <span className="error-message">{queueError}</span>
                        <button onClick={() => setQueueError('')} className="error-close-btn">×</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Job List Table */}
                {activeTab === 'queue' && (
                  <div className="job-list-section">
                    <h4>Job Queue</h4>
                    {queueLoading ? (
                      <div className="loading-message">Loading queue jobs...</div>
                    ) : queueJobs.length === 0 ? (
                      <div className="empty-queue-message">No jobs in queue</div>
                    ) : (
                      <div className="job-table-container">
                        <table className="job-table">
                          <thead>
                            <tr>
                              <th>
                                <input
                                  type="checkbox"
                                  checked={selectedJobs.length === queueJobs.length && queueJobs.length > 0}
                                  onChange={(e) => e.target.checked ? selectAllJobs() : clearJobSelection()}
                                  className="job-checkbox"
                                />
                              </th>
                              <th>Job ID</th>
                              <th>Status</th>
                              <th>Priority</th>
                              <th>Method</th>
                              <th>Progress</th>
                              <th>Created</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {queueJobs.map((job) => (
                              <tr key={job.id} className={`job-row ${selectedJobs.includes(job.id) ? 'selected' : ''}`}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={selectedJobs.includes(job.id)}
                                    onChange={() => toggleJobSelection(job.id)}
                                    className="job-checkbox"
                                  />
                                </td>
                                <td className="job-id">{job.id}</td>
                                <td>
                                  <span className={`status-badge ${getStatusColor(job.status)}`}>
                                    {job.status}
                                  </span>
                                </td>
                                <td>
                                  <select
                                    value={job.priority}
                                    onChange={(e) => updateJobPriority(job.id, e.target.value as QueueJob['priority'])}
                                    className="priority-select"
                                    disabled={job.status === 'completed' || job.status === 'failed'}
                                  >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                  </select>
                                </td>
                                <td className="extraction-method">{job.extraction_method}</td>
                                <td>
                                  <div className="progress-container">
                                    <div className="progress-bar">
                                      <div 
                                        className="progress-fill" 
                                        style={{ width: `${job.progress}%` }}
                                      />
                                    </div>
                                    <span className="progress-text">{job.progress}%</span>
                                  </div>
                                </td>
                                <td className="created-date">
                                  {new Date(job.created_at).toLocaleString()}
                                </td>
                                <td className="job-actions">
                                  {job.status === 'pending' && (
                                    <button
                                      onClick={() => cancelJob(job.id)}
                                      className="btn btn-warning btn-xs"
                                      title="Cancel job"
                                    >
                                      🚫
                                    </button>
                                  )}
                                  {job.status === 'failed' && (
                                    <button
                                      onClick={() => retryJob(job.id)}
                                      className="btn btn-info btn-xs"
                                      title="Retry job"
                                    >
                                      🔄
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteJob(job.id)}
                                    className="btn btn-danger btn-xs"
                                    title="Delete job"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label>Graph Type</label>
                  <div className="graph-type-container">
                    <select
                      name="graph_type"
                      value={config.graph_type}
                      onChange={handleConfigChange}
                      className="form-select"
                    >
                      <optgroup label="Built-in Graph Types">
                        {Object.entries(GRAPH_PRESETS).map(([key, preset]) => (
                          <option key={key} value={key}>
                            {preset.name}
                          </option>
                        ))}
                      </optgroup>
                      {customGraphTypes.length > 0 && (
                        <optgroup label="Custom Graph Types">
                          {customGraphTypes.map((customType) => (
                            <option key={customType.id} value={customType.id}>
                              {customType.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <Button
                      onClick={() => setShowCustomGraphTypeModal(true)}
                      variant="outline"
                      size="sm"
                      className="custom-graph-type-btn"
                      title="Manage Custom Graph Types"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>X-Axis Name</label>
                    <input
                      type="text"
                      name="x_axis_name"
                      value={config.x_axis_name}
                      onChange={handleConfigChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Y-Axis Name</label>
                    <input
                      type="text"
                      name="y_axis_name"
                      value={config.y_axis_name}
                      onChange={handleConfigChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>X Min</label>
                    <input
                      type="number"
                      name="x_min"
                      value={config.x_min}
                      onChange={handleConfigChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>X Max</label>
                    <input
                      type="number"
                      name="x_max"
                      value={config.x_max}
                      onChange={handleConfigChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Y Min</label>
                    <input
                      type="number"
                      name="y_min"
                      value={config.y_min}
                      onChange={handleConfigChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Y Max</label>
                    <input
                      type="number"
                      name="y_max"
                      value={config.y_max}
                      onChange={handleConfigChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>X Scale</label>
                    <input
                      type="number"
                      name="x_scale"
                      value={config.x_scale}
                      onChange={handleConfigChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Y Scale</label>
                    <input
                      type="number"
                      name="y_scale"
                      value={config.y_scale}
                      onChange={handleConfigChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>X Scale Type</label>
                    <select
                      name="x_scale_type"
                      value={config.x_scale_type}
                      onChange={handleConfigChange}
                      className="form-select"
                    >
                      <option value="linear">Linear</option>
                      <option value="log">Logarithmic</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Y Scale Type</label>
                    <select
                      name="y_scale_type"
                      value={config.y_scale_type}
                      onChange={handleConfigChange}
                      className="form-select"
                    >
                      <option value="linear">Linear</option>
                      <option value="log">Logarithmic</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Min Pixel Count</label>
                    <input
                      type="number"
                      name="min_size"
                      value={config.min_size || 1000}
                      onChange={handleConfigChange}
                      className="form-input"
                      min="50"
                      max="20000"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Color Tolerance</label>
                    <input
                      type="range"
                      name="color_tolerance"
                      min="0"
                      max="50"
                      value={config.color_tolerance || 0}
                      onChange={handleConfigChange}
                      className="form-range"
                    />
                    <div className="range-labels">
                      <span>Strict (0)</span>
                      <span>Loose (50)</span>
                    </div>
                  </div>
                  
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Extraction Mode</label>
                    <select
                      name="mode"
                      value={config.mode || 'optimized'}
                      onChange={handleConfigChange}
                      className="form-select"
                    >
                      <option value="optimized">Optimized (Recommended)</option>
                      <option value="legacy">Legacy Algorithm</option>
                      <option value="enhanced">Enhanced Features</option>
                      <option value="auto">Auto Selection</option>
                    </select>
                    <small className="form-help">
                      Optimized: Best balance of speed and accuracy. Legacy: Original algorithm. Enhanced: Advanced features.
                    </small>
                  </div>
                </div>

                {/* Enhanced Feature Flags (optional) */}
                <div className="form-group enhanced-options">
                  <div className="enhanced-header">
                    <label>Enhanced Options (optional)</label>
                    <small className="enhanced-hint">Enable only as needed. Start with Plot Area, then try Edge-guided.</small>
                  </div>
                  <div className="flag-grid">
                    <label className="flag-item">
                      <input
                        type="checkbox"
                        checked={!!config.use_plot_area}
                        onChange={(e) => setConfig(prev => ({ ...prev, use_plot_area: e.target.checked }))}
                      />
                      <div className="flag-text">
                        <span className="flag-title">Use Plot Area Detection</span>
                        <span className="flag-help">Detects inner axes region to reduce noise</span>
                      </div>
                    </label>
                    <label className="flag-item">
                      <input
                        type="checkbox"
                        checked={!!config.use_edge_guided}
                        onChange={(e) => setConfig(prev => ({ ...prev, use_edge_guided: e.target.checked }))}
                      />
                      <div className="flag-text">
                        <span className="flag-title">Edge-guided Denoising</span>
                        <span className="flag-help">Keeps pixels aligned to edges; good for thin strokes</span>
                      </div>
                    </label>
                    <label className="flag-item">
                      <input
                        type="checkbox"
                        checked={!!config.use_annotation_mask}
                        onChange={(e) => setConfig(prev => ({ ...prev, use_annotation_mask: e.target.checked }))}
                      />
                      <div className="flag-text">
                        <span className="flag-title">Mask Legends/Ticks</span>
                        <span className="flag-help">Removes legend boxes and tick labels; may hide near-axis curves</span>
                      </div>
                    </label>
                    <label className="flag-item">
                      <input
                        type="checkbox"
                        checked={!!config.use_adaptive_binning}
                        onChange={(e) => setConfig(prev => ({ ...prev, use_adaptive_binning: e.target.checked }))}
                      />
                      <div className="flag-text">
                        <span className="flag-title">Adaptive Binning</span>
                        <span className="flag-help">Dynamic bin size based on X-range</span>
                      </div>
                    </label>
                    <label className="flag-item">
                      <input
                        type="checkbox"
                        checked={!!config.use_auto_color}
                        onChange={(e) => setConfig(prev => ({ ...prev, use_auto_color: e.target.checked }))}
                      />
                      <div className="flag-text">
                        <span className="flag-title">Auto-Color Fallback</span>
                        <span className="flag-help">Cluster colors automatically if selected colors fail</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Detected Colors</label>
                  <div className="color-selection">
                    {detectedColors.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        className="color-checkbox"
                        onClick={() => {
                          setSelectedColors(prev => prev.includes(color.name) ? prev.filter(c => c !== color.name) : [...prev, color.name]);
                        }}
                        aria-pressed={selectedColors.includes(color.name)}
                        title={color.display_name || color.name}
                        style={{
                          outline: selectedColors.includes(color.name) ? '2px solid hsl(var(--primary))' : 'none'
                        }}
                      >
                        <span className="color-swatch" style={{ backgroundColor: color.color }} />
                        <span>{color.display_name || color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="extract-button-section">
                  {activeTab === 'llm' ? (
                    <button 
                      onClick={handleLLMExtract}
                      className="btn btn-primary extract-btn"
                      disabled={llmProcessing || !imageData}
                      title="Extract with AI"
                    >
                      {llmProcessing ? '⏳' : '🤖'}
                    </button>
                  ) : activeTab === 'queue' ? (
                    <div className="queue-actions">
                      <button 
                        onClick={loadQueueJobs}
                        className="btn btn-secondary"
                        disabled={queueLoading}
                        title="Refresh Queue"
                      >
                        {queueLoading ? '⏳' : '🔄'}
                      </button>
                      <button 
                        onClick={selectAllJobs}
                        className="btn btn-secondary"
                        disabled={queueJobs.length === 0}
                        title="Select All"
                      >
                        📋
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleExtract}
                      className="btn btn-primary extract-btn"
                      disabled={extracting || !imageData}
                    >
                      {extracting ? '⏳' : '📊'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {getCurrentResult() && (
          <div className="full-graph-section card">
            <div className="full-graph-header">
              <h3>Full-Size Graph View</h3>
              <div className="download-buttons">
                <button 
                  onClick={downloadCSV}
                  className="btn btn-secondary download-csv-btn"
                  title="Download extracted data as CSV"
                >
                  📊 Download CSV
                </button>
                <button 
                  onClick={downloadExcel}
                  className="btn btn-secondary download-excel-btn"
                  title="Download extracted data as Excel"
                >
                  📈 Download Excel
                </button>
              </div>
            </div>
            {getCurrentResult()!.plotImage ? (
              <div className="matplotlib-plot-container">
                <img 
                  src={`data:image/png;base64,${getCurrentResult()!.plotImage}`}
                  alt="Extracted Graph Data"
                  style={{
                    width: '100%',
                    maxWidth: '1200px',
                    height: 'auto',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
            ) : (
              <div className="fallback-graph">
                <p>No plot image available. Using fallback visualization:</p>
                <EnhancedGraphViewer
                  curves={getCurrentResult()!.curves}
                  config={config}
                  title=""
                  width={1200}
                  height={1200}
                  showGrid={true}
                  showLegend={true}
                  showAxisLabels={true}
                  showTitle={false}
                />
              </div>
            )}
          </div>
        )}

        {/* Custom Graph Type Modal */}
        <CustomGraphTypeModal
          isOpen={showCustomGraphTypeModal}
          onClose={() => setShowCustomGraphTypeModal(false)}
          onSave={handleSaveCustomGraphType}
          onDelete={handleDeleteCustomGraphType}
          existingTypes={customGraphTypes}
        />
      </div>
    </div>
  );
}
