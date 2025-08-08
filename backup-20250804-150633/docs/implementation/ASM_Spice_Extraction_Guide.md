# ASM-HEMT Spice Parameter Extraction Guide

## Overview

The ASM (Advanced SPICE Model) extraction system allows you to automatically extract SPICE model parameters for GaN HEMT devices from various types of measurement data. This guide explains what data is required and how to use the extraction functionality.

## What is ASM-HEMT?

ASM-HEMT (Advanced SPICE Model for High Electron Mobility Transistors) is a comprehensive SPICE model specifically designed for GaN devices. It provides accurate modeling of:

- DC characteristics (I-V curves)
- AC characteristics (capacitance)
- Temperature dependence
- Self-heating effects
- Trapping effects
- Access region resistance

## Required Data Types

The extraction system can work with the following data types. You need at least one type to begin extraction:

### 1. Output Characteristics Data
**Purpose**: Extract RD0 (drain resistance) and MEXP (exponent) parameters

**Required Columns**:
- `vds`: Drain-source voltage (V)
- `id`: Drain current (A)
- `vgs`: Gate-source voltage (V)

**Example CSV Format**:
```csv
vds,id,vgs
0.1,0.001,1.0
0.2,0.002,1.0
0.5,0.005,1.0
0.1,0.002,2.0
0.2,0.004,2.0
0.5,0.010,2.0
```

**What it extracts**:
- `RD0`: Drain resistance at VDS=0
- `MEXP`: Exponent for output resistance model

### 2. RDS vs VGS Temperature Data
**Purpose**: Extract temperature dependence parameters (UTE, UTES, UTED)

**Required Columns**:
- `vgs`: Gate-source voltage (V)
- `rds`: Drain-source resistance (Ω)
- `temp`: Temperature (°C)

**Example CSV Format**:
```csv
vgs,rds,temp
1.0,0.15,25
2.0,0.12,25
3.0,0.10,25
1.0,0.18,125
2.0,0.15,125
3.0,0.13,125
```

**What it extracts**:
- `UTE`: Channel mobility temperature coefficient
- `UTES`: Source access mobility temperature coefficient
- `UTED`: Drain access mobility temperature coefficient

### 3. RDS vs VGS at Constant ID
**Purpose**: Extract RDS(on) and VGS dependence parameters

**Required Columns**:
- `vgs`: Gate-source voltage (V)
- `rds`: Drain-source resistance (Ω)

**Example CSV Format**:
```csv
vgs,rds
1.0,0.15
2.0,0.12
3.0,0.10
4.0,0.09
5.0,0.08
```

**What it extracts**:
- `RDS_ON`: On-resistance at VGS=5V
- `VGS_DEPENDENCE`: Quadratic coefficients (a, b, c) for RDS = a*VGS² + b*VGS + c

### 4. Capacitance Data
**Purpose**: Extract capacitance parameters (CGSO, CGDO, CDSO)

**Required Columns**:
- `vds`: Drain-source voltage (V)
- `c`: Capacitance value (pF)
- `type`: Capacitance type ('ciss', 'coss', or 'crss')

**Example CSV Format**:
```csv
vds,c,type
0.1,1000,ciss
0.5,800,ciss
1.0,600,ciss
0.1,500,coss
0.5,300,coss
1.0,200,coss
0.1,50,crss
0.5,30,crss
1.0,20,crss
```

**What it extracts**:
- `CGSO`: Gate-source overlap capacitance
- `CGDO`: Gate-drain overlap capacitance
- `CDSO`: Drain-source capacitance
- `KCAP_CGSO`, `KCAP_CGDO`, `KCAP_CDSO`: Voltage dependence coefficients

### 5. Transfer Characteristics
**Purpose**: Extract threshold voltage and transconductance parameters

**Required Columns**:
- `vgs`: Gate-source voltage (V)
- `id`: Drain current (A)
- `temp`: Temperature (°C)

**Example CSV Format**:
```csv
vgs,id,temp
1.0,0.001,25
2.0,0.010,25
3.0,0.050,25
1.0,0.002,125
2.0,0.020,125
3.0,0.100,125
```

**What it extracts**:
- `VOFF`: Threshold voltage
- `VSE`: Subthreshold slope exponent
- `KP_25C`: Transconductance at 25°C
- `KP_125C`: Transconductance at 125°C
- `UTE`: Temperature coefficient

### 6. Thermal Resistance Data
**Purpose**: Extract thermal resistance parameter (RTH0)

**Required Columns**:
- `temp`: Temperature (°C)
- `rds`: Drain-source resistance (Ω)

**Example CSV Format**:
```csv
temp,rds
25,0.10
50,0.12
75,0.14
100,0.16
125,0.18
```

**What it extracts**:
- `RTH0`: Thermal resistance (°C/W)

### 7. VTH vs Temperature
**Purpose**: Extract threshold voltage temperature dependence

**Required Columns**:
- `temp`: Temperature (°C)
- `vth`: Threshold voltage (V)

**Example CSV Format**:
```csv
temp,vth
25,-2.72
50,-2.75
75,-2.78
100,-2.81
125,-2.84
```

**What it extracts**:
- `VOFF0`: Threshold voltage at 25°C
- `KVTO`: Threshold voltage temperature coefficient

## How to Use the Extraction System

### Step 1: Prepare Your Data
1. **Collect measurement data** from your device characterization
2. **Format as CSV** with the required columns
3. **Ensure data quality** - remove outliers and invalid measurements
4. **Include multiple data points** for better fitting accuracy

