// ESpice Interactive Architecture Map
class ArchitectureMap {
    constructor() {
        this.currentView = 'overview';
        this.selectedNode = null;
        this.nodes = {};
        this.connections = {};
        this.mapContainer = document.getElementById('architectureMap');
        this.detailsPanel = document.getElementById('nodeDetails');
        this.nodeTitle = document.getElementById('nodeTitle');
        this.nodeContent = document.getElementById('nodeContent');
        
        this.initializeMap();
        this.bindEvents();
    }

    initializeMap() {
        this.createNodes();
        this.createConnections();
        this.renderView('overview');
    }

    createNodes() {
        // Overview level nodes
        this.nodes = {
            frontend: {
                id: 'frontend',
                title: 'Frontend',
                subtitle: 'React + Tauri',
                icon: '🖥️',
                type: 'frontend',
                x: 100,
                y: 150,
                description: 'User interface built with React 18 and Tauri for cross-platform desktop applications.',
                details: {
                    'Components': [
                        'PDF Viewer with annotation tools',
                        'File upload and processing interface',
                        'Parameter table and editing',
                        'Model generation workflow',
                        'Batch processing interface'
                    ],
                    'Technologies': [
                        'React 18 with TypeScript',
                        'Tauri for native desktop integration',
                        'CSS with design system',
                        'PDF.js for document viewing',
                        'React Dropzone for file uploads'
                    ],
                    'Features': [
                        'Drag-and-drop file upload',
                        'Real-time processing feedback',
                        'Interactive parameter editing',
                        'Responsive design',
                        'Cross-platform compatibility'
                    ]
                }
            },
            backend: {
                id: 'backend',
                title: 'Backend',
                subtitle: 'Rust + Python',
                icon: '⚙️',
                type: 'backend',
                x: 300,
                y: 150,
                description: 'Core processing engine built with Rust for performance and Python for AI/ML capabilities.',
                details: {
                    'Services': [
                        'PDF parsing and text extraction',
                        'Image processing and curve extraction',
                        'Parameter validation and mapping',
                        'SPICE model generation',
                        'Database management'
                    ],
                    'Technologies': [
                        'Rust for high-performance processing',
                        'Python for AI/ML algorithms',
                        'OpenCV for image processing',
                        'SQLite for local data storage',
                        'Prisma for database ORM'
                    ],
                    'Performance': [
                        'Native performance with Rust',
                        'Parallel processing capabilities',
                        'Memory-efficient operations',
                        'Fast file I/O operations',
                        'Optimized algorithms'
                    ]
                }
            },
            mcp: {
                id: 'mcp',
                title: 'MCP Server',
                subtitle: 'AI Orchestration',
                icon: '🤖',
                type: 'mcp',
                x: 500,
                y: 150,
                description: 'Model Context Protocol server for AI agent orchestration and tool management.',
                details: {
                    'Tools': [
                        'PDF Processing Tool',
                        'Image Processing Tool',
                        'SPICE Generation Tool',
                        'Parameter Validation Tool',
                        'Model Export Tool'
                    ],
                    'Capabilities': [
                        'AI agent communication',
                        'Tool registration and discovery',
                        'Request routing and validation',
                        'Response streaming',
                        'Error handling and logging'
                    ],
                    'Integration': [
                        'OpenAI GPT integration',
                        'Local AI model support',
                        'Custom tool development',
                        'Plugin architecture',
                        'Extensible framework'
                    ]
                }
            },
            services: {
                id: 'services',
                title: 'Microservices',
                subtitle: 'Distributed System',
                icon: '🔗',
                type: 'backend',
                x: 200,
                y: 300,
                description: 'Distributed microservices architecture for scalable processing and deployment.',
                details: {
                    'Core Services': [
                        'PDF Service (Port 8002)',
                        'Image Service (Port 8003)',
                        'Table Service (Port 8004)',
                        'SPICE Service (Port 8005)',
                        'API Gateway (Port 8000)'
                    ],
                    'Supporting Services': [
                        'Authentication Service',
                        'Notification Service',
                        'Monitoring Service',
                        'Data Analytics Service',
                        'Backup & Recovery Service'
                    ],
                    'Infrastructure': [
                        'Docker containerization',
                        'Kubernetes orchestration',
                        'Load balancing',
                        'Service discovery',
                        'Health monitoring'
                    ]
                }
            },
            database: {
                id: 'database',
                title: 'Database',
                subtitle: 'SQLite + Redis',
                icon: '💾',
                type: 'data',
                x: 400,
                y: 300,
                description: 'Data storage layer with SQLite for persistent data and Redis for caching.',
                details: {
                    'Data Models': [
                        'Products and device information',
                        'Parameters and extracted data',
                        'SPICE models and templates',
                        'User preferences and settings',
                        'Processing history and logs'
                    ],
                    'Storage Strategy': [
                        'SQLite for local persistence',
                        'Redis for performance caching',
                        'File-based model storage',
                        'Backup and recovery',
                        'Data migration tools'
                    ],
                    'Performance': [
                        'Fast local queries',
                        'Cached frequently accessed data',
                        'Optimized indexes',
                        'Connection pooling',
                        'Query optimization'
                    ]
                }
            },
            external: {
                id: 'external',
                title: 'External APIs',
                subtitle: 'Foundry Integration',
                icon: '🌐',
                type: 'external',
                x: 600,
                y: 300,
                description: 'Integration with external foundry services and EDA tools.',
                details: {
                    'Foundry Support': [
                        'TSMC PDK compatibility',
                        'GlobalFoundries support',
                        'Samsung Foundry integration',
                        'UMC process support',
                        'SMIC technology nodes'
                    ],
                    'EDA Tools': [
                        'LTSpice export format',
                        'KiCad integration',
                        'ADS compatibility',
                        'HSPICE support',
                        'Custom format export'
                    ],
                    'Validation': [
                        'Foundry rule checking',
                        'Model validation',
                        'Performance verification',
                        'Compatibility testing',
                        'Quality assurance'
                    ]
                }
            }
        };

        // Detailed view nodes (microservices)
        this.detailedNodes = {
            pdfService: {
                id: 'pdfService',
                title: 'PDF Service',
                subtitle: 'Port 8002',
                icon: '📄',
                type: 'backend',
                x: 150,
                y: 200,
                parent: 'services',
                description: 'Specialized service for PDF processing and text extraction.',
                details: {
                    'Features': [
                        'Text extraction with OCR',
                        'Table detection and parsing',
                        'Image extraction from PDFs',
                        'Metadata extraction',
                        'Quality validation'
                    ],
                    'Technologies': [
                        'pdf-parse library',
                        'Tesseract OCR',
                        'OpenCV for image processing',
                        'FastAPI framework',
                        'Async processing'
                    ]
                }
            },
            imageService: {
                id: 'imageService',
                title: 'Image Service',
                subtitle: 'Port 8003',
                icon: '🖼️',
                type: 'backend',
                x: 250,
                y: 200,
                parent: 'services',
                description: 'Image processing service for curve extraction and graph analysis.',
                details: {
                    'Features': [
                        'Color detection in images',
                        'Curve extraction from graphs',
                        'Graph type classification',
                        'Data point extraction',
                        'Quality assessment'
                    ],
                    'Technologies': [
                        'OpenCV for image processing',
                        'NumPy for data manipulation',
                        'D3.js for scaling',
                        'Color detection algorithms',
                        'Curve fitting algorithms'
                    ]
                }
            },
            tableService: {
                id: 'tableService',
                title: 'Table Service',
                subtitle: 'Port 8004',
                icon: '📊',
                type: 'backend',
                x: 350,
                y: 200,
                parent: 'services',
                description: 'Table data extraction and parameter validation service.',
                details: {
                    'Features': [
                        'Structured data extraction',
                        'Parameter validation',
                        'SPICE formatting',
                        'Cross-referencing',
                        'Data cleaning'
                    ],
                    'Technologies': [
                        'Pandas for data processing',
                        'Regular expressions',
                        'Validation algorithms',
                        'Data transformation',
                        'Confidence scoring'
                    ]
                }
            },
            spiceService: {
                id: 'spiceService',
                title: 'SPICE Service',
                subtitle: 'Port 8005',
                icon: '⚡',
                type: 'backend',
                x: 450,
                y: 200,
                parent: 'services',
                description: 'SPICE model generation and validation service.',
                details: {
                    'Features': [
                        'Model generation',
                        'Parameter fitting',
                        'Syntax validation',
                        'Format export',
                        'Foundry compatibility'
                    ],
                    'Technologies': [
                        'SPICE model templates',
                        'Parameter optimization',
                        'Validation engines',
                        'Export formatters',
                        'Foundry rule checking'
                    ]
                }
            }
        };
    }

