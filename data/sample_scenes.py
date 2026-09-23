import json
import numpy as np
from datetime import datetime, timedelta

# Mock SAR scene data for Indian EEZ corridors
MOCK_SAR_SCENES = [
    {
        "eventId": "SD-2026-00421",
        "timestampUtc": "2026-09-11T10:30:20Z",
        "severity": "CRITICAL",
        "sarMetadata": {
            "mission": "SENTINEL-1A",
            "sensor": "C-Band SAR (IW Mode)",
            "productType": "GRD-IW",
            "polarization": ["VV", "VH"],
            "relativeOrbit": 118,
            "passDirection": "DESCENDING",
            "incidenceAngleDeg": 34.2,
            "acquisitionUtc": "2026-09-11T10:30:20Z",
            "rawSceneSha256": "3a7b8e519c2f6d0a4b8e7c1f9d2a5b6c7e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b",
            "resolutionMeters": 10
        },
        "spillGeometry": {
            "centroid": {"latitude": 21.8452, "longitude": 69.1124},
            "areaKm2": 18.6,
            "perimeterKm": 31.2,
            "lengthKm": 8.4,
            "widthKm": 2.9,
            "skeletonOrientationDeg": 248.5,
            "boundingBox": {
                "lowerLeft": {"latitude": 21.825, "longitude": 69.084},
                "upperRight": {"latitude": 21.866, "longitude": 69.138}
            },
            "polygonGeoJson": {
                "type": "Polygon",
                "coordinates": [[[69.092, 21.825], [69.135, 21.838], [69.128, 21.865], [69.085, 21.85], [69.092, 21.825]]]
            }
        },
        "classification": {
            "classLabel": "MINERAL_OIL",
            "confidence": 0.942,
            "lookAlikeProbs": {
                "mineralOil": 0.942,
                "biogenicSlick": 0.021,
                "lowWindArea": 0.018,
                "shipWake": 0.019
            }
        },
        "detectionScores": {
            "textureScore": 0.912,
            "vvVhAgreement": 0.884,
            "morphologyAgreement": 0.923,
            "thresholdScore": 0.871,
            "segmentationAgreement": 0.958
        },
        "evidenceChips": [
            "VV Verified",
            "VH Verified",
            "Texture Verified",
            "Segmentation Verified",
            "Model Verified"
        ],
        "radarBrief": "Sharp-edged dark formation with damped VV signal, reduced cross-pol backscatter and high GLCM homogeneity — consistent with a sheen of persistent hydrocarbon, not biogenic film."
    },
    {
        "eventId": "SD-2026-00389",
        "timestampUtc": "2026-09-10T14:45:22Z",
        "severity": "MAJOR",
        "sarMetadata": {
            "mission": "SENTINEL-1B",
            "sensor": "C-Band SAR (IW Mode)",
            "productType": "GRD-IW",
            "polarization": ["VV", "VH"],
            "relativeOrbit": 42,
            "passDirection": "ASCENDING",
            "incidenceAngleDeg": 38.7,
            "acquisitionUtc": "2026-09-10T14:45:22Z",
            "rawSceneSha256": "b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef012",
            "resolutionMeters": 10
        },
        "spillGeometry": {
            "centroid": {"latitude": 19.2317, "longitude": 72.8544},
            "areaKm2": 12.5,
            "perimeterKm": 24.1,
            "lengthKm": 6.2,
            "widthKm": 2.1,
            "skeletonOrientationDeg": 210.0,
            "boundingBox": {
                "lowerLeft": {"latitude": 19.213, "longitude": 72.827},
                "upperRight": {"latitude": 19.253, "longitude": 72.876}
            },
            "polygonGeoJson": {
                "type": "Polygon",
                "coordinates": [[[72.835, 19.215], [72.875, 19.235], [72.868, 19.275], [72.825, 19.245], [72.835, 19.215]]]
            }
        },
        "classification": {
            "classLabel": "MINERAL_OIL",
            "confidence": 0.887,
            "lookAlikeProbs": {
                "mineralOil": 0.887,
                "biogenicSlick": 0.065,
                "lowWindArea": 0.032,
                "shipWake": 0.016
            }
        },
        "detectionScores": {
            "textureScore": 0.864,
            "vvVhAgreement": 0.842,
            "morphologyAgreement": 0.801,
            "thresholdScore": 0.822,
            "segmentationAgreement": 0.91
        },
        "evidenceChips": [
            "VV Verified",
            "Texture Verified",
            "Segmentation Verified",
            "Model Verified"
        ],
        "radarBrief": "Moderate-confidence dark formation off Mumbai Marine ATS corridor. Lower VV/VH agreement typical of thinner sheen; under review pending next pass."
    }
]

