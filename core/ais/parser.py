"""
AIS Data Ingestion and Processing Module
Handles live and historical AIS data for vessel correlation.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple, Iterator
from dataclasses import dataclass, field
from pathlib import Path
import logging
import json
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


@dataclass
class VesselPosition:
    """Single AIS position report."""
    mmsi: int
    timestamp: datetime
    lat: float
    lon: float
    sog: float  # Speed over ground (knots)
    cog: float  # Course over ground (degrees)
    heading: float  # True heading (degrees)
    nav_status: int  # Navigation status code
    vessel_type: int  # Vessel type code
    length: float = 0.0
    width: float = 0.0
    draft: float = 0.0
    destination: str = ""
    eta: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        return {
            "mmsi": self.mmsi,
            "timestamp": self.timestamp.isoformat(),
            "lat": self.lat,
            "lon": self.lon,
            "sog": self.sog,
            "cog": self.cog,
            "heading": self.heading,
            "nav_status": self.nav_status,
            "vessel_type": self.vessel_type,
            "length": self.length,
            "width": self.width,
            "draft": self.draft,
            "destination": self.destination,
        }


@dataclass
class VesselTrajectory:
    """Complete vessel trajectory with metadata."""
    mmsi: int
    positions: List[VesselPosition] = field(default_factory=list)
    vessel_type: int = 0
    vessel_name: str = ""
    callsign: str = ""
    flag: str = ""
    imo: int = 0
    
    def add_position(self, pos: VesselPosition):
        self.positions.append(pos)
        self.positions.sort(key=lambda p: p.timestamp)
    
    def get_positions_in_range(
        self,
        start_time: datetime,
        end_time: datetime,
        bbox: Optional[Tuple[float, float, float, float]] = None
    ) -> List[VesselPosition]:
        """Filter positions by time and optional bounding box."""
        filtered = [
            p for p in self.positions
            if start_time <= p.timestamp <= end_time
        ]
        
        if bbox:
            min_lat, min_lon, max_lat, max_lon = bbox
            filtered = [
                p for p in filtered
                if min_lat <= p.lat <= max_lat and min_lon <= p.lon <= max_lon
            ]
        
        return filtered
    
    def interpolate_position(self, timestamp: datetime) -> Optional[VesselPosition]:
        """Interpolate vessel position at given timestamp."""
        if not self.positions:
            return None
        
        times = np.array([p.timestamp.timestamp() for p in self.positions])
        target = timestamp.timestamp()
        
        if target <= times[0]:
            return self.positions[0]
        if target >= times[-1]:
            return self.positions[-1]
        
        idx = np.searchsorted(times, target)
        if idx == 0 or idx == len(times):
            return self.positions[0]
        
        t0, t1 = times[idx - 1], times[idx]
        p0, p1 = self.positions[idx - 1], self.positions[idx]
        
        alpha = (target - t0) / (t1 - t0)
        
        lat = p0.lat + alpha * (p1.lat - p0.lat)
        lon = p0.lon + alpha * (p1.lon - p0.lon)
        sog = p0.sog + alpha * (p1.sog - p0.sog)
        cog = p0.cog + alpha * (p1.cog - p0.cog)
        
        return VesselPosition(
            mmsi=self.mmsi,
            timestamp=timestamp,
            lat=lat,
            lon=lon,
            sog=sog,
            cog=cog,
            heading=p0.heading,
            nav_status=p0.nav_status,
            vessel_type=self.vessel_type
        )
    
    def detect_anomalies(self) -> List[Dict]:
        """Detect kinematic anomalies (tank-washing speeds, AIS gaps, etc.)."""
        anomalies = []
        
        for i in range(1, len(self.positions)):
            p0, p1 = self.positions[i - 1], self.positions[i]
            
            dt = (p1.timestamp - p0.timestamp).total_seconds() / 3600  # hours
            
            # AIS gap detection (> 4 hours)
            if dt > 4:
                anomalies.append({
                    "type": "ais_gap",
                    "mmsi": self.mmsi,
                    "start": p0.timestamp,
                    "end": p1.timestamp,
                    "duration_hours": dt,
                    "severity": "high" if dt > 12 else "medium"
                })
            
            # Tank-washing speed anomaly (4-8 knots at night)
            if 4.0 <= p1.sog <= 8.0 and 20 <= p1.timestamp.hour <= 5:
                anomalies.append({
                    "type": "tank_washing_speed",
                    "mmsi": self.mmsi,
                    "timestamp": p1.timestamp,
                    "speed": p1.sog,
                    "severity": "high"
                })
            
            # Sudden speed drop (> 50% in < 1 hour)
            if dt < 1 and p0.sog > 0:
                speed_change = (p1.sog - p0.sog) / p0.sog
                if speed_change < -0.5:
                    anomalies.append({
                        "type": "sudden_speed_drop",
                        "mmsi": self.mmsi,
                        "timestamp": p1.timestamp,
                        "speed_before": p0.sog,
                        "speed_after": p1.sog,
                        "change_pct": speed_change * 100,
                        "severity": "medium"
                    })
            
            # Suspicious course change (> 90 degrees in < 30 min)
            if dt < 0.5:
                course_change = abs((p1.cog - p0.cog + 180) % 360 - 180)
                if course_change > 90:
                    anomalies.append({
                        "type": "sharp_course_change",
                        "mmsi": self.mmsi,
                        "timestamp": p1.timestamp,
                        "course_change": course_change,
                        "severity": "medium"
                    })
        
        return anomalies


class AISParser(ABC):
    """Abstract base class for AIS data parsers."""
    
    @abstractmethod
    def parse(self, filepath: Path) -> Iterator[VesselPosition]:
        pass
    
    @abstractmethod
    def parse_stream(self, stream) -> Iterator[VesselPosition]:
        pass


class CSVParser(AISParser):
    """Parse AIS data from CSV files."""
    
    REQUIRED_COLUMNS = ["mmsi", "timestamp", "lat", "lon", "sog", "cog", "heading"]
    
    def parse(self, filepath: Path) -> Iterator[VesselPosition]:
        df = pd.read_csv(filepath)
        self._validate_columns(df)
        
        for _, row in df.iterrows():
            yield self._row_to_position(row)
    
    def parse_stream(self, stream) -> Iterator[VesselPosition]:
        df = pd.read_csv(stream)
        self._validate_columns(df)
        
        for _, row in df.iterrows():
            yield self._row_to_position(row)
    
    def _validate_columns(self, df: pd.DataFrame):
        missing = set(self.REQUIRED_COLUMNS) - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}")
    
    def _row_to_position(self, row: pd.Series) -> VesselPosition:
        return VesselPosition(
            mmsi=int(row["mmsi"]),
            timestamp=pd.to_datetime(row["timestamp"]),
            lat=float(row["lat"]),
            lon=float(row["lon"]),
            sog=float(row.get("sog", 0)),
            cog=float(row.get("cog", 0)),
            heading=float(row.get("heading", 0)),
            nav_status=int(row.get("nav_status", 0)),
            vessel_type=int(row.get("vessel_type", 0)),
            length=float(row.get("length", 0)),
            width=float(row.get("width", 0)),
            draft=float(row.get("draft", 0)),
            destination=str(row.get("destination", "")),
            eta=pd.to_datetime(row["eta"]) if "eta" in row and pd.notna(row["eta"]) else None
        )


class JSONParser(AISParser):
    """Parse AIS data from JSON/JSONL files."""
    
    def parse(self, filepath: Path) -> Iterator[VesselPosition]:
        with open(filepath) as f:
            if filepath.suffix == ".jsonl":
                for line in f:
                    yield self._dict_to_position(json.loads(line))
            else:
                data = json.load(f)
                for item in data:
                    yield self._dict_to_position(item)
    
    def parse_stream(self, stream) -> Iterator[VesselPosition]:
        for line in stream:
            yield self._dict_to_position(json.loads(line))
    
    def _dict_to_position(self, data: Dict) -> VesselPosition:
        return VesselPosition(
            mmsi=int(data["mmsi"]),
            timestamp=datetime.fromisoformat(data["timestamp"]),
            lat=float(data["lat"]),
            lon=float(data["lon"]),
            sog=float(data.get("sog", 0)),
            cog=float(data.get("cog", 0)),
            heading=float(data.get("heading", 0)),
            nav_status=int(data.get("nav_status", 0)),
            vessel_type=int(data.get("vessel_type", 0)),
            length=float(data.get("length", 0)),
            width=float(data.get("width", 0)),
            draft=float(data.get("draft", 0)),
            destination=data.get("destination", ""),
            eta=datetime.fromisoformat(data["eta"]) if data.get("eta") else None
        )


class AISDatabase:
    """In-memory AIS database with spatial-temporal indexing."""
    
    def __init__(self):
        self.vessels: Dict[int, VesselTrajectory] = {}
        self._vessel_type_cache: Dict[int, int] = {}
    
    def add_position(self, pos: VesselPosition):
        if pos.mmsi not in self.vessels:
            self.vessels[pos.mmsi] = VesselTrajectory(mmsi=pos.mmsi)
            self.vessels[pos.mmsi].vessel_type = pos.vessel_type
        
        self.vessels[pos.mmsi].add_position(pos)
    
    def load_from_csv(self, filepath: Path, parser: Optional[CSVParser] = None):
        parser = parser or CSVParser()
        for pos in parser.parse(filepath):
            self.add_position(pos)
        logger.info(f"Loaded {len(self.vessels)} vessels from {filepath}")
    
    def get_vessels_in_area(
        self,
        timestamp: datetime,
        bbox: Tuple[float, float, float, float],
        time_window_hours: float = 6
    ) -> List[VesselTrajectory]:
        """Get all vessels that were in bbox around timestamp."""
        min_lat, min_lon, max_lat, max_lon = bbox
        start = timestamp - timedelta(hours=time_window_hours)
        end = timestamp + timedelta(hours=time_window_hours)
        
        result = []
        for vessel in self.vessels.values():
            positions = vessel.get_positions_in_range(start, end, bbox)
            if positions:
                result.append(vessel)
        
        return result
    
    def get_vessel_at_time(self, mmsi: int, timestamp: datetime) -> Optional[VesselPosition]:
        """Get interpolated position of vessel at specific time."""
        if mmsi not in self.vessels:
            return None
        return self.vessels[mmsi].interpolate_position(timestamp)
    
    def get_all_anomalies(self) -> Dict[int, List[Dict]]:
        """Get anomalies for all vessels."""
        anomalies = {}
        for mmsi, vessel in self.vessels.items():
            vessel_anomalies = vessel.detect_anomalies()
            if vessel_anomalies:
                anomalies[mmsi] = vessel_anomalies
        return anomalies


VESSEL_TYPE_PRIORS = {
    # Tankers - highest risk
    80: 1.0,   # Tanker
    81: 1.0,   # Tanker - Hazardous category A
    82: 1.0,   # Tanker - Hazardous category B
    83: 1.0,   # Tanker - Hazardous category C
    84: 1.0,   # Tanker - Hazardous category D
    85: 0.9,   # Tanker - Chemical
    86: 0.9,   # Tanker - Liquefied gas
    87: 0.9,   # Tanker - Crude oil
    88: 0.9,   # Tanker - Products
    89: 0.9,   # Tanker - Other
    
    # Cargo - moderate risk
    70: 0.6,   # Cargo
    71: 0.5,   # Cargo - Hazardous A
    72: 0.5,   # Cargo - Hazardous B
    73: 0.5,   # Cargo - Hazardous C
    74: 0.5,   # Cargo - Hazardous D
    75: 0.5,   # Cargo - Other
    76: 0.5,   # Cargo - Container
    77: 0.5,   # Cargo - Ro-Ro
    78: 0.5,   # Cargo - Bulk
    79: 0.5,   # Cargo - Other
    
    # Passenger - low risk
    60: 0.2,   # Passenger
    61: 0.2,   # Passenger - Hazardous
    62: 0.2,   # Passenger - Other
    
    # Fishing - very low risk
    30: 0.1,   # Fishing
    31: 0.1,   # Fishing - Trawling
    32: 0.1,   # Fishing - Other
    
    # Other
    90: 0.3,   # Other
    91: 0.3,   # Other - Hazardous
    99: 0.3,   # Other
    
    # Default
    0: 0.3,
}


def get_vessel_prior(vessel_type: int) -> float:
    """Get prior risk score for vessel type."""
    return VESSEL_TYPE_PRIORS.get(vessel_type, 0.3)


def get_vessel_type_name(vessel_type: int) -> str:
    """Get human-readable vessel type name."""
    names = {
        80: "Tanker",
        81: "Tanker (Haz A)",
        82: "Tanker (Haz B)",
        83: "Tanker (Haz C)",
        84: "Tanker (Haz D)",
        85: "Chemical Tanker",
        86: "LNG/LPG Tanker",
        87: "Crude Oil Tanker",
        88: "Product Tanker",
        70: "Cargo",
        76: "Container Ship",
        78: "Bulk Carrier",
        30: "Fishing Vessel",
        60: "Passenger Ship",
        90: "Other",
    }
    return names.get(vessel_type, f"Type {vessel_type}")