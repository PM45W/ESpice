import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit, minimize
from scipy.stats import linregress
from scipy.signal import savgol_filter
import tkinter as tk
from tkinter import filedialog
import sys

# Function 1: From asm_output_2.py - Fits I-V curves for different Vgs, extracts RD0 and MEXP
def extract_output_params():
    root = tk.Tk()
    root.withdraw()  # Hide the root window
    file_path = filedialog.askopenfilename(
        title="Select I-V Data CSV File",
        filetypes=[("CSV files", "*.csv")]
    )
    if not file_path:
        print("No file selected. Exiting.")
        return

    # Load CSV file
    df = pd.read_csv(file_path)

    # Preprocessing
    df["vgs"] = df["vgs"].round(4)
    df = df.sort_values(by=["vgs", "vds"])

    # Constants
    VSAT = 1  # Saturation voltage (assumed constant)
    initial_guess = [0.012, 2.0]  # RD0=12mΩ, MEXP=2

    # Model function
    def id_model(Vds, RD0, MEXP):
        return Vds / (RD0 * (1 + (Vds / VSAT) ** MEXP))

    # Fit per Vgs
    unique_vgs = df["vgs"].unique()
    results = []

    plt.figure(figsize=(10, 6))

    for vgs in unique_vgs:
        if vgs == 2.0:
            print("🔕 Skipping Vgs = 2.0 V from fitting/reporting.")
            continue

        sub_df = df[df["vgs"] == vgs]
        Vds = sub_df["vds"].values
        Id = sub_df["id"].values

        mask = (Vds > 0.01) & (Id > 0.01)
        Vds_fit = Vds[mask]
        Id_fit = Id[mask]

        if len(Vds_fit) < 3:
            print(f"⚠️ Skipping Vgs = {vgs} V due to insufficient data points.")
            continue

        try:
            popt, _ = curve_fit(id_model, Vds_fit, Id_fit, p0=initial_guess)
            RD0_fit, MEXP_fit = popt
            results.append((vgs, RD0_fit, MEXP_fit))

            Vds_smooth = np.linspace(min(Vds_fit), max(Vds_fit), 200)
            Id_smooth = id_model(Vds_smooth, RD0_fit, MEXP_fit)

            plt.plot(Vds, Id, 'o', label=f"Data Vgs={vgs}V")
            plt.plot(Vds_smooth, Id_smooth, '-', label=f"Fit Vgs={vgs}V, MEXP={MEXP_fit:.2f}")

        except RuntimeError as e:
            print(f"❌ Fit failed for Vgs = {vgs} V: {e}")

    # Plotting
    plt.xlabel("Vds (V)")
    plt.ylabel("Id (A)")
    plt.title("I-V Curve Fit with Per-Vgs RD0 and MEXP")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.show()

    # Print Individual Results
    print("\n✅ Extracted Parameters (Per Vgs):")
    for vgs, rd0, mexp in results:
        print(f"Vgs = {vgs:.4f} V -> RD0 = {rd0 * 1e3:.2f} mΩ, MEXP = {mexp:.2f}")

    # Fit MEXP(Vgs) Dependency
    results_array = np.array(results)
    vgs_vals = results_array[:, 0]
    mexp_vals = results_array[:, 2]

    def mexp_vgs_func(vgs, a, b):
        return a * vgs + b

    try:
        popt, _ = curve_fit(mexp_vgs_func, vgs_vals, mexp_vals)
        a_fit, b_fit = popt
        print(f"\n📈 Fitted MEXP(Vgs): MEXP ≈ {a_fit:.4f} * Vgs + {b_fit:.4f}")
    except RuntimeError as e:
        print(f"\n❌ Failed to fit MEXP(Vgs): {e}")