# Mock AIS vessel data
MOCK_AIS_VESSELS = [
    {
        "mmsi": 419001234,
        "imo": 9345678,
        "vesselName": "MT OCEAN PIONEER",
        "flag": "India",
        "vesselType": "OIL_TANKER",
        "latitude": 21.9200,
        "longitude": 69.2500,
        "speedOverGround": 6.1,
        "courseOverGround": 248.0,
        "heading": 248.0,
        "navigationStatus": "Under way using engine",
        "timestampUtc": "2026-09-11T10:00:00Z",
        "isNight": True,
        "aisStatus": "ACTIVE"
    },
    {
        "mmsi": 636019876,
        "imo": 9456789,
        "vesselName": "MV BENGAL GLORY",
        "flag": "Liberia",
        "vesselType": "BULK_CARRIER",
        "latitude": 22.1000,
        "longitude": 69.4000,
        "speedOverGround": 13.8,
        "courseOverGround": 260.0,
        "heading": 260.0,
        "navigationStatus": "Under way using engine",
        "timestampUtc": "2026-09-11T10:30:00Z",
        "isNight": True,
        "aisStatus": "ACTIVE"
    },
    {
        "mmsi": 440123456,
        "imo": 9876543,
        "vesselName": "MV COASTAL DEFENDER-IV",
        "flag": "India",
        "vesselType": "TUG_ESCORT",
        "latitude": 21.7500,
        "longitude": 69.0000,
        "speedOverGround": 15.2,
        "courseOverGround": 280.0,
        "heading": 280.0,
        "navigationStatus": "Under way using engine",
        "timestampUtc": "2026-09-11T10:30:00Z",
        "isNight": True,
        "aisStatus": "ACTIVE"
    }
]

# Mock MetOcean data
MOCK_METOCEAN = {
    "current_u": 0.45,  # m/s zonal current (eastward positive)
    "current_v": -0.25, # m/s meridional current (northward positive)
    "wind_u": 5.2,      # m/s wind zonal component
    "wind_v": 3.1,      # m/s wind meridional component
    "wind_speed": 6.1,  # m/s
    "wind_direction": 32.0,  # degrees from north (clockwise)
    "current_speed": 0.54,  # m/s
    "current_direction": 150.0,  # degrees from north
    "wave_height": 1.2,  # meters
    "sea_state": 3,  # Beaufort scale
    "incident_datetime": "2026-09-11T10:30:00Z"
}

# Indian EEZ corridor definitions
INDIAN_EEZ_CORRIDORS = {
    "GULF_OF_KUTCH": {
        "bounds": {"lat_min": 22.0, "lat_max": 23.5, "lon_min": 68.0, "lon_max": 71.0},
        "key_ports": ["Kandla", "Vadinar", "Sikka"]
    },
    "MUMBAI_HIGH": {
        "bounds": {"lat_min": 18.5, "lat_max": 20.0, "lon_min": 70.0, "lon_max": 73.0},
        "key_ports": ["Mumbai High platforms", "JNPT"]
    },
    "BAY_OF_BENGAL": {
        "bounds": {"lat_min": 15.0, "lat_max": 20.0, "lon_min": 80.0, "lon_max": 85.0},
        "key_ports": ["Paradip", "Dhamra", "Visakhapatnam"]
    }
}

def get_mock_scene(index: int = 0) -> dict:
    return MOCK_SAR_SCENES[index]

def get_mock_ais_vessels() -> list:
    return MOCK_AIS_VESSELS

def get_mock_metocean() -> dict:
    return MOCK_METOCEAN

def generate_deterministic_spill_patch(centroid_lat: float, centroid_lon: float,
                                       area_km2: float = 5.0) -> dict:
    """
    Generate a deterministic synthetic oil slick polygon around a centroid.
    Uses simple circle approximation for demo purposes.
    """
    import math
    
    # Approximate: 1 deg latitude ≈ 111.32 km
    # 1 deg longitude at latitude φ ≈ 111.32 * cos(φ) km
    lat_radius_km = math.sqrt(area_km2 / math.pi) / 111.32
    lon_radius_km = math.sqrt(area_km2 / math.pi) / (111.32 * math.cos(math.radians(centroid_lat)))
    
    lat_deg = lat_radius_km
    lon_deg = lon_radius_km
    
    # Generate rectangular-ish polygon coordinates
    lat_min = centroid_lat - lat_deg
    lat_max = centroid_lat + lat_deg
    lon_min = centroid_lon - lon_deg
    lon_max = centroid_lon + lon_deg
    
    coordinates = [
        [ [lon_min, lat_min], [lon_max, lat_min], [lon_max, lat_max], [lon_min, lat_max], [lon_min, lat_min] ]
    ]
    
    return {
        "type": "Polygon",
        "coordinates": coordinates
    }