"""
AIS Data Ingestion and Processing Module
Handles live and historical AIS data for vessel correlation.
"""

import csv
import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple

import numpy as np

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    pd = None
    HAS_PANDAS = False

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

    def detect_blackout_gaps(self, min_gap_seconds: int = 1800) -> List[Dict]:
        """Detect intentional or suspicious AIS blackout gaps (transponder silence)."""
        gaps = []
        for i in range(1, len(self.positions)):
            p0, p1 = self.positions[i - 1], self.positions[i]
            dt = (p1.timestamp - p0.timestamp).total_seconds()
            if dt >= min_gap_seconds:
                dist_km = float(np.sqrt((p1.lat - p0.lat)**2 + (p1.lon - p0.lon)**2) * 111.0)
                gaps.append({
                    "mmsi": self.mmsi,
                    "gapStart": p0.timestamp.isoformat(),
                    "gapEnd": p1.timestamp.isoformat(),
                    "durationMinutes": round(dt / 60.0, 1),
                    "distanceKm": round(dist_km, 2),
                    "isNocturnal": bool(20 <= p0.timestamp.hour or p0.timestamp.hour <= 5),
                    "startLat": p0.lat,
                    "startLon": p0.lon,
                    "endLat": p1.lat,
                    "endLon": p1.lon,
                })
        return gaps


class AISParser(ABC):
    """Abstract base class for AIS data parsers."""
    
    @abstractmethod
    def parse(self, filepath: Path) -> Iterator[VesselPosition]:
        pass
    
    @abstractmethod
    def parse_stream(self, stream) -> Iterator[VesselPosition]:
        pass