# Function 2: From asm_rds_vgs_temp.py - Extracts UTE, UTES, UTED
def extract_ute_utes_uted():
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(title="Select CSV File", filetypes=[("CSV files", "*.csv")])

    if not file_path:
        print("No file selected.")
        return

    # Define exponential model for R_DS(on) vs. V_GS (for visualization)
    def rds_model(vgs, a, b, c):
        return a * np.exp(b * vgs) + c

    # Define temperature dependence model for mobility: R_DS(on)(T) ∝ (T/298)^(-UTE)
    def mobility_temp_model(temp, rds0, ute):
        return rds0 * ((temp + 273.15) / 298.15) ** (-ute)

    # Read the CSV file
    try:
        data = pd.read_csv(file_path)
    except FileNotFoundError:
        print("Error: CSV file not found.")
        return
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return

    # Verify required columns
    required_columns = ['vgs', 'rds', 'temp']
    if not all(col in data.columns for col in required_columns):
        print("Error: CSV file must contain 'vgs', 'rds', and 'temp' columns.")
        return

    # Initialize results
    ute = None
    utes = None
    uted = None

    # Plot R_DS(on) vs. V_GS for each temperature
    plt.figure(figsize=(10, 6))
    for temp in data['temp'].unique():
        # Filter data for the current temperature
        temp_data = data[data['temp'] == temp]
        
        # Fit R_DS(on) vs. V_GS for visualization
        try:
            initial_guesses = [100, -0.1, 1]
            popt, _ = curve_fit(rds_model, temp_data['vgs'], temp_data['rds'], p0=initial_guesses, maxfev=2000)
            
            # Plot data and fit
            plt.scatter(temp_data['vgs'], temp_data['rds'], label=f'{temp}°C data')
            vgs_range = np.linspace(temp_data['vgs'].min(), temp_data['vgs'].max(), 100)
            plt.plot(vgs_range, rds_model(vgs_range, *popt), label=f'{temp}°C fit')
        except RuntimeError:
            print(f"Warning: Curve fitting failed for {temp}°C.")

    # Extract UTE: Use R_DS(on) at high V_GS (e.g., 5 V) where R_channel dominates
    vgs_high = 5.0  # Adjust based on CSV data
    high_vgs_data = data[np.abs(data['vgs'] - vgs_high) < 0.1]  # Tolerance for V_GS ≈ 5 V
    if high_vgs_data.empty:
        print(f"Error: No data found for V_GS ≈ {vgs_high} V.")
        return

    # Fit R_DS(on) vs. temperature to extract UTE
    try:
        popt, _ = curve_fit(mobility_temp_model, high_vgs_data['temp'], high_vgs_data['rds'], p0=[0.1, -0.5], maxfev=2000)
        ute = popt[1]
    except RuntimeError:
        print("Error: Failed to fit UTE.")
        ute = None

    # Estimate UTES and UTED: Assume symmetric access regions (UTES = UTED) and R_ACC contribution
    # R_ACC ∝ 1/UOACCS + 1/UOACCD, assume R_ACC ≈ 50% of R_DS(on) - (RSC + RDC) at high V_GS
    if ute is not None:
        # Approximate R_ACC as a fraction of R_DS(on) (e.g., 50%, adjust based on device)
        r_acc_fraction = 0.5
        r_acc_data = high_vgs_data.copy()
        r_acc_data['rds'] = r_acc_data['rds'] * r_acc_fraction
        try:
            popt_acc, _ = curve_fit(mobility_temp_model, r_acc_data['temp'], r_acc_data['rds'], p0=[0.05, -0.5], maxfev=2000)
            utes = uted = popt_acc[1]  # Assume symmetry for simplicity
        except RuntimeError:
            print("Warning: Failed to fit UTES/UTED.")
            utes = uted = None
    else:
        utes = uted = None

    # Finalize plot
    plt.xlabel('V_GS (V)')
    plt.ylabel('R_DS(on) (Ω)')
    plt.title('R_DS(on) vs. V_GS for Different Temperatures (EPC2040)')
    plt.legend()
    plt.grid(True)
    plt.show())

    if ute is not None:
        print(f"UTE (Channel Mobility Temperature Coefficient): {ute:.4e}")
    else:
        print("UTE could not be determined.")
    if utes is not None:
        print(f"UTES (Source Access Mobility Temperature Coefficient): {utes:.4e}")
    else:
        print("UTES could not be determined.")
    if uted is not None:
        print(f"UTED (Drain Access Mobility Temperature Coefficient): {uted:.4e}")
    else:
        print("UTED could not be determined.")

