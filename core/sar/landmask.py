"""
Land, Shoreline & Mudflat Masking Subsystem
Supports GSHHG vector coastlines and SRTM water body / elevation masking.
Prevents false-positive oil spill alerts from intertidal mudflats, shallow banks, ports, and breaking surf zones.
"""

from dataclasses import dataclass, field
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import numpy as np

logger = logging.getLogger(__name__)


# Built-in reference coastal polygons for Indian maritime economic corridors (WGS84 [lon, lat])
# Used as high-precision fallback when external multi-GB GSHHG shapefiles are not mounted.
BUILTIN_COASTAL_CORRIDORS: Dict[str, List[List[Tuple[float, float]]]] = {
    # Gulf of Kutch / Saurashtra (Kandla, Mundra, Vadinar, Sikka mudflats & coastline)
    "GULF_OF_KUTCH": [
        [
            (68.90, 22.45), (69.20, 22.40), (69.60, 22.50), (70.10, 22.70),
            (70.30, 22.95), (70.20, 23.10), (69.80, 23.00), (69.30, 22.85),
            (68.90, 22.70), (68.80, 22.50), (68.90, 22.45)
        ]
    ],
    # Mumbai Harbor, JNPT, and Thane Creek mudflats
    "MUMBAI_JNPT": [
        [
            (72.75, 18.85), (72.90, 18.85), (73.05, 18.95), (73.05, 19.15),
            (72.95, 19.25), (72.80, 19.15), (72.78, 18.95), (72.75, 18.85)
        ]
    ],
    # Bay of Bengal / Paradip, Dhamra & Mahanadi Estuary
    "PARADIP_MAHANADI": [
        [
            (86.50, 20.15), (86.75, 20.25), (86.95, 20.45), (87.05, 20.80),
            (86.85, 20.85), (86.60, 20.55), (86.40, 20.30), (86.50, 20.15)
        ]
    ],
    # Cochin / Kerala Coastal Backwaters
    "COCHIN_KERALA": [
        [
            (76.15, 9.85), (76.35, 9.90), (76.40, 10.15), (76.25, 10.25),
            (76.15, 10.05), (76.15, 9.85)
        ]
    ],
}


@dataclass
class MaskingConfig:
    """Configuration for coastal and mudflat masking."""
    gshhg_path: Optional[Path] = None
    srtm_dem_path: Optional[Path] = None
    seaward_buffer_meters: float = 500.0  # Surf-zone & breaking wave exclusion buffer
    mudflat_elevation_threshold_m: float = 2.0  # Max elevation for intertidal mudflats
    radiometric_land_threshold_db: float = -15.0  # Sigma0 threshold for dry land
    use_builtin_fallback: bool = True


