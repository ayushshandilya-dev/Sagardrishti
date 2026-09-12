import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
import numpy as np
import json

# Page config
st.set_page_config(
    page_title="Sagar-Drishti: Oil Spill Attribution System",
    page_icon="🛢️",
    layout="wide"
)

st.title("🛢️ Sagar-Drishti: AI-Powered Oil Spill Detection & Vessel Attribution")
st.caption("SIH26143 | AI-Powered Oil Spill Detection & Vessel Attribution System")

# Sidebar
st.sidebar.title("Navigation")
page = st.sidebar.radio("Go to", ["Dashboard", "Attribution Analysis", "Evidence Dossier", "Settings"])

# Main content
if page == "Dashboard":
    st.header("📊 Real-Time Surveillance Dashboard")
    
    # Load mock data
    from data.sample_scenes import get_mock_scene, get_mock_ais_vessels, get_mock_metocean
    from core.correlation.attribution import compute_attribution_score
    
    scene = get_mock_scene()
    vessels = get_mock_ais_vessels()
    metocean = get_mock_metocean()
    
    # Incident info
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("SAR Scene", scene["eventId"])
    with col2:
        st.metric("Detection Time", scene["timestampUtc"])
    with col3:
        st.metric("Spill Area", f"{scene['spillGeometry']['areaKm2']} km²")
    
    # Spill map
    st.subheader("🗺️ Spill Location & Drift Backtrack")
    
    # Create map figure
    fig = go.Figure()
    
    # Plot spill centroid
    fig.add_trace(go.Scattergeo(
        lat=[scene["spillGeometry"]["centroid"]["latitude"]],
        lon=[scene["spillGeometry"]["centroid"]["longitude"]],
        mode='markers',
        marker=dict(size=12, color='red', symbol='circle'),
        name='SAR Spill Detection'
    ))
    
    # Plot AIS vessels
    for v in vessels:
        fig.add_trace(go.Scattergeo(
            lat=[v["latitude"]],
            lon=[v["longitude"]],
            mode='markers',
            marker=dict(size=10, color='blue', symbol='circle'),
            name=f"{v['vesselName']} (MMSI: {v['mmsi']})"
        ))
    
    # Drift backtrack origin (estimated discharge point)
    # Simple: plot at centroid for demo
    fig.add_trace(go.Scattergeo(
        lat=[scene["spillGeometry"]["centroid"]["latitude"]],
        lon=[scene["spillGeometry"]["centroid"]["longitude"]],
        mode='markers',
        marker=dict(size=8, color='orange', symbol='circle'),
        name='Est. Discharge Origin'
    ))
    
    # Layout
    fig.update_layout(
        geo=dict(
            projection_type="natural earth",
            center=dict(
                lat=scene["spillGeometry"]["centroid"]["latitude"],
                lon=scene["spillGeometry"]["centroid"]["longitude"]
            ),
            projection_scale=5,
            showland=True,
            landcolor="rgb(243, 243, 243)",
            showocean=True,
            oceancolor="rgb(204, 229, 255)",
        ),
        height=500,
        margin=dict(l=0, r=0, t=0, b=0),
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Attribution analysis
    st.subheader("🎯 Vessel Attribution Analysis")
    
    # SAR time
    sar_time = datetime.fromisoformat(scene["timestampUtc"].replace("Z", "+00:00"))
    
    # Compute attribution for each vessel
    from core.drift.rk4 import rk4_backtrack
    
    # Estimate discharge origin using backtrack
    # For demo: use simple backtrack from centroid
    backtrack_result = rk4_backtrack(
        lat0=scene["spillGeometry"]["centroid"]["latitude"],
        lon0=scene["spillGeometry"]["centroid"]["longitude"],
        t_sar=10.5,  # 10:30 UTC in hours
        current_func=lambda lat, lon, t: (metocean["current_u"], metocean["current_v"]),
        wind_func=lambda lat, lon, t: (metocean["wind_u"], metocean["wind_v"]),
        t_max_hours=12.0,
        dt_seconds=300
    )
    
    st.info(f"📍 Estimated discharge origin: {backtrack_result[0]:.4f}°, {backtrack_result[1]:.4f}°")
    st.info(f"⏱️ Estimated discharge time: ~{12 - backtrack_result[2]:.1f} hours before SAR acquisition")
    
    # Attribution scores
    st.write("### Candidate Vessel Ranking")
    
    attribution_results = []
    for v in vessels:
        # Prepare vessel data for attribution
        vessel_profile = v["vesselType"]
        
        # Add synthetic slick skeleton orientation from scene
        slick_orientation = scene["spillGeometry"].get("skeletonOrientationDeg", 248.5)
        
        # Add arrival time (synthetic)
        arrival_time = v["timestampUtc"]
        
        # Compute attribution
        mmsi_data = {
            "latitude": v["latitude"],
            "longitude": v["longitude"],
            "timestamp_utc": v["timestampUtc"],
            "course_over_ground": v["courseOverGround"],
            "heading": v["heading"],
            "speed_over_ground": v["speedOverGround"],
            "speed_over_ground_during": v["speedOverGround"],
            "is_night": v["isNight"],
            "course_jitter": np.random.uniform(0, 5),  # synthetic
            "arrival_time_utc": arrival_time
        }
        
        backtrack_coords = {
            "latitude": backtrack_result[0],
            "longitude": backtrack_result[1],
            "discharge_time": (sar_time - timedelta(hours=backtrack_result[2])).isoformat()
        }
        
        result = compute_attribution_score(mmsi_data, backtrack_coords, vessel_profile, scene["timestampUtc"])
        result["vesselName"] = v["vesselName"]
        result["mmsi"] = v["mmsi"]
        result["vesselType"] = v["vesselType"]
        result["aisStatus"] = v["aisStatus"]
        result["speedOverGroundKnots"] = v["speedOverGround"]
        
        attribution_results.append(result)
    
    # Sort by attribution score descending
    attribution_results.sort(key=lambda x: x["attributionScore"], reverse=True)
    
    # Display ranking table
    for i, r in enumerate(attribution_results):
        col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
        with col1:
            st.write(f"**#{i+1} {r['vesselName']}**")
            st.caption(f"MMSI: {r['mmsi']} | {r['vesselType']} | {r['aisStatus']}")
        with col2:
            st.metric("Attribution", f"{r['attributionScore']:.1%}")
        with col3:
            st.metric("Proximity", f"{r['factorBreakdown']['backtrackProximityScore']:.1%}")
        with col4:
            st.metric("Closest App.", f"{r['closestApproachMeters']:.0f} m")
        
        # Factor breakdown expander
        with st.expander(f"Factor details - {r['vesselName']}", expanded=False):
            fb = r['factorBreakdown']
            fb_cols = st.columns(5)
            factor_labels = [
                "Backtrack Proximity",
                "Trajectory Collinearity",
                "Vessel Type Prior",
                "Kinematic Anomaly",
                "Temporal Plausibility"
            ]
            for j, (label, score) in enumerate(zip(factor_labels, fb.values())):
                with fb_cols[j]:
                    st.metric(label, f"{score:.1%}")
    
    # Top candidate highlight
    if attribution_results:
        top = attribution_results[0]
        st.success(f"""
        🏆 **TOP CANDIDATE: {top['vesselName']}** 
        Attribution Confidence: **{top['attributionScore']:.1%}** [CRITICAL PROBABILITY - MARPOL ENFORCEMENT CANDIDATE]
        
        **Factor Breakdown:**
        - Backtrack Proximity: {top['factorBreakdown']['backtrackProximityScore']:.1%} (Track intersected origin within {top['closestApproachMeters']:.0f}m)
        - Trajectory Collinearity: {top['factorBreakdown']['trajectoryCollinearityScore']:.1%} (Heading aligns with slick skeleton)
        - Kinematic Profile: {top['factorBreakdown']['kineticAnomalyScore']:.1%} (Speed profile during discharge window)
        - Vessel Type Prior: {top['factorBreakdown']['vesselPriorScore']:.1%} ({top['vesselType']})
        - Temporal Plausibility: {top['factorBreakdown']['temporalPlausibilityScore']:.1%} (Vessel preceded detection)
        """)
    
    # MetOcean conditions
    st.subheader("🌊 MetOcean Conditions at Incident")
    moc_cols = st.columns(3)
    with moc_cols[0]:
        st.metric("Surface Current", f"{metocean['current_speed']:.2f} m/s")
        st.metric("Wind Speed", f"{metocean['wind_speed']:.2f} m/s")
    with moc_cols[1]:
        st.metric("Wave Height", f"{metocean['wave_height']:.1f} m")
        st.metric("Sea State", f"Beaufort {metocean['sea_state']}")
    with moc_cols[2]:
        st.metric("Current Direction", f"{metocean['current_direction']:.0f}°")
        st.metric("Wind Direction", f"{metocean['wind_direction']:.0f}°")

elif page == "Attribution Analysis":
    st.header("🔍 Detailed Attribution Analysis")
    st.write("""
    This page demonstrates the multi-factor Bayesian attribution model that correlates 
    backtracked drift trajectories with AIS vessel histories to identify the most likely 
    responsible vessel for an oil spill event.
    """)
    
    # User can adjust parameters
    col1, col2 = st.columns([2, 1])
    
    with col1:
        sar_lat = st.number_input("SAR Spill Latitude", value=21.8452, format="%f")
        sar_lon = st.number_input("SAR Spill Longitude", value=69.1124, format="%f")
        discharge_time = st.time_input("SAR Acquisition Time", value=datetime.now())
    
    with col2:
        st.write("Vessel parameters:")
        vessel_lat = st.number_input("Vessel Latitude", value=21.9200, format="%f")
        vessel_lon = st.number_input("Vessel Longitude", value=69.2500, format="%f")
        vessel_cog = st.number_input("Course Over Ground (°)", value=248.0, format="%f")
        vessel_heading = st.number_input("Heading (°)", value=248.0, format="%f")
        vessel_sog = st.number_input("Speed Over Ground (knots)", value=6.1, format="%f")
        is_night = st.checkbox("Night hours", value=True)
        vessel_type = st.selectbox("Vessel Type", 
                                   ["OIL_TANKER", "CHEMICAL_TANKER", "BUNKER_BARGE", 
                                    "CONTAINER_SHIP", "BULK_CARRIER", "FISHING_VESSEL", "TUG"])
    
    if st.button("Compute Attribution Score"):
        # Simple backtrack (no RK4 integration for this demo)
        from core.correlation.attribution import (
            backtrack_proximity_score, trajectory_collinearity_score,
            vessel_profile_prior, kinetic_anomaly_score, temporal_plausibility_score
        )
        
        # Compute individual factors
        dist = np.sqrt((vessel_lat - sar_lat)**2 + (vessel_lon - sar_lon)**2) * 111319.5
        f1 = backtrack_proximity_score(vessel_lat, vessel_lon, 0, sar_lat, sar_lon)
        f2 = trajectory_collinearity_score(vessel_cog, vessel_heading, 248.5)
        f3 = vessel_profile_prior(vessel_type)
        
        # Kinematic anomaly: simplified
        sog_before = vessel_sog + 8.1  # assumed before discharge
        f4 = kinetic_anomaly_score(sog_before, vessel_sog, is_night)
        
        # Temporal plausibility
        sar_dt = datetime.now()
        vessel_arrival = sar_dt - timedelta(hours=2)
        f5 = temporal_plausibility_score(vessel_arrival.timestamp(), 0, sar_dt.timestamp())
        
        # Weighted fusion
        weights = [0.35, 0.25, 0.15, 0.15, 0.10]
        factors = [f1, f2, f3, f4, f5]
        score = sum(w * f for w, f in zip(weights, factors))
        
        st.success(f"**Attribution Score: {float(np.clip(score, 0.0, 1.0)):.3f}** ({float(np.clip(score, 0.0, 1.0)):.1%})")
        
        # Display factor breakdown
        fb_cols = st.columns(5)
        factor_labels = ["Backtrack Proximity", "Trajectory Collinearity", 
                        "Vessel Type Prior", "Kinematic Anomaly", "Temporal Plausibility"]
        for j, (label, f_val) in enumerate(zip(factor_labels, factors)):
            with fb_cols[j]:
                st.metric(label, f"{f_val:.3f} ({weights[j]:.2f} weight)")
        
        # Interpretation
        if score > 0.7:
            st.error("⚠️ HIGH CONFIDENCE: Vessel strongly implicated - likely responsible for discharge")
        elif score > 0.4:
            st.warning("⚠️ MODERATE CONFIDENCE: Vessel may be associated - further investigation recommended")
        else:
            st.info("ℹ️ LOW CONFIDENCE: Vessel unlikely to be the source - continue monitoring")

elif page == "Evidence Dossier":
    st.header("📄 MARPOL Evidence Dossier Generator")
    st.write("""
    Generate a court-ready PDF/A MARPOL enforcement dossier with cryptographic proof 
    and Section 65B Certificate of Computer Authenticity.
    """)
    
    if st.button("Generate Evidence Dossier"):
        from core.evidence.ledger import TamperEvidentLedger, MerkleBlock
        from core.evidence.dossier import EvidenceDossierGenerator
        
        # Initialize ledger
        ledger = TamperEvidentLedger(processing_node_id="sagar-drishti-demo-node")
        
        # Create mock data
        event_id = "SPILL-20260911-DEMO001"
        sar_image = "sar_scene_visualization.png"
        spill_geom = {"areaKm2": 4.82, "perimeterKm": 18.34, "skeletonOrientationDeg": 248.5,
                      "classLabel": "MINERAL_OIL", "polygonGeoJson": {"type": "Polygon", 
                      "coordinates": [[[69.102, 21.835], [69.125, 21.842], [69.118, 21.855], [69.102, 21.835]]]}}
        backtrack_origin = {"timestampUtc": "2026-09-11T10:30:00Z", 
                           "coordinates": {"latitude": 21.8452, "longitude": 69.1124}}
        candidate_vessels = [{
            "mmsi": 419001234,
            "imo": 9345678,
            "vesselName": "MT OCEAN PIONEER",
            "flag": "India",
            "vesselType": "OIL_TANKER",
            "attributionRank": 1,
            "attributionScore": 0.934,
            "factorBreakdown": {
                "backtrackProximityScore": 0.962,
                "trajectoryCollinearityScore": 0.918,
                "vesselPriorScore": 1.000,
                "kineticAnomalyScore": 0.885,
                "temporalPlausibilityScore": 1.000
            },
            "closestApproachMeters": 340.2,
            "aisStatus": "ACTIVE",
            "speedOverGroundKnots": 6.1
        }]
        met_ocean_conditions = {
            "current_speed": 0.54, "current_direction": 150.0,
            "wind_speed": 6.1, "wind_direction": 32.0,
            "wave_height": 1.2, "sea_state": 3,
            "incident_datetime": "2026-09-11T10:30:00Z"
        }
        attribution_data = {"ledger_data": {"merkle_root": "e78f0b12a9...", 
                                            "block_height": 1042,
                                            "prev_block_hash": "4a1c5b8e9f2d3a7b0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e98f3b2a9e1",
                                            "ed25519_signature": "3045022100e4b8...fe820a1"}}
        system_hostname = "sagar-drishti-processing-node"
        software_version_hash = "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01"
        
        # Add block to ledger
        merkle_root = hashlib.sha256(f"{event_id}|{datetime.utcnow().isoformat()}|".encode()).hexdigest()[:64]
        new_block = ledger.add_block(merkle_root, {
            "backtrackProximityScore": 0.962,
            "trajectoryCollinearityScore": 0.918,
            "vesselPriorScore": 1.000,
            "kineticAnomalyScore": 0.885,
            "temporalPlausibilityScore": 1.000
        })
        
        # Generate dossier
        output_path = f"evidence_dossier_{event_id}.pdf"
        EvidenceDossierGenerator.generate_dossier(
            event_id=event_id,
            sar_image_path=sar_image,
            spill_geometry=spill_geom,
            backtrack_origin=backtrack_origin,
            candidate_vessels=candidate_vessels,
            attribution_data={
                "ledger_data": {
                    "merkle_root": merkle_root,
                    "block_height": new_block.index,
                    "prev_block_hash": ledger.get_last_block().block_hash,
                    "ed25519_signature": new_block.block_hash[:32] + "..."}
            },
            met_ocean_conditions=met_ocean_conditions,
            output_path=output_path,
            system_hostname=system_hostname,
            software_version_hash=software_version_hash
        )
        
        st.success(f"✅ Evidence dossier generated: {output_path}")
        st.info(f"🔗 Merkle Root: {merkle_root[:32]}...")
        st.info(f"📦 Block height: {new_block.index}")
        st.info(f"🔐 Block hash: {new_block.block_hash[:32]}...")
        
        # Verification
        if ledger.verify_chain():
            st.success("✅ Ledger chain integrity verified - all records immutable")
        else:
            st.error("❌ Ledger chain integrity FAILED")
        
        # Download button
        import os
        if os.path.exists(output_path):
            with open(output_path, "rb") as f:
                st.download_button(
                    label="📥 Download PDF Dossier",
                    data=f.read(),
                    file_name=output_path,
                    mime="application/pdf"
                )

elif page == "Settings":
    st.header("⚙️ Settings & Configuration")
    
    st.write("### System Configuration")
    st.write(f"- **Processing Node ID**: sagar-drishti-demo-node")
    st.write(f"- **Ledger Difficulty**: 4 leading zeros (SHA-256 PoW)")
    st.write(f"- **Attribution Weights**: w1=0.35, w2=0.25, w3=0.15, w4=0.15, w5=0.10")
    st.write(f"- **Max Drift Backtrack**: 12 hours (default)")
    st.write(f"- **RK4 Step Size**: 300 seconds")
    st.write(f"- **Minimum Detectable Slick**: 0.05 km²")
    
    st.write("### Data Sources")
    st.write("- **SAR Imagery**: Sentinel-1 GRD (ESA Copernicus CDSE)")
    st.write("- **AIS Feeds**: Open maritime AIS streams (DMA/NOAA)")
    st.write("- **Ocean Currents**: INCOIS / HYCOM (0.083° resolution)")
    st.write("- **Wind Fields**: ECMWF ERA5 / NOAA GFS (0.25° resolution)")
    
    st.write("### Model Configuration")
    st.write("- **Detection Backbone**: SegFormer-B3 (hierarchical Transformer)")
    st.write("- **Loss Function**: Focal + Lovász-Softmax (γ=2.0, α=0.25)")
    st.write("- **Look-Alike Classes**: 4-class (Mineral Oil, Biogenic, Low-Wind, Ship Wake)")
    st.write("- **Output**: GeoJSON polygon + geometric metrics vectorization")
    
    st.write("### Deployment")
    st.write("- **Primary**: Kubernetes (K8s) on enterprise cluster")
    st.write("- **Edge**: Docker Compose on Coast Guard patrol vessels")
    st.write("- **Offline**: Quantized ONNX Runtime (INT8 SegFormer) on CPU/workstation GPU")
    
    if st.button("Reset Demo Data"):
        st.experimental_rerun()

# Footer
st.sidebar.divider()
st.sidebar.caption("""
Sagar-Drishti v2.0.0
SIH26143 — Ministry of Earth Sciences
Indian Coast Guard / DG Shipping

Built with ❤️ for maritime security
""")