# Function 3: From asm_rds_id.py - Extracts RDS(on) and VGS dependence
def extract_rds_vgs_id():
    def load_csv(file_path):
        try:
            data = pd.read_csv(file_path)
            required_columns = ['vgs', 'rds', 'id']
            if not all(col in data.columns for col in required_columns):
                print("Error: CSV file must contain 'vgs', 'rds', and 'id' columns.")
                return None
            return data
        except FileNotFoundError:
            print("Error: CSV file not found.")
            return None
        except Exception as e:
            print(f"Error reading CSV file: {e}")
            return None

    def filter_data(data, tolerance=0.01):
        id_target = data['id'].max()
        data_id = data[abs(data['id'] - id_target) <= tolerance][['vgs', 'rds']]
        if data_id.empty:
            print(f"Error: No data found for id ≈ {id_target} A.")
            return None, None, id_target

        data_id = data_id.drop_duplicates(subset='vgs').sort_values('vgs')
        vgs = data_id['vgs'].values
        rds = data_id['rds'].values

        if len(vgs) < 3:
            print(f"Error: Insufficient data points for id ≈ {id_target} A.")
            return None, None, id_target

        return vgs, rds, id_target

    def smooth_data(vgs, rds, window_length=5, polyorder=2):
        try:
            window_length = min(window_length, len(rds) // 2 * 2 + 1)
            return savgol_filter(rds, window_length=window_length, polyorder=polyorder)
        except Exception as e:
            print(f"Warning: Smoothing failed ({e}). Using original data.")
            return rds

    def remove_outliers(vgs, rds):
        q1, q3 = np.percentile(rds, [25, 75])
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        mask = (rds >= lower_bound) & (rds <= upper_bound)
        return vgs[mask], rds[mask]

    def fit_quadratic(vgs, rds, vgs_max_fit=4.0):
        mask = vgs <= vgs_max_fit
        vgs_fit = vgs[mask]
        rds_fit = rds[mask]

        if len(vgs_fit) < 3:
            print(f"Warning: Insufficient data points for vgs <= {vgs_max_fit} V. Fitting full range.")
            vgs_fit = vgs
            rds_fit = rds

        weights = np.exp(-vgs_fit / vgs_max_fit)
        try:
            poly_coeffs = np.polyfit(vgs_fit, rds_fit, 2, w=weights)
            poly_func = np.poly1d(poly_coeffs)
            return poly_coeffs, poly_func
        except np.linalg.LinAlgError:
            print("Error: Failed to fit quadratic polynomial.")
            return [np.nan, np.nan, np.nan], None

    def extract_rds_on(data, vgs_max=5.0, tolerance=0.01):
        id_target = data['id'].max()
        data_id = data[abs(data['id'] - id_target) <= tolerance]
        rds_on = data_id[data_id['vgs'] >= vgs_max - 0.01]['rds'].min() if any(data_id['vgs'] >= vgs_max - 0.01) else np.nan
        return rds_on

    def extract_rds_on_vgs_dependence(csv_file_path, vgs_max_fit=4.0):
        data = load_csv(csv_file_path)
        if data is None:
            return None, None, None

        vgs, rds, id_target = filter_data(data)
        if vgs is None:
            return None, None, id_target

        rds_smooth = smooth_data(vgs, rds)
        vgs_clean, rds_clean = remove_outliers(vgs, rds_smooth)
        poly_coeffs, poly_func = fit_quadratic(vgs_clean, rds_clean, vgs_max_fit)
        rds_on = extract_rds_on(data)

        residuals = rds - poly_func(vgs) if poly_func is not None else np.zeros_like(rds)

        results = {
            'R_DS(on)': rds_on,
            'V_GS_dependence_coefficients': poly_coeffs
        }
        plot_data = {
            'vgs': vgs,
            'rds': rds,
            'rds_smooth': rds_smooth,
            'vgs_clean': vgs_clean,
            'rds_clean': rds_clean,
            'poly_func': poly_func,
            'residuals': residuals
        }

        return results, plot_data, id_target

    def plot_rds_vgs(results, plot_data, id_target):
        if plot_data['poly_func'] is None:
            print("No plot generated due to fitting error.")
            return

        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8), sharex=True, gridspec_kw={'height_ratios': [3, 1]})

        ax1.plot(plot_data['vgs'], plot_data['rds'], marker='o', linestyle='-', label='Original R_DS(on)')
        ax1.plot(plot_data['vgs'], plot_data['rds_smooth'], linestyle=':', label='Smoothed R_DS(on)')
        ax1.plot(plot_data['vgs_clean'], plot_data['rds_clean'], marker='x', linestyle='', label='Cleaned Data for Fit')

        vgs_fit = np.linspace(min(plot_data['vgs']), max(plot_data['vgs']), 100)
        rds_fit = plot_data['poly_func'](vgs_fit)
        ax1.plot(vgs_fit, rds_fit, linestyle='--', label='Quadratic Fit')

        if not np.isnan(results['R_DS(on)']):
            vgs_max = max(plot_data['vgs'])
            ax1.plot(vgs_max, results['R_DS(on)'], marker='x', markersize=10,
                     label=f'R_DS(on) = {results["R_DS(on)"]:.3f} Ω at V_GS ≈ 5 V')

        ax1.set_ylabel('R_DS(on) (Ω)')
        ax1.set_title(f'R_DS(on) vs. V_GS for EPC2040 (id ≈ {id_target:.2f} A)')
        ax1.grid(True)
        ax1.legend()

        ax2.plot(plot_data['vgs'], plot_data['residuals'], marker='o', linestyle='-', color='red', label='Residuals')
        ax2.axhline(0, color='black', linestyle='--', linewidth=0.5)
        ax2.set_xlabel('V_GS (V)')
        ax2.set_ylabel('Residuals (Ω)')
        ax2.set_title('Fit Residuals')
        ax2.grid(True)
        ax2.legend()

        plt.tight_layout()
        plt.show()

    vgs_max_fit = 4.0
    root = tk.Tk()
    root.withdraw()
    csv_file = filedialog.askopenfilename(
        title="Select CSV File",
        filetypes=[("CSV files", "*.csv")]
    )

    if not csv_file:
        print("No file selected.")
        return

    results, plot_data, id_target = extract_rds_on_vgs_dependence(csv_file, vgs_max_fit)
    if results is None:
        return

    print("Extracted Parameters:")
    if not np.isnan(results['R_DS(on)']):
        print(f"R_DS(on) at V_GS ≈ 5 V: {results['R_DS(on)']:.3f} Ω")
    else:
        print("Error: Could not extract R_DS(on) at V_GS ≈ 5 V.")

    coeffs = results['V_GS_dependence_coefficients']
    if not any(np.isnan(coeffs)):
        print(f"V_GS dependence (rds = a*vgs^2 + b*vgs + c): a = {coeffs[0]:.6f}, "
              f"b = {coeffs[1]:.6f}, c = {coeffs[2]:.6f}")
    else:
        print("Error: Could not compute V_GS dependence coefficients.")

    if plot_data:
        plot_rds_vgs(results, plot_data, id_target)

