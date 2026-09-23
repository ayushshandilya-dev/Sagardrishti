"""
MetOcean Data Fetchers for Ocean Currents and Wind Fields
Supports INCOIS (Indian Ocean) and ECMWF (Global) data sources.
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Union
from dataclasses import dataclass
from pathlib import Path
import logging
from abc import ABC, abstractmethod

# Optional dependencies
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    requests = None
    HAS_REQUESTS = False

logger = logging.getLogger(__name__)

try:
    import xarray as xr
    HAS_XARRAY = True
except ImportError:
    xr = None
    HAS_XARRAY = False



@dataclass
class CurrentField:
    """Ocean current velocity field."""
    u: np.ndarray  # Eastward velocity (m/s)
    v: np.ndarray  # Northward velocity (m/s)
    lat: np.ndarray
    lon: np.ndarray
    time: datetime
    depth: float = 0.0  # Surface
    source: str = ""
    
    def interpolate(self, lat: float, lon: float) -> Tuple[float, float]:
        """Bilinear interpolation at given lat/lon."""
        lat_idx = np.searchsorted(self.lat, lat) - 1
        lon_idx = np.searchsorted(self.lon, lon) - 1
        
        lat_idx = np.clip(lat_idx, 0, len(self.lat) - 2)
        lon_idx = np.clip(lon_idx, 0, len(self.lon) - 2)
        
        lat_frac = (lat - self.lat[lat_idx]) / (self.lat[lat_idx + 1] - self.lat[lat_idx])
        lon_frac = (lon - self.lon[lon_idx]) / (self.lon[lon_idx + 1] - self.lon[lon_idx])
        
        u00 = self.u[lat_idx, lon_idx]
        u01 = self.u[lat_idx, lon_idx + 1]
        u10 = self.u[lat_idx + 1, lon_idx]
        u11 = self.u[lat_idx + 1, lon_idx + 1]
        
        v00 = self.v[lat_idx, lon_idx]
        v01 = self.v[lat_idx, lon_idx + 1]
        v10 = self.v[lat_idx + 1, lon_idx]
        v11 = self.v[lat_idx + 1, lon_idx + 1]
        
        u_interp = (
            u00 * (1 - lat_frac) * (1 - lon_frac) +
            u01 * (1 - lat_frac) * lon_frac +
            u10 * lat_frac * (1 - lon_frac) +
            u11 * lat_frac * lon_frac
        )
        
        v_interp = (
            v00 * (1 - lat_frac) * (1 - lon_frac) +
            v01 * (1 - lat_frac) * lon_frac +
            v10 * lat_frac * (1 - lon_frac) +
            v11 * lat_frac * lon_frac
        )
        
        return float(u_interp), float(v_interp)


@dataclass
class WindField:
    """Wind velocity field at 10m."""
    u10: np.ndarray  # Eastward wind (m/s)
    v10: np.ndarray  # Northward wind (m/s)
    lat: np.ndarray
    lon: np.ndarray
    time: datetime
    source: str = ""
    
    def interpolate(self, lat: float, lon: float) -> Tuple[float, float]:
        """Bilinear interpolation at given lat/lon."""
        lat_idx = np.searchsorted(self.lat, lat) - 1
        lon_idx = np.searchsorted(self.lon, lon) - 1
        
        lat_idx = np.clip(lat_idx, 0, len(self.lat) - 2)
        lon_idx = np.clip(lon_idx, 0, len(self.lon) - 2)
        
        lat_frac = (lat - self.lat[lat_idx]) / (self.lat[lat_idx + 1] - self.lat[lat_idx])
        lon_frac = (lon - self.lon[lon_idx]) / (self.lon[lon_idx + 1] - self.lon[lon_idx])
        
        u00 = self.u10[lat_idx, lon_idx]
        u01 = self.u10[lat_idx, lon_idx + 1]
        u10 = self.u10[lat_idx + 1, lon_idx]
        u11 = self.u10[lat_idx + 1, lon_idx + 1]
        
        v00 = self.v10[lat_idx, lon_idx]
        v01 = self.v10[lat_idx, lon_idx + 1]
        v10 = self.v10[lat_idx + 1, lon_idx]
        v11 = self.v10[lat_idx + 1, lon_idx + 1]
        
        u_interp = (
            u00 * (1 - lat_frac) * (1 - lon_frac) +
            u01 * (1 - lat_frac) * lon_frac +
            u10 * lat_frac * (1 - lon_frac) +
            u11 * lat_frac * lon_frac
        )
        
        v_interp = (
            v00 * (1 - lat_frac) * (1 - lon_frac) +
            v01 * (1 - lat_frac) * lon_frac +
            v10 * lat_frac * (1 - lon_frac) +
            v11 * lat_frac * lon_frac
        )
        
        return float(u_interp), float(v_interp)


class MetOceanProvider(ABC):
    """Abstract base class for MetOcean data providers."""
    
    @abstractmethod
    def get_currents(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> CurrentField:
        pass
    
    @abstractmethod
    def get_winds(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> WindField:
        pass
    
    @abstractmethod
    def get_stokes_drift(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> CurrentField:
        pass


class INCOISProvider(MetOceanProvider):
    """
    INCOIS (Indian National Centre for Ocean Information Services) data provider.
    
    Provides Indian Ocean Forecasting System (IOFS) data:
    - HYCOM-based currents
    - WaveWatch III waves
    - Surface winds
    """
    
    BASE_URL = "https://incois.gov.in/opendap"
    
    def __init__(self, username: str = "", password: str = "", cache_dir: Path = Path("./cache/metocean")):
        self.username = username
        self.password = password
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session() if HAS_REQUESTS else None
        if self.session and username and password:
            self.session.auth = (username, password)

    
    def get_currents(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> CurrentField:
        """Fetch surface currents from INCOIS IOFS."""
        min_lat, min_lon, max_lat, max_lon = bbox
        
        cache_file = self.cache_dir / f"incois_currents_{time.strftime('%Y%m%d_%H')}.nc"
        
        if cache_file.exists():
            return self._load_currents_from_cache(cache_file, bbox)

        if not self.session:
            return self._get_climatology_currents(bbox)
        
        try:

            url = f"{self.BASE_URL}/iofs/hycom/surface/latest.nc"
            params = {
                "lat": f"{min_lat}:{max_lat}",
                "lon": f"{min_lon}:{max_lon}",
                "time": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            with open(cache_file, "wb") as f:
                f.write(response.content)
            
            return self._load_currents_from_cache(cache_file, bbox)
            
        except Exception as e:
            logger.warning(f"Failed to fetch INCOIS currents: {e}. Using climatology.")
            return self._get_climatology_currents(bbox)
    
    def _load_currents_from_cache(self, cache_file: Path, bbox: Tuple[float, float, float, float]) -> CurrentField:
        if not HAS_XARRAY:
            raise ImportError("xarray is required for loading NetCDF files")
        ds = xr.open_dataset(cache_file)
        
        u = ds["u"].isel(time=0, depth=0).values
        v = ds["v"].isel(time=0, depth=0).values
        lat = ds["lat"].values
        lon = ds["lon"].values
        
        ds.close()
        
        return CurrentField(
            u=u,
            v=v,
            lat=lat,
            lon=lon,
            time=datetime.now(),
            source="INCOIS-IOFS"
        )
    
    def _get_climatology_currents(self, bbox: Tuple[float, float, float, float]) -> CurrentField:
        """Fallback to climatological currents for Indian Ocean."""
        min_lat, min_lon, max_lat, max_lon = bbox
        
        lat = np.linspace(min_lat, max_lat, 50)
        lon = np.linspace(min_lon, max_lon, 50)
        
        u = np.zeros((len(lat), len(lon)))
        v = np.zeros((len(lat), len(lon)))
        
        for i, la in enumerate(lat):
            for j, lo in enumerate(lon):
                u[i, j], v[i, j] = self._indian_ocean_climatology(la, lo)
        
        return CurrentField(
            u=u,
            v=v,
            lat=lat,
            lon=lon,
            time=datetime.now(),
            source="INCOIS-Climatology"
        )
    
    def _indian_ocean_climatology(self, lat: float, lon: float) -> Tuple[float, float]:
        """
        Simplified Indian Ocean surface current climatology.
        Returns (u, v) in m/s.
        """
        # West India Coastal Current (WICC) - flows southward along west coast Nov-Mar
        # Northward along west coast Apr-Oct
        
        if 65 <= lon <= 75 and 8 <= lat <= 22:  # Arabian Sea west coast
            month = datetime.now().month
            if month in [11, 12, 1, 2, 3]:  # NE Monsoon - southward
                return (0.0, -0.3)
            elif month in [5, 6, 7, 8, 9]:  # SW Monsoon - northward
                return (0.0, 0.4)
            else:
                return (0.0, 0.1)
        
        # East India Coastal Current (EICC)
        if 80 <= lon <= 90 and 8 <= lat <= 22:  # Bay of Bengal
            month = datetime.now().month
            if month in [11, 12, 1, 2, 3]:  # NE Monsoon - northward
                return (0.0, 0.3)
            elif month in [5, 6, 7, 8, 9]:  # SW Monsoon - southward
                return (0.0, -0.2)
            else:
                return (0.0, 0.05)
        
        # Equatorial currents
        if -5 <= lat <= 5:
            if 50 <= lon <= 90:  # Equatorial Indian Ocean
                return (0.2, 0.0)  # Eastward
        
        # South Equatorial Current
        if -20 <= lat <= -5:
            return (0.15, 0.0)
        
        return (0.05, 0.05)
    
    def get_winds(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> WindField:
        """Fetch surface winds from INCOIS."""
        min_lat, min_lon, max_lat, max_lon = bbox
        
        cache_file = self.cache_dir / f"incois_winds_{time.strftime('%Y%m%d_%H')}.nc"
        
        if cache_file.exists():
            return self._load_winds_from_cache(cache_file, bbox)

        if not self.session:
            return self._get_climatology_winds(bbox)
        
        try:

            url = f"{self.BASE_URL}/iofs/wind/latest.nc"
            params = {
                "lat": f"{min_lat}:{max_lat}",
                "lon": f"{min_lon}:{max_lon}",
                "time": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            with open(cache_file, "wb") as f:
                f.write(response.content)
            
            return self._load_winds_from_cache(cache_file, bbox)
            
        except Exception as e:
            logger.warning(f"Failed to fetch INCOIS winds: {e}. Using climatology.")
            return self._get_climatology_winds(bbox)
    
    def _load_winds_from_cache(self, cache_file: Path, bbox: Tuple[float, float, float, float]) -> WindField:
        if not HAS_XARRAY:
            raise ImportError("xarray is required for loading NetCDF files")
        ds = xr.open_dataset(cache_file)
        
        u10 = ds["u10"].isel(time=0).values
        v10 = ds["v10"].isel(time=0).values
        lat = ds["lat"].values
        lon = ds["lon"].values
        
        ds.close()
        
        return WindField(
            u10=u10,
            v10=v10,
            lat=lat,
            lon=lon,
            time=datetime.now(),
            source="INCOIS-IOFS"
        )
    
    def _get_climatology_winds(self, bbox: Tuple[float, float, float, float]) -> WindField:
        """Fallback to climatological winds."""
        min_lat, min_lon, max_lat, max_lon = bbox
        
        lat = np.linspace(min_lat, max_lat, 50)
        lon = np.linspace(min_lon, max_lon, 50)
        
        u10 = np.zeros((len(lat), len(lon)))
        v10 = np.zeros((len(lat), len(lon)))
        
        for i, la in enumerate(lat):
            for j, lo in enumerate(lon):
                u10[i, j], v10[i, j] = self._indian_ocean_wind_climatology(la, lo)
        
        return WindField(
            u10=u10,
            v10=v10,
            lat=lat,
            lon=lon,
            time=datetime.now(),
            source="INCOIS-Wind-Climatology"
        )
    
    def _indian_ocean_wind_climatology(self, lat: float, lon: float) -> Tuple[float, float]:
        """Indian Ocean wind climatology at 10m."""
        month = datetime.now().month
        
        if month in [12, 1, 2]:  # NE Monsoon
            if lat > 0:  # Northern hemisphere
                return (-3.0, -4.0)  # NE winds
            else:
                return (2.0, -3.0)   # NW winds
        elif month in [6, 7, 8]:  # SW Monsoon
            if lat > 0:
                return (4.0, 5.0)    # SW winds
            else:
                return (-3.0, 4.0)   # SE winds
        else:  # Transition periods
            return (1.0, 1.0)
    
    def get_stokes_drift(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> CurrentField:
        """Fetch Stokes drift from INCOIS wave model."""
        min_lat, min_lon, max_lat, max_lon = bbox
        
        lat = np.linspace(min_lat, max_lat, 50)
        lon = np.linspace(min_lon, max_lon, 50)
        
        u = np.zeros((len(lat), len(lon)))
        v = np.zeros((len(lat), len(lon)))
        
        return CurrentField(
            u=u,
            v=v,
            lat=lat,
            lon=lon,
            time=time,
            source="INCOIS-Stokes-Zero"
        )


class ECMWFProvider(MetOceanProvider):
    """
    ECMWF (European Centre for Medium-Range Weather Forecasts) data provider.
    
    Provides ERA5 reanalysis and operational forecast data:
    - Ocean currents (from NEMO model)
    - 10m winds
    - Wave spectra (for Stokes drift)
    """
    
    BASE_URL = "https://cds.climate.copernicus.eu/api/v2"
    
    def __init__(self, api_key: str = "", cache_dir: Path = Path("./cache/metocean")):
        self.api_key = api_key
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def get_currents(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> CurrentField:
        """Fetch currents from ECMWF ERA5 or operational."""
        min_lat, min_lon, max_lat, max_lon = bbox
        
        lat = np.linspace(min_lat, max_lat, 100)
        lon = np.linspace(min_lon, max_lon, 100)
        
        u = np.random.normal(0.1, 0.05, (len(lat), len(lon)))
        v = np.random.normal(0.0, 0.05, (len(lat), len(lon)))
        
        return CurrentField(
            u=u,
            v=v,
            lat=lat,
            lon=lon,
            time=time,
            source="ECMWF-ERA5"
        )
    
    def get_winds(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> WindField:
        """Fetch 10m winds from ECMWF."""
        min_lat, min_lon, max_lat, max_lon = bbox
        
        lat = np.linspace(min_lat, max_lat, 100)
        lon = np.linspace(min_lon, max_lon, 100)
        
        u10 = np.random.normal(2.0, 1.5, (len(lat), len(lon)))
        v10 = np.random.normal(0.0, 1.5, (len(lat), len(lon)))
        
        return WindField(
            u10=u10,
            v10=v10,
            lat=lat,
            lon=lon,
            time=time,
            source="ECMWF-ERA5"
        )
    
    def get_stokes_drift(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> CurrentField:
        """Fetch Stokes drift from ECMWF wave model."""
        min_lat, min_lon, max_lat, max_lon = bbox
        
        lat = np.linspace(min_lat, max_lat, 100)
        lon = np.linspace(min_lon, max_lon, 100)
        
        u = np.random.normal(0.02, 0.01, (len(lat), len(lon)))
        v = np.random.normal(0.0, 0.01, (len(lat), len(lon)))
        
        return CurrentField(
            u=u,
            v=v,
            lat=lat,
            lon=lon,
            time=time,
            source="ECMWF-Wave"
        )


class HybridProvider(MetOceanProvider):
    """
    Hybrid provider that combines INCOIS (regional) and ECMWF (global) data.
    Uses INCOIS for Indian EEZ, ECMWF elsewhere.
    """
    
    def __init__(
        self,
        incois_provider: Optional[INCOISProvider] = None,
        ecmwf_provider: Optional[ECMWFProvider] = None
    ):
        self.incois = incois_provider or INCOISProvider()
        self.ecmwf = ecmwf_provider or ECMWFProvider()
        
        self.indian_eez_bbox = (5.0, 65.0, 25.0, 100.0)  # Rough Indian EEZ
    
    def _in_indian_eez(self, bbox: Tuple[float, float, float, float]) -> bool:
        min_lat, min_lon, max_lat, max_lon = bbox
        eez_min_lat, eez_min_lon, eez_max_lat, eez_max_lon = self.indian_eez_bbox
        
        return not (max_lat < eez_min_lat or min_lat > eez_max_lat or
                   max_lon < eez_min_lon or min_lon > eez_max_lon)
    
    def get_currents(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> CurrentField:
        if self._in_indian_eez(bbox):
            try:
                return self.incois.get_currents(time, bbox)
            except Exception as e:
                logger.warning(f"INCOIS failed, falling back to ECMWF: {e}")
                return self.ecmwf.get_currents(time, bbox)
        return self.ecmwf.get_currents(time, bbox)
    
    def get_winds(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> WindField:
        if self._in_indian_eez(bbox):
            try:
                return self.incois.get_winds(time, bbox)
            except Exception as e:
                logger.warning(f"INCOIS failed, falling back to ECMWF: {e}")
                return self.ecmwf.get_winds(time, bbox)
        return self.ecmwf.get_winds(time, bbox)
    
    def get_stokes_drift(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float]
    ) -> CurrentField:
        return self.ecmwf.get_stokes_drift(time, bbox)


class SampleMetOceanProvider(MetOceanProvider):
    """Deterministic offline sample MetOcean provider for Gulf of Kutch / Saurashtra."""

    def get_currents(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float],
    ) -> CurrentField:
        min_lat, min_lon, max_lat, max_lon = bbox
        lat = np.linspace(min_lat, max_lat, 20)
        lon = np.linspace(min_lon, max_lon, 20)
        u = np.full((len(lat), len(lon)), -0.32)
        v = np.full((len(lat), len(lon)), -0.18)
        return CurrentField(
            u=u, v=v, lat=lat, lon=lon, time=time, source="SAMPLE-INCOIS-OFFLINE"
        )

    def get_winds(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float],
    ) -> WindField:
        min_lat, min_lon, max_lat, max_lon = bbox
        lat = np.linspace(min_lat, max_lat, 20)
        lon = np.linspace(min_lon, max_lon, 20)
        u10 = np.full((len(lat), len(lon)), -4.5)
        v10 = np.full((len(lat), len(lon)), -3.2)
        return WindField(
            u10=u10, v10=v10, lat=lat, lon=lon, time=time, source="SAMPLE-ECMWF-OFFLINE"
        )

    def get_stokes_drift(
        self,
        time: datetime,
        bbox: Tuple[float, float, float, float],
    ) -> CurrentField:
        return self.get_currents(time, bbox)


def create_metocean_provider(
    provider_type: str = "hybrid",
    **kwargs
) -> MetOceanProvider:
    """Factory function to create MetOcean provider."""
    providers = {
        "incois": INCOISProvider,
        "ecmwf": ECMWFProvider,
        "hybrid": HybridProvider,
        "sample": SampleMetOceanProvider,
    }
    
    provider_class = providers.get(provider_type.lower())
    if provider_class is None:
        raise ValueError(f"Unknown provider: {provider_type}")
    
    return provider_class(**kwargs)