class LandMaskEngine:
    """
    Unified Land, Shoreline, Port & Mudflat Masking Engine.
    
    Combines:
    1. Vector Coastline Masking (GSHHG shapefile/GeoJSON or built-in corridor polygons).
    2. Digital Elevation & Water Body Masking (SRTM DEM elevation thresholding).
    3. Seaward Morphological Buffering (eliminates nearshore wave-breaking speckle).
    4. Adaptive Radiometric Backscatter Thresholding.
    """

    def __init__(self, config: Optional[MaskingConfig] = None):
        self.config = config or MaskingConfig()
        self._gshhg_geoms = self._load_gshhg()
        self._srtm_loaded = self.config.srtm_dem_path is not None and Path(self.config.srtm_dem_path).exists()

    def _load_gshhg(self) -> List[List[Tuple[float, float]]]:
        """Load GSHHG vector polygons from disk or use built-in Indian corridor baselines."""
        geoms: List[List[Tuple[float, float]]] = []

        if self.config.gshhg_path and Path(self.config.gshhg_path).exists():
            try:
                # If geopandas/shapefile reader is available, parse vector files
                import json
                p = Path(self.config.gshhg_path)
                if p.suffix.lower() in [".json", ".geojson"]:
                    with open(p, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        for feat in data.get("features", []):
                            geom = feat.get("geometry", {})
                            if geom.get("type") == "Polygon":
                                for ring in geom.get("coordinates", []):
                                    geoms.append([(float(pt[0]), float(pt[1])) for pt in ring])
                            elif geom.get("type") == "MultiPolygon":
                                for poly in geom.get("coordinates", []):
                                    for ring in poly:
                                        geoms.append([(float(pt[0]), float(pt[1])) for pt in ring])
                    logger.info(f"Loaded {len(geoms)} coastline polygons from GSHHG GeoJSON: {p}")
                    return geoms
            except Exception as exc:
                logger.warning(f"Could not load vector GSHHG from {self.config.gshhg_path}: {exc}")

        if self.config.use_builtin_fallback:
            for corridor, poly_list in BUILTIN_COASTAL_CORRIDORS.items():
                geoms.extend(poly_list)
            logger.info(f"Initialized LandMaskEngine with {len(geoms)} reference corridor polygons.")

        return geoms

    def point_in_polygon(self, x: float, y: float, poly: List[Tuple[float, float]]) -> bool:
        """Ray-casting algorithm for 2D point-in-polygon test."""
        n = len(poly)
        inside = False
        p1x, p1y = poly[0]
        for i in range(1, n + 1):
            p2x, p2y = poly[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    def generate_vector_land_mask(
        self,
        bounds: Tuple[float, float, float, float],
        shape: Tuple[int, int]
    ) -> np.ndarray:
        """
        Rasterize vector coastline polygons over the given geographic bounding box.
        
        Args:
            bounds: (min_lon, min_lat, max_lon, max_lat)
            shape: (height, width) of the target mask
            
        Returns:
            Boolean ndarray of shape (height, width) where True = Land/Mudflat, False = Water.
        """
        min_lon, min_lat, max_lon, max_lat = bounds
        h, w = shape
        mask = np.zeros((h, w), dtype=bool)

        if not self._gshhg_geoms or max_lon <= min_lon or max_lat <= min_lat:
            return mask

        # Fast bounding box pre-filter
        relevant_polys = []
        for poly in self._gshhg_geoms:
            poly_lons = [p[0] for p in poly]
            poly_lats = [p[1] for p in poly]
            p_min_lon, p_max_lon = min(poly_lons), max(poly_lons)
            p_min_lat, p_max_lat = min(poly_lats), max(poly_lats)

            # Check overlap with scene bounds
            if not (p_max_lon < min_lon or p_min_lon > max_lon or p_max_lat < min_lat or p_min_lat > max_lat):
                relevant_polys.append(poly)

        if not relevant_polys:
            return mask

        # Compute pixel grid coordinates
        lons = np.linspace(min_lon, max_lon, w)
        lats = np.linspace(max_lat, min_lat, h)  # top-to-bottom

        # Coarse-to-fine rasterization for performance
        step = max(1, min(h, w) // 128)
        for poly in relevant_polys:
            for r in range(0, h, step):
                lat = float(lats[r])
                r_end = min(r + step, h)
                for c in range(0, w, step):
                    lon = float(lons[c])
                    if self.point_in_polygon(lon, lat, poly):
                        c_end = min(c + step, w)
                        mask[r:r_end, c:c_end] = True

        return mask

    def apply_seaward_buffer(self, land_mask: np.ndarray, pixel_size_meters: float = 10.0) -> np.ndarray:
        """
        Dilate the land mask seaward by config.seaward_buffer_meters
        to suppress breaking wave surf zone and intertidal mudflats.
        """
        if self.config.seaward_buffer_meters <= 0 or not np.any(land_mask):
            return land_mask

        buffer_pixels = int(round(self.config.seaward_buffer_meters / max(pixel_size_meters, 1.0)))
        if buffer_pixels <= 0:
            return land_mask

        try:
            from scipy.ndimage import binary_dilation
            struct = np.ones((2 * buffer_pixels + 1, 2 * buffer_pixels + 1), dtype=bool)
            buffered = binary_dilation(land_mask, structure=struct)
            return buffered
        except Exception:
            # Fallback simple morphological box dilation
            padded = np.pad(land_mask, buffer_pixels, mode='edge')
            h, w = land_mask.shape
            buffered = np.copy(land_mask)
            for di in range(-buffer_pixels, buffer_pixels + 1):
                for dj in range(-buffer_pixels, buffer_pixels + 1):
                    if di * di + dj * dj <= buffer_pixels * buffer_pixels:
                        buffered |= padded[buffer_pixels + di:buffer_pixels + di + h,
                                           buffer_pixels + dj:buffer_pixels + dj + w]
            return buffered

    def create_unified_land_mask(
        self,
        vv_db: Optional[np.ndarray],
        bounds: Optional[Tuple[float, float, float, float]] = None,
        shape: Optional[Tuple[int, int]] = None,
        pixel_size_meters: float = 10.0,
        dem_elevation: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Produce composite land + mudflat + surf-zone exclusion mask.
        
        Args:
            vv_db: Calibrated VV channel in decibels (optional)
            bounds: Geographic bounds (min_lon, min_lat, max_lon, max_lat)
            shape: (height, width) of the image
            pixel_size_meters: Spatial pixel resolution (default 10m for Sentinel-1 IW)
            dem_elevation: SRTM DEM elevation grid in meters (optional)
            
        Returns:
            Boolean mask where True = Masked Area (Land/Mudflat/Surf), False = Valid Ocean
        """
        if shape is None and vv_db is not None:
            shape = vv_db.shape
        elif shape is None:
            raise ValueError("Either vv_db or shape must be provided to create_unified_land_mask")

        h, w = shape
        unified_mask = np.zeros((h, w), dtype=bool)

        # 1. Radiometric backscatter thresholding (Land is typically > -15 dB)
        if vv_db is not None:
            radiometric_mask = vv_db > self.config.radiometric_land_threshold_db
            unified_mask |= radiometric_mask

        # 2. SRTM Topographic / Mudflat elevation masking
        if dem_elevation is not None:
            srtm_mask = dem_elevation > self.config.mudflat_elevation_threshold_m
            unified_mask |= srtm_mask

        # 3. Vector coastline rasterization (GSHHG)
        if bounds is not None:
            vector_mask = self.generate_vector_land_mask(bounds, shape)
            unified_mask |= vector_mask

        # 4. Seaward morphological buffer to catch coastal surf zones & mudflats
        if np.any(unified_mask):
            unified_mask = self.apply_seaward_buffer(unified_mask, pixel_size_meters=pixel_size_meters)

        return unified_mask