    createConnections() {
        this.connections = {
            frontend_backend: {
                from: 'frontend',
                to: 'backend',
                type: 'data',
                label: 'File Upload & Results'
            },
            backend_mcp: {
                from: 'backend',
                to: 'mcp',
                type: 'control',
                label: 'AI Processing'
            },
            mcp_services: {
                from: 'mcp',
                to: 'services',
                type: 'orchestration',
                label: 'Tool Execution'
            },
            services_database: {
                from: 'services',
                to: 'database',
                type: 'storage',
                label: 'Data Persistence'
            },
            services_external: {
                from: 'services',
                to: 'external',
                type: 'integration',
                label: 'Foundry APIs'
            },
            frontend_database: {
                from: 'frontend',
                to: 'database',
                type: 'query',
                label: 'Data Retrieval'
            }
        };
    }

    renderView(view) {
        this.currentView = view;
        this.clearMap();
        
        switch(view) {
            case 'overview':
                this.renderOverview();
                break;
            case 'detailed':
                this.renderDetailed();
                break;
            case 'dataflow':
                this.renderDataFlow();
                break;
            case 'services':
                this.renderServices();
                break;
            case 'mcp':
                this.renderMCP();
                break;
        }
        
        this.renderConnections();
        this.updateControlButtons();
    }

