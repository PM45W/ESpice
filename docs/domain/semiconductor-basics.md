# Semiconductor Domain Knowledge

## GaN (Gallium Nitride) Devices

### Key Parameters for SPICE Models
- **VTH**: Threshold Voltage
- **RDS(on)**: On-resistance
- **IDSS**: Drain-source saturation current
- **BVDSS**: Drain-source breakdown voltage
- **Ciss, Coss, Crss**: Input, output, reverse transfer capacitance
- **QG**: Total gate charge
- **tON, tOFF**: Switching times

### Common SPICE Model Types
1. **Level 1 MOSFET**: Basic model
2. **BSIM3**: Industry standard
3. **GaN-HEMT**: Specialized for GaN devices
4. **MVSG**: Multi-voltage multi-segment model

### Typical Datasheet Sections
- Electrical Characteristics tables
- I-V characteristic curves
- Capacitance vs Voltage graphs
- Safe Operating Area (SOA) plots
- Thermal characteristics

### Data Extraction Targets
- Parameter tables (min/typ/max values)
- Graph curves (extract points for modeling)
- Operating conditions and test conditions
- Package information and pinout

#### Diodes
- IS: Saturation current
- N: Emission coefficient
- RS: Series resistance
- CJO: Zero-bias junction capacitance
- TT: Transit time
- BV: Breakdown voltage
- IBV: Current at breakdown voltage

#### Bipolar Junction Transistors (BJTs)
- IS: Transport saturation current
- BF: Forward current gain
- BR: Reverse current gain
- NF: Forward emission coefficient
- NR: Reverse emission coefficient
- VAF: Forward Early voltage
- VAR: Reverse Early voltage
- RB, RC, RE: Base, collector, emitter resistances
- CJE, CJC: Junction capacitances

#### Metal-Oxide-Semiconductor Field-Effect Transistors (MOSFETs)
- VTO: Threshold voltage
- KP: Transconductance parameter
- GAMMA: Body effect parameter
- PHI: Surface potential
- LAMBDA: Channel length modulation
- TOX: Oxide thickness
- NSUB: Substrate doping
- UO: Mobility

### Common SPICE Model Types
- Diodes: Standard SPICE diode model, Schottky diode model
- BJTs: Gummel-Poon model, Ebers-Moll model
- MOSFETs: Level 1, Level 2, Level 3, BSIM3, BSIM4, etc.

### Typical Datasheet Sections
- Absolute maximum ratings
- Electrical characteristics (DC and AC)
- Thermal characteristics
- Package information
- Characteristic curves (e.g., I-V curves, capacitance vs. voltage)

### Data Extraction Targets
- Parameter tables (min/typ/max values)
- Graph curves (extract points for modeling)
- Operating conditions and test conditions
- Package information and pinout

### Parameter Extraction from Datasheets
1. Identify relevant curves and tables.
2. Extract key points from I-V and capacitance curves.
3. Use specified values from tables.
4. Fit models to data using curve-fitting techniques.