# LLM Setup Guide for Enhanced Graph Extraction

## Overview

The Enhanced Graph Extraction System uses Large Language Models (LLMs) to automatically analyze graph images and extract detailed information about axes, intervals, curve types, and more. This guide will help you set up the LLM integration.

## Supported LLM Providers

### 1. Ollama (Recommended - Local)

**Advantages:**
- Runs locally on your machine
- No API costs
- Privacy - data never leaves your system
- Fast response times
- No rate limits

**Setup Instructions:**

1. **Install Ollama:**
   - Visit [https://ollama.ai](https://ollama.ai)
   - Download and install for your operating system
   - Follow the installation instructions

2. **Start Ollama Service:**
   ```bash
   # Start the Ollama service
   ollama serve
   ```

3. **Download Required Models:**
   ```bash
   # Download Llama 3.2 (recommended)
   ollama pull llama3.2
   
   # Alternative models
   ollama pull llama3.1
   ollama pull codellama
   ```

4. **Verify Installation:**
   ```bash
   # Test if Ollama is running
   curl http://localhost:11434/api/tags
   ```

5. **Configure in Application:**
   - Open the Enhanced Graph Extraction page
   - Select "Ollama (Local)" as LLM Provider
   - Choose your preferred model (llama3.2 recommended)
   - Test with a sample image

### 2. OpenAI (Cloud-based)

**Advantages:**
- High accuracy
- Advanced vision capabilities
- No local setup required

**Setup Instructions:**

1. **Get OpenAI API Key:**
   - Visit [https://platform.openai.com](https://platform.openai.com)
   - Create an account and get an API key
   - Add billing information (required for API usage)

2. **Configure API Key:**
   - Add your API key to the application configuration
   - Set usage limits to control costs

3. **Select OpenAI in Application:**
   - Choose "OpenAI" as LLM Provider
   - Select appropriate model (GPT-4 Vision recommended)

### 3. Anthropic (Cloud-based)

**Advantages:**
- Excellent reasoning capabilities
- Good for complex analysis

**Setup Instructions:**

1. **Get Anthropic API Key:**
   - Visit [https://console.anthropic.com](https://console.anthropic.com)
   - Create an account and get an API key

2. **Configure API Key:**
   - Add your API key to the application configuration

3. **Select Anthropic in Application:**
   - Choose "Anthropic" as LLM Provider
   - Select Claude 3 Vision model

## Configuration

### Application Settings

In the Enhanced Graph Extraction page, you can configure:

1. **LLM Provider:** Choose between Ollama, OpenAI, or Anthropic
2. **Model:** Select the specific model to use
3. **Analysis Options:**
   - Auto-detect axes
   - Auto-detect intervals
   - Use LLM analysis (enable/disable)

### Advanced Configuration

You can also configure the system programmatically:

```typescript
import EnhancedGraphExtractionService from '../services/enhancedGraphExtractionService';

const service = EnhancedGraphExtractionService.getInstance();

// Configure LLM settings
const config = {
  useLLMAnalysis: true,
  llmProvider: 'ollama', // 'ollama', 'openai', 'anthropic'
  llmModel: 'llama3.2',
  autoDetectAxes: true,
  autoDetectIntervals: true
};

// Process image with LLM analysis
const result = await service.extractGraphWithLLM(imageData, config);
```

## Testing the LLM Integration

### 1. Basic Test

1. **Upload a Test Image:**
   - Go to the Enhanced Graph Extraction page
   - Upload a semiconductor datasheet graph image
   - Select "Ollama (Local)" as provider
   - Click "Process with LLM"

2. **Check Results:**
   - Verify LLM analysis appears in results
   - Check that axes are detected correctly
   - Confirm curve information is extracted

### 2. Advanced Testing

1. **Test Different Graph Types:**
   - Output characteristics graphs
   - Transfer characteristics graphs
   - Capacitance vs voltage graphs
   - Resistance vs temperature graphs

2. **Test Different Models:**
   - Try different Ollama models
   - Compare results between models
   - Test cloud providers if available

## Troubleshooting

### Common Issues

#### 1. Ollama Connection Failed

**Symptoms:**
- "LLM provider 'ollama' not found" error
- Connection timeout errors

**Solutions:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve

# Check if model is downloaded
ollama list

# Download model if missing
ollama pull llama3.2
```

#### 2. Model Not Found

**Symptoms:**
- "Model not found" errors
- Processing fails immediately

**Solutions:**
```bash
# List available models
ollama list

# Download required model
ollama pull llama3.2

# Verify model is available
ollama show llama3.2
```

#### 3. Slow Processing

**Symptoms:**
- Long processing times
- Timeout errors

**Solutions:**
- Use a smaller/faster model (llama3.1 instead of llama3.2)
- Reduce image size before processing
- Check system resources (CPU, RAM)
- Consider using cloud providers for faster processing

#### 4. Poor Analysis Results

**Symptoms:**
- Incorrect axis detection
- Wrong graph type classification
- Low confidence scores

**Solutions:**
- Try different models
- Ensure image quality is good
- Check if graph is clearly visible
- Verify image format is supported

### Performance Optimization

#### 1. Local Processing (Ollama)

**Hardware Requirements:**
- **Minimum:** 8GB RAM, 4 CPU cores
- **Recommended:** 16GB RAM, 8 CPU cores
- **GPU:** Optional but recommended for faster processing

**Optimization Tips:**
```bash
# Use GPU acceleration if available
ollama run llama3.2 --gpu

# Monitor resource usage
htop  # or Task Manager on Windows

# Close unnecessary applications
# Ensure adequate free RAM
```

#### 2. Cloud Processing (OpenAI/Anthropic)

**Optimization Tips:**
- Set appropriate timeout values
- Implement retry logic for failed requests
- Cache results for similar images
- Monitor API usage and costs

## Security Considerations

### Local Processing (Ollama)

**Advantages:**
- Data never leaves your system
- No internet connection required
- Complete privacy

**Considerations:**
- Ensure Ollama is from trusted source
- Keep models updated
- Monitor local resource usage

### Cloud Processing (OpenAI/Anthropic)

**Considerations:**
- Data is sent to external servers
- API keys should be kept secure
- Monitor data usage and costs
- Consider data privacy implications

## Cost Analysis

### Ollama (Local)
- **Setup Cost:** Free
- **Per-Use Cost:** Free
- **Hardware Cost:** May require additional RAM/GPU
- **Total Cost:** Hardware investment only

### OpenAI
- **Setup Cost:** Free
- **Per-Use Cost:** ~$0.01-0.10 per image
- **Monthly Cost:** $10-100 depending on usage
- **Total Cost:** Pay-per-use model

### Anthropic
- **Setup Cost:** Free
- **Per-Use Cost:** ~$0.02-0.15 per image
- **Monthly Cost:** $20-150 depending on usage
- **Total Cost:** Pay-per-use model

## Best Practices

### 1. Model Selection

**For High Accuracy:**
- Use llama3.2 or GPT-4 Vision
- Ensure good image quality
- Use appropriate image formats

**For Speed:**
- Use llama3.1 or smaller models
- Reduce image resolution
- Use local processing

**For Cost Efficiency:**
- Use Ollama for local processing
- Batch process multiple images
- Cache results when possible

### 2. Image Preparation

**Optimal Image Characteristics:**
- High resolution (at least 800x600)
- Clear, readable text
- Good contrast
- Minimal noise or artifacts
- Supported formats: PNG, JPG, JPEG

**Preprocessing Tips:**
- Crop to graph area only
- Enhance contrast if needed
- Remove unnecessary elements
- Ensure axes labels are readable

### 3. Error Handling

**Implement Robust Error Handling:**
```typescript
try {
  const result = await service.extractGraphWithLLM(imageData, config);
  // Process successful result
} catch (error) {
  if (error.message.includes('connection')) {
    // Handle connection errors
    console.log('LLM service unavailable, using fallback');
  } else if (error.message.includes('timeout')) {
    // Handle timeout errors
    console.log('Processing timeout, retrying...');
  } else {
    // Handle other errors
    console.error('Processing failed:', error);
  }
}
```

## Support and Resources

### Documentation
- [Ollama Documentation](https://ollama.ai/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com)

### Community Support
- [Ollama GitHub](https://github.com/ollama/ollama)
- [OpenAI Community](https://community.openai.com)
- [Anthropic Community](https://community.anthropic.com)

### Troubleshooting Resources
- Check application logs for detailed error messages
- Monitor system resources during processing
- Test with simple images first
- Verify network connectivity for cloud providers

## Conclusion

The LLM integration provides powerful capabilities for automatic graph analysis. Start with Ollama for local processing, and consider cloud providers for higher accuracy or when local resources are limited. Follow the troubleshooting guide for common issues, and implement proper error handling for production use. 