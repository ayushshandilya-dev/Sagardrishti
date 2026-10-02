import os
import glob
import numpy as np
import rasterio
from rasterio.windows import Window
import sys

# Ensure Sagardrishti core is in the python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from core.sar.cascade import CascadeOilSpillDetector, CascadeConfig

def test_live_sentinel1_image(safe_folder_path):
    print(f"--- STARTING LIVE INFERENCE TEST ---")
    print(f"Target SAFE folder: {safe_folder_path}")
    
    # 1. Locate the VV and VH measurement TIFF files
    meas_dir = os.path.join(safe_folder_path, "measurement")
    if not os.path.exists(meas_dir):
        print(f"Error: Could not find 'measurement' directory inside {safe_folder_path}")
        return
        
    vv_files = glob.glob(os.path.join(meas_dir, "*vv*.tiff"))
    vh_files = glob.glob(os.path.join(meas_dir, "*vh*.tiff"))
    
    if not vv_files:
        print("Error: Could not find VV TIFF file.")
        return
        
    vv_path = vv_files[0]
    vh_path = vh_files[0] if vh_files else None
    
    print(f"Found VV Band: {os.path.basename(vv_path)}")
    if vh_path:
        print(f"Found VH Band: {os.path.basename(vh_path)}")

    # 2. Read a cropped window of the massive GRD image to avoid crashing your Mac's RAM
    # Sentinel-1 images are ~25000x17000. We will grab a 4096x4096 square from the center.
    CROP_SIZE = 4096
    
    with rasterio.open(vv_path) as src:
        # Calculate center
        center_row = src.height // 2
        center_col = src.width // 2
        
        # Define window (row_off, col_off, height, width)
        window = Window(center_col - CROP_SIZE//2, center_row - CROP_SIZE//2, CROP_SIZE, CROP_SIZE)
        
        print(f"Extracting {CROP_SIZE}x{CROP_SIZE} crop from the center of the image...")
        vv_dn = src.read(1, window=window).astype(np.float32)
        
    if vh_path:
        with rasterio.open(vh_path) as src:
            vh_dn = src.read(1, window=window).astype(np.float32)
    else:
        vh_dn = None

    # 3. Radiometric Calibration (Digital Number to Sigma Naught dB)
    # Using the standard hackathon/fast approximation: Sigma0_dB = 20 * log10(DN) - K
    # (Where K is ~83.0 for Sentinel-1 typical GRD calibration constants)
    print("Applying Radiometric Calibration (DN to Sigma0 dB)...")
    vv_db = 20.0 * np.log10(vv_dn + 1e-6) - 83.0
    
    if vh_dn is not None:
        vh_db = 20.0 * np.log10(vh_dn + 1e-6) - 83.0
    else:
        vh_db = None

    # 4. Initialize the Detection Pipeline
    # (We are using the Cascade detector you verified earlier)
    print("Initializing CascadeOilSpillDetector...")
    config = CascadeConfig(tile_size=512) # Use 512x512 tiles internally for the neural net
    detector = CascadeOilSpillDetector(config=config)
    
    # 5. Run Inference!
    print("Running detection pipeline on the live crop...")
    results = detector.detect(vv_db=vv_db, vh_db=vh_db, land_mask=None)
    
    print("\n--- RESULTS ---")
    print(f"Scene Status: {results.get('scene_status')}")
    print(f"Number of Slicks Found: {results.get('num_slicks')}")
    print(f"Stage 1 Screened Tiles: {results.get('stage1_telemetry', {}).get('total_tiles')}")
    print(f"Stage 2 Deep Net Evaluations: {results.get('stage2_evaluations')}")
    print("---------------------------------")
    print("Test successful! The pipeline can read live Sentinel-1 COG folders.")

if __name__ == "__main__":
    target_path = "/Users/abhi_mishra1709/Downloads/S1D_IW_GRDH_1SDV_20260930T010238_20260930T010309_004800_00901B_8A28_COG.SAFE 3"
    test_live_sentinel1_image(target_path)