    renderOverview() {
        const overviewNodes = ['frontend', 'backend', 'mcp', 'services', 'database', 'external'];
        overviewNodes.forEach(nodeId => {
            this.createNodeElement(this.nodes[nodeId]);
        });
    }

    renderDetailed() {
        // Show all nodes including detailed microservices
        Object.values(this.nodes).forEach(node => {
            this.createNodeElement(node);
        });
        
        Object.values(this.detailedNodes).forEach(node => {
            this.createNodeElement(node);
        });
    }

    renderDataFlow() {
        // Focus on data flow with highlighted connections
        this.renderOverview();
        this.highlightDataFlow();
    }

    renderServices() {
        // Focus on microservices architecture
        Object.values(this.detailedNodes).forEach(node => {
            this.createNodeElement(node);
        });
        
        // Add service connections
        this.createServiceConnections();
    }

    renderMCP() {
        // Focus on MCP tools and AI integration
        this.createNodeElement(this.nodes.mcp);
        this.createMCPTools();
    }

    createMCPTools() {
        // Create MCP tool nodes
        const mcpTools = [
            {
                id: 'pdfTool',
                title: 'PDF Tool',
                subtitle: 'Document Processing',
                icon: '📄',
                type: 'mcp',
                x: 450,
                y: 250,
                description: 'PDF processing tool for text extraction and table detection.',
                details: {
                    'Capabilities': [
                        'Text extraction with OCR',
                        'Table detection and parsing',
                        'Image extraction',
                        'Metadata extraction',
                        'Quality validation'
                    ]
                }
            },
            {
                id: 'imageTool',
                title: 'Image Tool',
                subtitle: 'Curve Extraction',
                icon: '🖼️',
                type: 'mcp',
                x: 550,
                y: 250,
                description: 'Image processing tool for curve extraction and graph analysis.',
                details: {
                    'Capabilities': [
                        'Color detection',
                        'Curve extraction',
                        'Data point extraction',
                        'Graph classification',
                        'Quality assessment'
                    ]
                }
            },
            {
                id: 'spiceTool',
                title: 'SPICE Tool',
                subtitle: 'Model Generation',
                icon: '⚡',
                type: 'mcp',
                x: 650,
                y: 250,
                description: 'SPICE model generation tool with parameter fitting.',
                details: {
                    'Capabilities': [
                        'Model generation',
                        'Parameter fitting',
                        'Validation',
                        'Export formatting',
                        'Foundry compatibility'
                    ]
                }
            }
        ];
        
        mcpTools.forEach(tool => {
            this.createNodeElement(tool);
        });
    }

    highlightDataFlow() {
        // Highlight data flow connections
        const dataFlowConnections = ['frontend_backend', 'backend_mcp', 'mcp_services'];
        dataFlowConnections.forEach(connId => {
            const connectionEl = document.getElementById(`connection-${connId}`);
            if (connectionEl) {
                connectionEl.classList.add('highlighted');
            }
        });
    }

    createServiceConnections() {
        // Create connections between microservices
        const serviceConnections = [
            { from: 'pdfService', to: 'tableService', type: 'data' },
            { from: 'imageService', to: 'spiceService', type: 'data' },
            { from: 'tableService', to: 'spiceService', type: 'data' }
        ];
        
        serviceConnections.forEach((conn, index) => {
            const connectionEl = document.createElement('div');
            connectionEl.className = 'connection';
            connectionEl.id = `service-connection-${index}`;
            
            const fromNode = this.detailedNodes[conn.from];
            const toNode = this.detailedNodes[conn.to];
            
            if (fromNode && toNode) {
                const fromX = fromNode.x + 60;
                const fromY = fromNode.y + 40;
                const toX = toNode.x + 60;
                const toY = toNode.y + 40;
                
                const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
                const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
                
                connectionEl.style.left = `${fromX}px`;
                connectionEl.style.top = `${fromY}px`;
                connectionEl.style.width = `${length}px`;
                connectionEl.style.transform = `rotate(${angle}deg)`;
                
                this.mapContainer.appendChild(connectionEl);
            }
        });
    }