# Function 4: From asm_c_upgraded.py - Capacitance fit
def extract_capacitance_params():
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(title="Select Figure 5b CSV", filetypes=[("CSV files", "*.csv")])
    if not file_path:
        print("No file selected. Exiting.")
        return

    # Load data
    df = pd.read_csv(file_path)
    if not {"vds", "c", "type"}.issubset(df.columns):
        print("CSV must contain columns: vds, c, type")
        return

    VDSATCV = 2.5  # Fixed scaling voltage as in your model

    # Model
    def capacitance_model(vds, c0, kcap):
        return c0 * np.exp(-kcap * (vds / VDSATCV))

    # Extract and fit each type
    results = {}
    types = ["ciss", "coss", "crss"]

    plt.figure(figsize=(10, 6))

    for t in types:
        d = df[df["type"].str.lower() == t]
        if d.empty:
            print(f"No data for type: {t}")
            continue

        vds = d["vds"].values
        c = d["c"].values

        # Initial guess: [C0 at VDS=0, small KCAP]
        c0_init = max(c)
        kcap_init = 0.01
        popt, _ = curve_fit(capacitance_model, vds, c, p0=[c0_init, kcap_init])

        c0_fit, kcap_fit = popt
        results[t] = (c0_fit, kcap_fit)

        # Plot fit vs data
        vds_fit = np.linspace(min(vds), max(vds), 200)
        c_fit = capacitance_model(vds_fit, c0_fit, kcap_fit)
        plt.plot(vds, c, 'o', label=f"{t.upper()} data")
        plt.plot(vds_fit, c_fit, '-', label=f"{t.upper()} fit (KCAP={kcap_fit:.4f})")

    # Plot settings
    plt.xlabel("Vds (V)")
    plt.ylabel("Capacitance (pF)")
    plt.title("Capacitance vs Vds Fit")
    plt.grid(True)
    plt.legend()
    plt.tight_layout()
    plt.show()

    # Show extracted results
    print("\n✅ Extracted Parameters:")

    name_map = {
        "crss": ("CGDO", "KCAP_CGDO"),
        "ciss": ("CGSO", "KCAP_CGSO"),
        "coss": ("CDSO", "KCAP_CDSO")
    }

    for t in types:
        if t in results:
            c0, kcap = results[t]
            cname, kname = name_map[t]
            print(f".PARAM {cname:<6} = {c0:.4e}  ; base capacitance (pF)")
            print(f".PARAM {kname:<10} = {kcap:.4f}   ; voltage dependence (1/V)")