class CSVParser(AISParser):
    """Parse AIS data from CSV files using standard library csv module."""

    REQUIRED_COLUMNS = {"mmsi", "timestamp", "lat", "lon", "sog", "cog", "heading"}

    def parse(self, filepath: Path) -> Iterator[VesselPosition]:
        with open(filepath, "r", encoding="utf-8") as f:
            yield from self.parse_stream(f)

    def parse_stream(self, stream) -> Iterator[VesselPosition]:
        reader = csv.DictReader(stream)
        if reader.fieldnames:
            missing = self.REQUIRED_COLUMNS - set(reader.fieldnames)
            if missing:
                raise ValueError(f"Missing required columns: {missing}")
        for row in reader:
            yield self._row_to_position(row)

    def _row_to_position(self, row: Dict[str, Any]) -> VesselPosition:
        ts_str = str(row["timestamp"])
        try:
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        except Exception:
            ts = datetime.now()

        eta_dt = None
        if row.get("eta"):
            try:
                eta_dt = datetime.fromisoformat(str(row["eta"]).replace("Z", "+00:00"))
            except Exception:
                eta_dt = None

        return VesselPosition(
            mmsi=int(row["mmsi"]),
            timestamp=ts,
            lat=float(row["lat"]),
            lon=float(row["lon"]),
            sog=float(row.get("sog") or 0.0),
            cog=float(row.get("cog") or 0.0),
            heading=float(row.get("heading") or 0.0),
            nav_status=int(row.get("nav_status") or 0),
            vessel_type=int(row.get("vessel_type") or 0),
            length=float(row.get("length") or 0.0),
            width=float(row.get("width") or 0.0),
            draft=float(row.get("draft") or 0.0),
            destination=str(row.get("destination") or ""),
            eta=eta_dt,
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


class AISProvider(ABC):
    """Abstract base provider for AIS vessel intelligence."""

    @abstractmethod
    def get_vessels_in_area(
        self,
        timestamp: datetime,
        bbox: Tuple[float, float, float, float],
        time_window_hours: float = 6.0,
    ) -> List[VesselTrajectory]:
        """Fetch all vessel trajectories within bbox around timestamp."""
        pass

    @abstractmethod
    def get_vessel(self, mmsi: int) -> Optional[VesselTrajectory]:
        """Fetch a specific vessel trajectory by MMSI."""
        pass


class AIVDMParser(AISParser):
    """ITU-R M.1371 NMEA AIVDM single-sentence parser for Class A position reports."""

    @staticmethod
    def _char_to_6bit(c: str) -> int:
        val = ord(c) - 48
        if val > 40:
            val -= 8
        return val & 0x3F

    @classmethod
    def decode_payload_bits(cls, payload: str) -> str:
        bits = []
        for c in payload:
            bits.append(f"{cls._char_to_6bit(c):06b}")
        return "".join(bits)

    @classmethod
    def parse_sentence(cls, sentence: str, timestamp: Optional[datetime] = None) -> Optional[VesselPosition]:
        """Parse a single !AIVDM sentence (Type 1, 2, or 3 Position Report)."""
        sentence = sentence.strip()
        if not (sentence.startswith("!AIVDM") or sentence.startswith("!AIVDO")):
            return None
        parts = sentence.split(",")
        if len(parts) < 6:
            return None
        payload = parts[5]
        bitstr = cls.decode_payload_bits(payload)
        if len(bitstr) < 137:
            return None

        msg_type = int(bitstr[0:6], 2)
        if msg_type not in (1, 2, 3):
            return None

        mmsi = int(bitstr[8:38], 2)
        nav_status = int(bitstr[38:42], 2)
        sog_raw = int(bitstr[50:60], 2)
        sog = sog_raw / 10.0 if sog_raw < 1023 else 0.0

        lon_raw = int(bitstr[61:89], 2)
        if lon_raw & (1 << 27):
            lon_raw -= (1 << 28)
        lon = lon_raw / 600000.0

        lat_raw = int(bitstr[89:116], 2)
        if lat_raw & (1 << 26):
            lat_raw -= (1 << 27)
        lat = lat_raw / 600000.0

        cog_raw = int(bitstr[116:128], 2)
        cog = cog_raw / 10.0 if cog_raw < 3600 else 0.0

        heading_raw = int(bitstr[128:137], 2)
        heading = float(heading_raw) if heading_raw < 511 else cog

        return VesselPosition(
            mmsi=mmsi,
            timestamp=timestamp or datetime.now(),
            lat=round(lat, 5),
            lon=round(lon, 5),
            sog=round(sog, 1),
            cog=round(cog, 1),
            heading=round(heading, 1),
            nav_status=nav_status,
            vessel_type=80,
        )

    def parse(self, filepath: Path) -> Iterator[VesselPosition]:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                pos = self.parse_sentence(line)
                if pos:
                    yield pos

    def parse_stream(self, stream) -> Iterator[VesselPosition]:
        for line in stream:
            pos = self.parse_sentence(line)
            if pos:
                yield pos


class LiveAISStreamProvider(AISProvider):
    """Live streaming provider that ingests AIVDM, JSONL, or CSV lines into an in-memory AIS database."""

    def __init__(self) -> None:
        self.db = AISDatabase()
        self.aivdm_parser = AIVDMParser()

    def ingest_line(self, line: str, timestamp: Optional[datetime] = None) -> Optional[VesselPosition]:
        line = line.strip()
        if not line:
            return None
        pos = None
        if line.startswith("!AIVDM") or line.startswith("!AIVDO"):
            pos = self.aivdm_parser.parse_sentence(line, timestamp=timestamp)
        elif line.startswith("{"):
            data = json.loads(line)
            pos = VesselPosition(
                mmsi=int(data["mmsi"]),
                timestamp=datetime.fromisoformat(data["timestamp"]),
                lat=float(data["lat"]),
                lon=float(data["lon"]),
                sog=float(data.get("sog", 0)),
                cog=float(data.get("cog", 0)),
                heading=float(data.get("heading", 0)),
                nav_status=int(data.get("nav_status", 0)),
                vessel_type=int(data.get("vessel_type", 0)),
            )
        if pos:
            self.db.add_position(pos)
        return pos

    def get_vessels_in_area(
        self,
        timestamp: datetime,
        bbox: Tuple[float, float, float, float],
        time_window_hours: float = 6.0,
    ) -> List[VesselTrajectory]:
        return self.db.get_vessels_in_area(timestamp, bbox, time_window_hours)

    def get_vessel(self, mmsi: int) -> Optional[VesselTrajectory]:
        return self.db.vessels.get(mmsi)


class SampleAISProvider(AISProvider):
    """Deterministic sample provider wrapping mock maritime scenes for demos and testing."""

    def __init__(self) -> None:
        self.db = AISDatabase()
        self._load_sample_data()

    def _load_sample_data(self) -> None:
        try:
            from data.sample_scenes import MOCK_AIS_VESSELS
            base_time = datetime(2026, 9, 11, 10, 30)
            for v in MOCK_AIS_VESSELS:
                mmsi = int(v["mmsi"])
                traj = VesselTrajectory(
                    mmsi=mmsi,
                    vessel_type=80 if "TANKER" in v.get("vesselType", "") else 70,
                    vessel_name=v.get("vesselName", f"Vessel-{mmsi}"),
                    imo=int(v.get("imo", 0)),
                    flag=v.get("flag", "IN"),
                )
                lat0 = float(v.get("latitude", 21.84))
                lon0 = float(v.get("longitude", 69.11))
                sog0 = float(v.get("speedOverGround", 12.0))
                cog0 = float(v.get("courseOverGround", 240.0))

                for step in range(12):
                    t = base_time - timedelta(minutes=step * 30)
                    dt_hr = step * 0.5
                    lat = lat0 - (sog0 * 1852.0 / 111139.0) * dt_hr * np.cos(np.radians(cog0))
                    lon = lon0 - (sog0 * 1852.0 / (111139.0 * np.cos(np.radians(lat0)))) * dt_hr * np.sin(np.radians(cog0))
                    sog = 4.7 if (mmsi == 419001234 and 3 <= step <= 6) else sog0
                    pos = VesselPosition(
                        mmsi=mmsi,
                        timestamp=t,
                        lat=round(lat, 5),
                        lon=round(lon, 5),
                        sog=round(sog, 1),
                        cog=round(cog0, 1),
                        heading=round(cog0, 1),
                        nav_status=0,
                        vessel_type=traj.vessel_type,
                    )
                    traj.add_position(pos)
                self.db.vessels[mmsi] = traj
        except Exception as exc:
            logger.warning("Failed to initialize sample AIS provider: %s", exc)

    def get_vessels_in_area(
        self,
        timestamp: datetime,
        bbox: Tuple[float, float, float, float],
        time_window_hours: float = 6.0,
    ) -> List[VesselTrajectory]:
        vessels = self.db.get_vessels_in_area(timestamp, bbox, time_window_hours)
        if not vessels:
            return list(self.db.vessels.values())
        return vessels

    def get_vessel(self, mmsi: int) -> Optional[VesselTrajectory]:
        return self.db.vessels.get(mmsi)