### Step 2: Upload or Input Data
1. **Open the ASM Extraction Panel** in the ESpice application
2. **Choose data type** from the available options
3. **Upload CSV file** or paste data directly
4. **Verify data format** matches the required columns

### Step 3: Run Extraction
1. **Click "Extract Parameters"** to start the analysis
2. **Monitor progress** - extraction may take a few seconds
3. **Review results** - check confidence score and warnings
4. **Validate parameters** - ensure extracted values are reasonable

### Step 4: Export SPICE Model
1. **Review extracted parameters** in the results tab
2. **Check confidence score** - higher is better
3. **Export SPICE model** for use in circuit simulation
4. **Save parameters** to your project for future reference

## Data Quality Guidelines

### Minimum Data Requirements
- **At least 5 data points** per curve for reliable fitting
- **Multiple VGS values** for output characteristics (recommended: 3-5 values)
- **Temperature range** for thermal analysis (recommended: 25°C to 125°C)
- **Voltage range** covering device operation (recommended: 0V to maximum VDS)

### Data Validation
- **Check units** - ensure consistent units throughout
- **Remove outliers** - eliminate obviously incorrect measurements
- **Verify ranges** - ensure data covers expected device operation
- **Check consistency** - similar devices should have similar parameter ranges

### Common Issues and Solutions

#### Low Confidence Scores
- **Add more data points** - more data improves fitting accuracy
- **Include multiple data types** - combining different measurements improves overall confidence
- **Check data quality** - remove outliers and invalid measurements
- **Verify data format** - ensure correct column names and units

#### Fitting Failures
- **Insufficient data points** - need at least 3 points for curve fitting
- **Invalid data ranges** - ensure data covers appropriate voltage/current ranges
- **Missing required columns** - check that all required columns are present
- **Data format errors** - verify CSV format and column names

#### Unreasonable Parameters
- **Check units** - ensure consistent units (V, A, Ω, °C)
- **Verify data ranges** - parameters should be within expected ranges
- **Review device specifications** - compare with datasheet values
- **Check for data errors** - look for measurement or formatting errors

## Expected Parameter Ranges

### Typical ASM-HEMT Parameters
| Parameter | Typical Range | Units | Description |
|-----------|---------------|-------|-------------|
| VOFF | -5 to 0 | V | Threshold voltage |
| VSE | 1.5 to 3.0 | - | Subthreshold slope exponent |
| KP | 0.1 to 10 | A/V^VSE | Transconductance parameter |
| UTE | -2 to 0 | - | Temperature coefficient |
| RDS_ON | 0.01 to 1 | Ω | On-resistance |
| CGSO | 1e-12 to 1e-9 | F | Gate-source capacitance |
| CGDO | 1e-12 to 1e-9 | F | Gate-drain capacitance |
| RTH0 | 1 to 50 | °C/W | Thermal resistance |

### Parameter Dependencies
- **VOFF** affects threshold voltage and subthreshold behavior
- **VSE** controls subthreshold slope and turn-on characteristics
- **KP** determines transconductance and current drive capability
- **UTE** models temperature dependence of mobility
- **RDS_ON** affects on-state resistance and power dissipation
- **Capacitances** affect switching speed and AC performance
- **RTH0** models self-heating effects

## Integration with ESpice

### Workflow Integration
1. **Upload datasheet** - extract basic parameters from datasheet
2. **Add measurement data** - supplement with detailed characterization data
3. **Run ASM extraction** - generate comprehensive SPICE model
4. **Validate model** - compare with datasheet and measurement data
5. **Export for simulation** - use in circuit simulation tools

### Parameter Management
- **Store extracted parameters** in the ESpice database
- **Version control** - track parameter changes over time
- **Parameter validation** - compare with datasheet specifications
- **Model comparison** - compare different extraction runs

### Export Options
- **LTSpice format** - compatible with LTSpice simulator
- **KiCad format** - compatible with KiCad EDA
- **Generic SPICE** - standard SPICE format
- **Parameter report** - detailed extraction results

## Troubleshooting

### Common Error Messages
- **"Missing required columns"** - Check CSV format and column names
- **"Insufficient data points"** - Add more measurement data
- **"Fitting failed"** - Check data quality and ranges
- **"Invalid data format"** - Verify CSV structure and units

### Performance Tips
- **Use multiple data types** - improves overall extraction accuracy
- **Include temperature data** - enables thermal modeling
- **Provide wide voltage ranges** - improves parameter fitting
- **Clean data first** - remove outliers and invalid measurements

### Getting Help
- **Check documentation** - review this guide and other ESpice docs
- **Validate data format** - ensure CSV structure matches requirements
- **Review parameter ranges** - compare with expected values
- **Contact support** - for technical issues or questions

## Advanced Features

### Batch Processing
- **Process multiple devices** - extract parameters for device families
- **Parameter comparison** - compare parameters across devices
- **Statistical analysis** - analyze parameter distributions
- **Quality assessment** - evaluate extraction confidence

### Model Validation
- **Compare with datasheet** - validate against manufacturer specifications
- **Cross-validation** - compare different extraction methods
- **Parameter sensitivity** - analyze parameter impact on model accuracy
- **Error analysis** - identify sources of extraction errors

### Custom Extensions
- **Parameter mapping** - customize parameter extraction algorithms
- **Data preprocessing** - add custom data cleaning steps
- **Validation rules** - define custom parameter validation criteria
- **Export formats** - add support for additional simulation tools

This guide provides comprehensive information for using the ASM spice extraction functionality. For additional support or questions, refer to the ESpice documentation or contact the development team. 