# Function 5: From asm_transfer_upgraded.py - Transfer characteristics
def extract_transfer_params():
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(title="Select CSV (vgs, id, temp)", filetypes=[("CSV Files", "*.csv")])
    if not file_path:
        print("No file selected.")
        return

    # Load Data
    df = pd.read_csv(file_path)
    if not {"vgs", "id", "temp"}.issubset(df.columns):
        print("CSV must contain vgs, id, temp")
        return

    # Split data
    temps = sorted(df["temp"].unique())
    if len(temps) != 2:
        print("Expecting data for exactly two temperatures (e.g., 25 and 125°C")
        return

    data_by_temp = {T: df[df["temp"] == T] for T in temps}

    # Estimate VOFF roughly from threshold crossing at 25°C
    def estimate_voff(data, id_threshold=1e-3):
        candidates = data[data["id"] > id_threshold]
        return np.min(candidates["vgs"]) if not candidates.empty else 1.0

    voff_init = estimate_voff(data_by_temp[25])
    print(f"Estimated VOFF: {voff_init:.3f} V")

    # Log-log linear regression to get VSE and KP at each temp
    def log_fit(vgs, id_, voff):
        mask = (vgs > voff) & (id_ > 1e-6)
        if np.count_nonzero(mask) < 3:
            return 1.0, 1.0
        x = np.log(vgs[mask] - voff)
        y = np.log(id_[mask])
        slope, intercept = np.polyfit(x, y, 1)
        vse = slope
        kp = np.exp(intercept)
        return vse, kp

    vse_init, kp_25_init = log_fit(data_by_temp[25]["vgs'].values, data_by_temp[25]["id"].values, voff_init)
    _, kp_125_init = log_fit(data_by_temp[125]["vgs"].values, data_by_temp[125]["id"].values, voff_init)

    # Combined fitting model
    def id_model(vgs, kp, voff, vse):
        return np.where(vgs > voff, kp * (vgs - voff)**vse, 0.0)

    def loss_fn(params, data_25, data_125):
        kp_25, kp_125, voff, vse = params
        id_25_pred = id_model(data_25["vgs"].values, kp_25, voff, vse)
        id_125_pred = id_model(data_125["vgs"].values, kp_125, voff, vse)
        err_25 = np.log1p(np.abs(id_25_pred - data_25["id"].values))
        err_125 = np.log1p(np.abs(id_125_pred - data_125["id"].values))
        return np.mean(err_25**2) + np.mean(err_125**2)

    # Fit with minimize
    x0 = [kp_25_init, kp_125_init, voff_init, vse_init]
    bounds = [(1e-5, 1000), (1e-5, 1000), (1, 3), (1, 5)]
    res = minimize(loss_fn, x0, args=(data_by_temp[25], data_by_temp[125]), bounds=bounds)

    # Extracted parameters
    kp_25, kp_125, voff_fit, vse_fit = res.x
    ute = np.log(kp_125 / kp_25) / np.log(125 / 25)

    # Plot
    plt.figure(figsize=(10, 6))
    for T, color in zip([25, 125], ['b', 'r']):
        d = data_by_temp[T]
        vgs = d["vgs"].values
        id_meas = d["id"].values
        kp = kp_25 if T == 25 else kp_125
        id_pred = id_model(vgs, kp, voff_fit, vse_fit)
        plt.plot(vgs, id_meas, 'o', label=f"Data @ {T}°C", color=color)
        plt.plot(vgs, id_pred, '-', label=f"Fit @ {T}°C", color=color)

    plt.xlabel("Vgs (V)")
    plt.ylabel("Id (A)")
    plt.title("Transfer Characteristics Fit (Auto Extracted)")
    plt.grid(True)
    plt.legend()
    plt.tight_layout()
    plt.show()

    # Output
    print("\n✅ Extracted Parameters:")
    print(f"VOFF    = {voff_fit:.4f} V")
    print(f"VSE     = {vse_fit:.4f}")
    print(f"KP_25C  = {kp_25:.4f} A/V^{vse_fit:.2f}")
    print(f"KP_125C = {kp_125:.4f} A/V^{vse_fit:.2f}")
    print(f"UTE     = {ute:.4f}")

# Function 6: From asm_lambdas.py - Lambda extraction
def extract_lambdas():
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(title="Select Output Characteristic CSV", filetypes=[("CSV files", "*.csv")])
    if not file_path:
        print("No file selected.")
        return

    # Load CSV
    df = pd.read_csv(file_path)
    if not {"vds", "id", "vgs"}.issubset(df.columns):
        print("CSV must contain: vds, id, vgs")
        return

    # Parameters
    VGS_target = 4  # Target curve for fitting
    VOFF = 1.7892     # Known from previous extraction

    # Filter VGS = 3 V
    df_3v = df[np.isclose(df["vgs"], VGS_target)]
    vds = df_3v["vds"].values
    id_ = df_3v["id"].values

    # Identify saturation region heuristically
    # Here we choose Vds >= 2 V as saturation; adjust if needed
    sat_mask = vds >= 2.0
    vds_sat = vds[sat_mask]
    id_sat = id_[sat_mask]

    # Fit a line to Id vs Vds in saturation region
    slope, intercept, r_value, _, _ = linregress(vds_sat, id_sat)

    # Compute lambda
    I_sat_approx = intercept  # Y-intercept approximates saturation current
    lambda_vgs3 = slope / I_sat_approx

    # Solve for LAMBDA0 and LAMBDA1
    delta_vgs = VGS_target - VOFF
    LAMBDA1 = 0.015  # Or set to 0 if unknown
    LAMBDA0 = lambda_vgs3 - LAMBDA1 * delta_vgs

    # Plotting
    plt.figure(figsize=(8, 5))
    plt.plot(vds, id_, 'o', label='Vgs = 3 V data')
    plt.plot(vds_sat, slope * vds_sat + intercept, '-', label='Linear fit in saturation')
    plt.xlabel("Vds (V)")
    plt.ylabel("Id (A)")
    plt.title("Output Characteristic Fit (Vgs = 3 V)")
    plt.grid(True)
    plt.legend()
    plt.tight_layout()
    plt.show()

    # Output results
    print("\n✅ Extracted Channel Length Modulation:")
    print(f"λ (Vgs = 3 V)     = {lambda_vgs3:.4f} 1/V")
    print(f"Assumed VOFF      = {VOFF:.4f} V")
    print(f"Assumed LAMBDA1   = {LAMBDA1:.4f} 1/V^2")
    print(f"Calculated LAMBDA0= {LAMBDA0:.4f} 1/V")

# Function 7: From asm_thermal_R.py - Thermal resistance RTH0
def extract_rth0():
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(title="Select CSV File", filetypes=[("CSV files", "*.csv")])

    if not file_path:
        print("No file selected.")
        return

    # Read the CSV file
    try:
        data = pd.read_csv(file_path)
    except FileNotFoundError:
        print("Error: CSV file not found or inaccessible.")
        return
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return

    # Verify required columns
    required_columns = ['Temp', 'Rds', 'Id']
    if not all(col in data.columns for col in required_columns):
        print(f"Error: CSV file must contain {required_columns} columns.")
        return

    # Remove NaN or infinite values
    data = data.dropna()
    data = data[np.isfinite(data['Temp']) & np.isfinite(data['Rds']) & np.isfinite(data['Id'])]

    if data.empty:
        print("Error: No valid data after cleaning.")
        return

    # Check if Id is constant
    if data['Id'].nunique() != 1:
        print("Warning: Id is not constant. Using data for Id = 1.5 A.")
        data = data[data['Id"] == 1.5]

    if data.empty:
        print("Error: No data for Id = 1.5 A.")
        return

    # Extract temperature and R_DS(on)
    temp = data['Temp'].values  # Assumed T_j
    rds = data['Rds'].values
    id_val = data['Id'].values[0]  # Constant I_D = 1.5 A

    # Check normalization: R_DS(on)(25°C) ≈ 1 indicates normalized data
    rds_25 = data[data['Temp'] == 25]['Rds'].mean()
    if abs(rds_25 - 1.0) < 0.01:
        print("Note: R_DS(on) is normalized to 1 at 25°C.")
        # Scale to actual R_DS(on)(25°C) ≈ 0.125 Ω (from EPC2040 Figure 3 at V_GS = 5 V)
        rds_actual_25 = 0.125
        scale_factor = rds_actual_25 / rds_25
        rds = rds * scale_factor
    else:
        print("Note: R_DS(on) assumed as absolute values.")
        scale_factor = 1.0

    # Calculate power dissipation: P_d = I_D * V_DS, where V_DS = I_D * R_DS(on) at V_GS = 5 V
    vds = rds * id_val  # V_DS = I_D * R_DS(on)
    power = id_val * vds  # P_d = I_D * V_DS = I_D^2 * R_DS(on)

    # Find maximum and minimum points
    max_idx = np.argmax(temp)
    min_idx = np.argmin(temp)
    t_j_max = temp[max_idx]
    t_j_min = temp[min_idx]
    p_d_max = power[max_idx]
    p_d_min = power[min_idx]

    print(f"Debug: Min point (P_d, T_j) = ({p_d_min:.4f} W, {t_j_min}°C)")
    print(f"Debug: Max point (P_d, T_j) = ({p_d_max:.4f} W, {t_j_max}°C)")

    # Calculate RTH0 using the slope between min and max points
    if p_d_max != p_d_min:  # Avoid division by zero
        rth0 = (t_j_max - t_j_min) / (p_d_max - p_d_min)
        t_ambient = t_j_min - p_d_min * rth0  # Adjust T_ambient to fit the line
    else:
        print("Error: Power dissipation range is zero, cannot calculate RTH0.")
        return

    print(f"Debug: Calculated T_ambient = {t_ambient:.2f}°C, RTH0 = {rth0:.4e} °C/W")

    # Plot T_j vs. P_d with line between min and max points
    plt.figure(figsize=(10, 6))
    plt.scatter(power, temp, label='Data', color='blue', alpha=0.5)
    plt.plot([p_d_min, p_d_max], [t_j_min, t_j_max], label='Fit (Min to Max)', color='red')
    plt.xlabel('Power Dissipation (W)')
    plt.ylabel('Junction Temperature (°C)')
    plt.title('Junction Temperature vs. Power Dissipation (EPC2040, V_GS = 5 V, I_D = 1.5 A)')
    plt.legend()
    plt.grid(True)
    plt.show()

    if rth0 is not None:
        print(f"RTH0 (Thermal Resistance): {rth0:.4e} °C/W")
    else:
        print("RTH0 could not be determined.")

# Function 8: From asm_rds_temp.py - KRSC, KRDC
def extract_krsc_krdc():
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(title="Select CSV File", filetypes=[("CSV files", "*.csv")])

    if not file_path:
        print("No file selected.")
        return

    # Define temperature dependence model: R_DS(on)(T) = R0 * (1 + KRSC * (T - T_ref))
    def rds_temp_model(temp, r0, krsc):
        t_ref = 25.0  # Reference temperature in °C
        return r0 * (1 + krsc * (temp - t_ref))

    # Read the CSV file
    try:
        data = pd.read_csv(file_path)
    except FileNotFoundError:
        print("Error: CSV file not found.")
        return
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return

    # Verify required columns
    required_columns = ['Temp', 'Rds', 'Id']
    if not all(col in data.columns for col in required_columns):
        print(f"Error: CSV file must contain {required_columns} columns.")
        return

    # Remove NaN or infinite values
    data = data.dropna()
    data = data[np.isfinite(data['Temp']) & np.isfinite(data['Rds']) & np.isfinite(data['Id'])]

    if data.empty:
        print("Error: No valid data after cleaning.")
        return

    # Check if Id is constant
    if data['Id'].nunique() != 1:
        print("Warning: Id is not constant. Using data for Id = 1.5 A.")
        data = data[data['Id'] == 1.5]

    if data.empty:
        print("Error: No data for Id = 1.5 A.")
        return

    # Extract temperature and R_DS(on)
    temp = data['Temp'].values
    rds = data['Rds'].values

    # Normalize R_DS(on) to 25°C if data appears scaled
    rds_25 = data[data['Temp'] == 25]['Rds'].mean()
    if abs(rds_25 - 1.0) < 0.01:  # Check if normalized
        print("Note: R_DS(on) appears normalized to 1 at 25°C.")
        r0_init = 1.0
    else:
        r0_init = rds_25  # Use actual R_DS(on) at 25°C

    # Fit R_DS(on) vs. temperature
    try:
        initial_guesses = [r0_init, 0.005]  # R0 ≈ R_DS(on)(25°C), KRSC ≈ 0.005/°C
        popt, _ = curve_fit(rds_temp_model, temp, rds, p0=initial_guesses, maxfev=5000)
        r0, krsc = popt
    except RuntimeError as e:
        print(f"Error: Curve fitting failed: {e}")
        return

    # Assume KRSC = KRDC (symmetric contact resistances)
    krdc = krsc

    # Plot data and fit
    plt.figure(figsize=(10, 6))
    plt.scatter(temp, rds, label='Data', color='blue', alpha=0.5)
    temp_range = np.linspace(min(temp), max(temp), 100)
    plt.plot(temp_range, rds_temp_model(temp_range, r0, krsc), label='Fit', color='red')
    plt.xlabel('Temperature (°C)')
    plt.ylabel('R_DS(on) (Ω)')
    plt.title('R_DS(on) vs. Temperature (EPC2040, I_D = 1.5 A)')
    plt.legend()
    plt.grid(True)
    plt.show()

    if krsc is not None and krdc is not None:
        print(f"KRSC (Source Contact Resistance Temperature Coefficient): {krsc:.4e} /°C")
        print(f"KRDC (Drain Contact Resistance Temperature Coefficient): {krdc:.4e} /°C")
    else:
        print("KRSC and KRDC could not be determined.")

# Function 9: From asm_temp_vth.py - VTH vs Temp
def extract_temp_vth():
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(title="Select CSV (temp, vth)", filetypes=[("CSV Files", "*.csv")])
    if not file_path:
        print("No file selected.")
        return

    # Load data
    df = pd.read_csv(file_path)
    if not {"temp", "vth"}.issubset(df.columns):
        print("CSV must contain columns: temp, vth")
        return

    temps = df["temp"].values
    vths = df["vth"].values

    # Define model
    def vth_model(temp, voff0, kvto):
        return voff0 + kvto * (temp - 25)

    # Fit
    popt, _ = curve_fit(vth_model, temps, vths, p0=[vths[0], -2e-3])
    voff0, kvto = popt

    # Plot
    temp_fit = np.linspace(min(temps), max(temps), 200)
    vth_fit = vth_model(temp_fit, voff0, kvto)

    plt.figure(figsize=(8, 5))
    plt.plot(temps, vths, 'o', label="Data")
    plt.plot(temp_fit, vth_fit, '-', label=f"Fit: VOFF0={voff0:.4f}, KVTO={kvto*1e3:.2f} mV/°C")
    plt.xlabel("Temperature (°C)")
    plt.ylabel("Threshold Voltage Vth (V)")
    plt.title("Vth vs Temperature Fit")
    plt.grid(True)
    plt.legend()
    plt.tight_layout()
    plt.show()

    # Output
    print("\n✅ Extracted Parameters:")
    print(f"VOFF0 = {voff0:.4f} V  (Threshold @ 25°C)")
    print(f"KVTO  = {kvto:.4e} V/°C")

    # Optional export
    save = input("Save to 'params.txt' for SPICE? (y/n): ").strip().lower()
    if save == "y":
        with open("params.txt", "w") as f:
            f.write(f".PARAM VOFF0={voff0:.4f}\n")
            f.write(f".PARAM KVTO={kvto:.4e}\n")
            f.write(f".PARAM VOFF={{VOFF0 + KVTO*(TEMP - 25)}}\n")
        print("Saved to params.txt")

# Main menu
def main():
    while True:
        print("\nSelect parameter extraction tool:")
        print("1. Output Characteristics Fit (RD0, MEXP)")
        print("2. RDS vs VGS Temp Dependence (UTE, UTES, UTED)")
        print("3. RDS vs VGS at constant Id")
        print("4. Capacitance Fit (CISS, COSS, CRSS)")
        print("5. Transfer Characteristics (VOFF, VSE, KP, UTE)")
        print("6. Channel Length Modulation (Lambda)")
        print("7. Thermal Resistance (RTH0)")
        print("8. RDS Temp Coefficients (KRSC, KRDC)")
        print("9. VTH vs Temperature (VOFF0, KVTO)")
        print("q. Quit")

        choice = input("Enter choice: ").strip()

        if choice == '1':
            extract_output_params()
        elif choice == '2':
            extract_ute_utes_uted()
        elif choice == '3':
            extract_rds_vgs_id()
        elif choice == '4':
            extract_capacitance_params()
        elif choice == '5':
            extract_transfer_params()
        elif choice == '6':
            extract_lambdas()
        elif choice == '7':
            extract_rth0()
        elif choice == '8':
            extract_krsc_krdc()
        elif choice == '9':
            extract_temp_vth()
        elif choice.lower() == 'q':
            break
        else:
            print("Invalid choice. Try again.")

if __name__ == "__main__":
    main()