    createNodeElement(nodeData) {
        const node = document.createElement('div');
        node.className = `arch-node ${nodeData.type}`;
        node.id = `node-${nodeData.id}`;
        node.style.left = `${nodeData.x}px`;
        node.style.top = `${nodeData.y}px`;
        
        node.innerHTML = `
            <span class="node-icon">${nodeData.icon}</span>
            <div class="node-title">${nodeData.title}</div>
            <div class="node-subtitle">${nodeData.subtitle}</div>
            <div class="node-ports">
                <span class="node-port">in</span>
                <span class="node-port">out</span>
            </div>
        `;
        
        node.addEventListener('click', () => this.selectNode(nodeData));
        node.addEventListener('mouseenter', () => this.highlightConnections(nodeData.id));
        node.addEventListener('mouseleave', () => this.clearHighlights());
        
        this.mapContainer.appendChild(node);
    }

    createConnections() {
        Object.entries(this.connections).forEach(([id, connection]) => {
            this.createConnectionElement(id, connection);
        });
    }

    createConnectionElement(id, connection) {
        const fromNode = this.nodes[connection.from] || this.detailedNodes[connection.from];
        const toNode = this.nodes[connection.to] || this.detailedNodes[connection.to];
        
        if (!fromNode || !toNode) return;
        
        const connectionEl = document.createElement('div');
        connectionEl.className = 'connection';
        connectionEl.id = `connection-${id}`;
        
        // Calculate connection position and angle
        const fromX = fromNode.x + 60; // Center of node
        const fromY = fromNode.y + 40;
        const toX = toNode.x + 60;
        const toY = toNode.y + 40;
        
        const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
        const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
        
        connectionEl.style.left = `${fromX}px`;
        connectionEl.style.top = `${fromY}px`;
        connectionEl.style.width = `${length}px`;
        connectionEl.style.transform = `rotate(${angle}deg)`;
        
        this.mapContainer.appendChild(connectionEl);
    }

    selectNode(nodeData) {
        // Clear previous selection
        document.querySelectorAll('.arch-node').forEach(node => {
            node.classList.remove('selected');
        });
        
        // Select new node
        const nodeElement = document.getElementById(`node-${nodeData.id}`);
        if (nodeElement) {
            nodeElement.classList.add('selected');
        }
        
        this.selectedNode = nodeData;
        this.showNodeDetails(nodeData);
    }

    showNodeDetails(nodeData) {
        this.nodeTitle.textContent = nodeData.title;
        
        let content = `
            <p>${nodeData.description}</p>
        `;
        
        if (nodeData.details) {
            Object.entries(nodeData.details).forEach(([section, items]) => {
                content += `
                    <h4>${section}</h4>
                    <ul>
                        ${items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                `;
            });
        }
        
        this.nodeContent.innerHTML = content;
        this.detailsPanel.classList.add('open');
    }

    highlightConnections(nodeId) {
        // Highlight connections related to this node
        Object.entries(this.connections).forEach(([id, connection]) => {
            if (connection.from === nodeId || connection.to === nodeId) {
                const connectionEl = document.getElementById(`connection-${id}`);
                if (connectionEl) {
                    connectionEl.classList.add('highlighted');
                }
            }
        });
    }

    clearHighlights() {
        document.querySelectorAll('.connection').forEach(conn => {
            conn.classList.remove('highlighted');
        });
    }

    clearMap() {
        this.mapContainer.innerHTML = '';
    }

    updateControlButtons() {
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-view="${this.currentView}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    bindEvents() {
        // Control button events
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.renderView(view);
            });
        });
        
        // Close details panel
        document.getElementById('closeDetails').addEventListener('click', () => {
            this.detailsPanel.classList.remove('open');
            this.selectedNode = null;
            
            // Clear selection
            document.querySelectorAll('.arch-node').forEach(node => {
                node.classList.remove('selected');
            });
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.detailsPanel.classList.remove('open');
            }
        });
    }
}

// Initialize the architecture map when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ArchitectureMap();
}); 