"""
Generate the Master Architecture PDF: architectureSIH26143.pdf
Covers the complete 6-stage Sagar-Drishti pipeline:
- AI & Deep Learning Models
- Physics & Hydrodynamic Models
- Mathematical & Bayesian Formulations
- Weathering & Physicochemical Kinetics
- Computational & Geospatial Optimizations
- Cryptographic Chain-of-Custody & Legal Framework
"""
import sys
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print 'Page X of Y'."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(HexColor("#1a3c6e"))
        # Running Header
        self.drawString(20 * mm, 285 * mm, "SAGAR-DRISHTI (SIH26143) | SYSTEM ARCHITECTURE & SCIENTIFIC SPECIFICATION")
        self.setFont("Helvetica", 8)
        self.setFillColor(HexColor("#555555"))
        self.drawRightString(190 * mm, 285 * mm, "CONFIDENTIAL & PROPRIETARY")
        
        # Header rule
        self.setStrokeColor(HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(20 * mm, 282 * mm, 190 * mm, 282 * mm)
        
        # Footer rule
        self.line(20 * mm, 15 * mm, 190 * mm, 15 * mm)
        
        # Running Footer
        self.setFont("Helvetica", 8)
        self.drawString(20 * mm, 10 * mm, "Ministry of Earth Sciences (MoES) | Indian Coast Guard (ICG) | DG Shipping")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(190 * mm, 10 * mm, page_text)
        self.restoreState()


def build_architecture_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=20 * mm
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = HexColor("#0f2744")     # Deep Maritime Navy
    c_secondary = HexColor("#1a4c8a")   # Marine Blue
    c_accent = HexColor("#0284c7")      # Bright Blue
    c_dark = HexColor("#1e293b")        # Slate Text
    c_light = HexColor("#f8fafc")       # Crisp Background
    c_border = HexColor("#cbd5e1")      # Border Grey
    c_gold = HexColor("#b45309")        # Gold accent

    # Typography
    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=20, leading=24,
        textColor=c_primary, spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle', parent=styles['Normal'],
        fontName='Helvetica', fontSize=10, leading=14,
        textColor=HexColor("#475569"), spaceAfter=12
    )
    h1_style = ParagraphStyle(
        'SectionH1', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=13, leading=17,
        textColor=c_primary, spaceBefore=12, spaceAfter=6,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'SectionH2', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=10.5, leading=14,
        textColor=c_secondary, spaceBefore=8, spaceAfter=4,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8.5, leading=12,
        textColor=c_dark, spaceAfter=5
    )
    bullet_style = ParagraphStyle(
        'Bullet', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8.5, leading=12,
        textColor=c_dark, leftIndent=12, spaceAfter=3
    )
    math_style = ParagraphStyle(
        'MathBox', parent=styles['Normal'],
        fontName='Courier-Bold', fontSize=8.0, leading=11,
        textColor=HexColor("#0f172a"), leftIndent=8
    )

    elements = []

    # Title Banner
    elements.append(Paragraph("SAGAR-DRISHTI (AEROSLICK-SENTINEL)", title_style))
    elements.append(Paragraph("<b>Problem Statement Reference: SIH26143</b> | Enterprise System Architecture & Scientific Blueprint<br/>"
                              "Target: Indian Exclusive Economic Zone (EEZ) Autonomous Oil Spill Detection, Reverse Lagrangian Attribution & Cryptographic Legal Admissibility", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=c_primary, spaceAfter=10))

    # Executive Overview
    elements.append(Paragraph("1. EXECUTIVE ARCHITECTURE OVERVIEW", h1_style))
    elements.append(Paragraph(
        "<b>Sagar-Drishti</b> is an autonomous, operational maritime surveillance system designed to solve three fatal bottlenecks in marine pollution monitoring: "
        "(1) <i>The Dark-Spot Ambiguity Problem</i> (up to 70% false-positive look-alikes on SAR from algal blooms and low-wind areas), "
        "(2) <i>The Attribution Void</i> (the 'nearest-ship fallacy' where surface drift shifts oil miles away from its release point), and "
        "(3) <i>Evidentiary Inadmissibility</i> (lack of mathematical explainability and unbroken cryptographic chains under maritime law).",
        body_style
    ))
    elements.append(Paragraph(
        "The system coordinates a sequential <b>6-Stage Enterprise Pipeline</b> connecting satellite Synthetic Aperture Radar (SAR), multi-spectral optical imagery, "
        "hydrodynamic ocean circulation models, reverse-time Lagrangian particle back-tracking, dynamic Bayesian attribution, and an append-only cryptographic ledger.",
        body_style
    ))

    # 6-Stage High-Level Architecture Table
    cell_head = ParagraphStyle('TH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=white)
    cell_body = ParagraphStyle('TB', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=9.5, textColor=c_dark)
    cell_body_b = ParagraphStyle('TBB', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, textColor=c_primary)

    summary_data = [
        [
            Paragraph("Stage", cell_head),
            Paragraph("Domain / Component", cell_head),
            Paragraph("Key Models & Mathematical Foundations", cell_head),
            Paragraph("Operational Output", cell_head)
        ],
        [
            Paragraph("Stage 1", cell_body_b),
            Paragraph("Dual-Constellation Acquisition & Calm-Sea Gating", cell_body),
            Paragraph("Sentinel-1 C-SAR & ISRO RISAT-1A (EOS-04), Sentinel-2 FAI, CMOD5.N Inversion (3 < U10 < 12 m/s), 5x5 Lee Sigma Filter.", cell_body),
            Paragraph("Calibrated sigma-0 raster; false look-alike screening.", cell_body)
        ],
        [
            Paragraph("Stage 2", cell_body_b),
            Paragraph("Two-Stage Cascade Segmentation & Bonn Volumetric Matrix", cell_body),
            Paragraph("GSHHG Shoreline + SRTM Masking, Stage 1 CFAR Statistical Scout (75%+ tile rejection), Stage 2 SegFormer-B3, Focal + Lovasz Compound Loss, Bonn Consensus Codes 1-5.", cell_body),
            Paragraph("Pixel-level slick polygon, thickness classes, and nominal spill volume (m3).", cell_body)
        ],
        [
            Paragraph("Stage 3", cell_body_b),
            Paragraph("Physicochemical Weathering & RK4 Lagrangian Backtracking", cell_body),
            Paragraph("Fay Radial Spreading & Mackay Evaporation Inversion, 4th-Order Runge-Kutta (RK4), Samuels-Allen Variable Leeway theta(phi) = 16*sin(phi), Turbulent Diffusion Cone.", cell_body),
            Paragraph("Reconstructed discharge point (x0, y0, t0) and dynamic uncertainty envelope.", cell_body)
        ],
        [
            Paragraph("Stage 4", cell_body_b),
            Paragraph("Traffic Funneling & Dynamic Bayesian Attribution", cell_body),
            Paragraph("3D Spatiotemporal Cylinder Gate (R <= 35km, dt <= 6h), Conditional Dark-Ship Gate, Reconciled sigma-kernel (233.4m), Dirichlet-Categorical Conjugate Posterior.", cell_body),
            Paragraph("Normalised candidate probabilities P(Vk|D) summing to 1.000; linear factor shares.", cell_body)
        ],
        [
            Paragraph("Stage 5", cell_body_b),
            Paragraph("Cryptographic Chain of Custody & Append-Only Ledger", cell_body),
            Paragraph("Deterministic RFC 8785 JCS, Binary SHA-256 Merkle Tree, RFC 8032 Ed25519 Signatures, True O(1) JSONL Append Storage.", cell_body),
            Paragraph("Tamper-evident audit chain anchored for external RFC 3161 timestamps.", cell_body)
        ],
        [
            Paragraph("Stage 6", cell_body_b),
            Paragraph("Maritime COP & Automated Courtroom Enforcement Dossier", cell_body),
            Paragraph("MapLibre GL / Deck.gl Interactive COP, Multi-page ISO PDF/A MARPOL Dossier, Indian Evidence Act Sec. 65B Technical Attestation Clause.", cell_body),
            Paragraph("Boarding warrant, GC-MS fuel sampling mandate, court dossier.", cell_body)
        ]
    ]
    t_summary = Table(summary_data, colWidths=[0.9 * inch, 1.8 * inch, 2.8 * inch, 1.8 * inch])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [c_light, white]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(t_summary)
    elements.append(Spacer(1, 10))

    # STAGE 1
    elements.append(Paragraph("2. STAGE 1: DUAL-CONSTELLATION ACQUISITION & CALM-SEA PRE-SCREENING", h1_style))
    elements.append(Paragraph(
        "Stage 1 ingests radar and optical feeds to ensure that dark ocean patches are not erroneously classified as oil when atmospheric or physical ocean conditions preclude reliable SAR detection.",
        body_style
    ))
    elements.append(Paragraph("<b>A. Satellite Radar Radiometry & Polarimetry (Sentinel-1 & RISAT-1A EOS-04)</b>", h2_style))
    elements.append(Paragraph(
        "• <b>ESA Sentinel-1 C-SAR (Primary Operational Open Baseline)</b>: Ingests Sentinel-1 Level-1 GRD (Ground Range Detected) C-band (5.405 GHz) data in Interferometric Wide (IW) swath mode under the open Copernicus access policy. "
        "Transforms digital pixel numbers (DN) to normalized radar cross section sigma-0 (dB):<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<b>sigma-0 (dB) = 10 * log10(DN^2 / A_cal^2)</b><br/>"
        "• <b>Speckle Filtering</b>: 5x5 Refined Lee Sigma filter with damping parameter eta = 0.7 suppresses speckle noise while preserving sharp oil-water boundary gradients.<br/>"
        "• <b>ISRO RISAT-1A / EOS-04 (Sovereign Dual-Use Access Architecture)</b>: Implements an ingestion adapter (<code>core/sar/eos04.py</code>) tailored to Indian maritime operations. "
        "While strategic reconnaissance radar is classified, EOS-04 C-band medium/coarse resolution products are accessible to registered Indian research entities via the <b>ISRO Bhoonidhi Open Data Portal</b>, "
        "and high-priority stripmap feeds are directly routed to the project's target deployment stakeholders (<b>Indian Coast Guard and Ministry of Defence</b>). Ingests Circular-Transmit Linear-Receive (CTLR) hybrid polarimetry Stokes vectors [S0, S1, S2, S3] "
        "and applies <i>m-chi decomposition</i> (degree of polarization <i>m</i>, circularity parameter <i>chi</i>) to rigorously distinguish biogenic organic slicks from heavy mineral petroleum slicks.",
        bullet_style
    ))
    elements.append(Paragraph("<b>B. CMOD5.N Geophysical Model Function (GMF) Wind Inversion & Boundary Gating</b>", h2_style))
    elements.append(Paragraph(
        "CMOD5.N mathematically inverts C-band backscatter into 10-meter neutral sea surface wind velocity (U10) coupled with ECMWF wind direction (phi):<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<b>sigma-0(U10, theta_inc, phi) = B0(U10, theta_inc) * [1 + B1(U10, theta_inc)*cos(phi) + B2(U10, theta_inc)*cos(2*phi)]^1.6</b><br/>"
        "• <b>Calm-Sea Gating (U10 &lt; 3.0 m/s)</b>: When surface wind drops below 3.0 m/s, short-wavelength capillary gravity waves collapse naturally. The ocean becomes a specular reflector, "
        "causing clean water and biogenic slicks to mimic petroleum. The engine flags and gates these tiles out to avoid false detections.<br/>"
        "• <b>Breaking Wave Gating (U10 &gt; 12.0 m/s)</b>: Strong winds cause wave breaking, which naturally entrains surface oil droplets into the upper water column and disperses surface films.",
        bullet_style
    ))
    elements.append(Paragraph("<b>C. Sentinel-2 MSI Multi-Spectral Optical Cross-Verification</b>", h2_style))
    elements.append(Paragraph(
        "• Evaluates multi-spectral optical reflectance bands under clear sky conditions (QA60 cloud mask band &lt; 1024).<br/>"
        "• <b>Floating Algae Index (FAI)</b>: Differentiates biological algal blooms from hydrocarbons: <b>FAI = R_NIR - [R_Red + (R_SWIR1 - R_Red) * (lambda_NIR - lambda_Red)/(lambda_SWIR1 - lambda_Red)]</b>.<br/>"
        "• <b>Normalized Difference Water Index (NDWI)</b>: Confirms water-oil contrast <b>NDWI = (R_Green - R_NIR) / (R_Green + R_NIR)</b>.",
        bullet_style
    ))
    elements.append(Spacer(1, 10))

    # STAGE 2
    elements.append(Paragraph("3. STAGE 2: TWO-STAGE CASCADE SEGMENTATION & BONN QUANTIFICATION", h1_style))
    elements.append(Paragraph(
        "Processing a full Sentinel-1 scene (25,000 x 16,000 pixels = 400M pixels = ~1,526 tiles of 512x512) directly through heavy deep networks creates unacceptable GPU compute costs. "
        "Stage 2 implements an optimized two-stage cascade architecture that rejects the vast majority of clean open-water tiles before deep semantic inference.",
        body_style
    ))
    elements.append(Paragraph("<b>A. Coastline & Mudflat Masking (GSHHG & SRTM)</b>", h2_style))
    elements.append(Paragraph(
        "Applies Global Self-consistent, Hierarchical, High-resolution Geography (GSHHG) shorelines combined with SRTM 30m digital elevation. "
        "Applies a <b>500m seaward buffer</b> to eliminate intertidal mudflats, estuaries, and port infrastructure prior to tiling.",
        bullet_style
    ))
    elements.append(Paragraph("<b>B. Cascade Stage 1: Ultra-Fast Statistical Tile Scout (CFAR)</b>", h2_style))
    elements.append(Paragraph(
        "Computes spatial background statistics (mean mu_bg, standard deviation sigma_bg) across each 512x512 tile. Uses a Constant False Alarm Rate (CFAR) threshold: "
        "<b>T = mu_bg - k * sigma_bg</b>. Rejects <b>75% to 92% of non-spill open-water tiles</b> with zero GPU allocation, reducing end-to-end inference compute by an order of magnitude.",
        bullet_style
    ))
    elements.append(Paragraph("<b>C. Cascade Stage 2: Deep Learning Segmenters (SegFormer-B3 & DeepLabV3+) with Compound Loss</b>", h2_style))
    elements.append(Paragraph(
        "The deep semantic segmentation engine (implemented in <code>core/sar/detection.py</code>) provides dual complementary architectures:<br/>"
        "• <b>SegFormer-B3 (Primary Global Segmenter)</b>: Hierarchical Transformer encoder with overlapped patch merging and Mix-FFN decoder. "
        "Captures global long-range context without positional encoding bottlenecks, essential for maintaining topological continuity across 10-30 km narrow trail discharges.<br/>"
        "• <b>DeepLabV3+ (Multi-Scale ASPP Validator)</b>: Employs Atrous Spatial Pyramid Pooling (dilation rates r = [6, 12, 18]) and a depthwise separable decoder to "
        "extract fine-grained multi-scale spatial textures, resolving localized bilge discharges from ambient sea clutter.<br/>"
        "• <b>Compound Loss Function</b>: Solves extreme class imbalance (&lt; 0.1% spill pixels vs. 99.9% sea background):<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<b>L_total = 0.5 * L_Focal(gamma=2.0, alpha=0.75) + 0.5 * L_Lovasz-Softmax</b><br/>"
        "• <i>Focal Loss</i>: <b>L_Focal = -alpha * (1 - p_t)^gamma * log(p_t)</b> dynamically down-weights easy background ocean pixels and forces gradient focus on hard spill boundaries.<br/>"
        "• <i>Lovasz-Softmax Loss</i>: Directly optimizes the discrete Jaccard index (IoU) via submodular Lovasz extension, preventing boundary fragmentation.",
        bullet_style
    ))
    elements.append(Paragraph("<b>D. Bonn Consensus Thickness Classification & Volumetric Mass Quantification</b>", h2_style))
    elements.append(Paragraph(
        "Classifies detected pixels according to the international Bonn Agreement Oil Appearance Code (BAOAC):<br/>"
        "• <b>Code 1 (Sheen / Silvery)</b>: 0.04 to 0.30 um (Nominal: 0.10 um).<br/>"
        "• <b>Code 2 (Rainbow)</b>: 0.30 to 5.00 um (Nominal: 2.00 um).<br/>"
        "• <b>Code 3 (Metallic)</b>: 5.00 to 50.0 um (Nominal: 25.0 um).<br/>"
        "• <b>Code 4/5 (Continuous True Oil / Heavy Emulsion)</b>: &gt; 50.0 to 200.0 um (Nominal: 100.0 um).<br/>"
        "Total spill volume and mass are quantified via numerical surface integration: <b>V_spill = Integral Integral T(x, y) dx dy</b> and <b>M_spill = rho_oil * V_spill</b>, "
        "proving whether the discharge exceeds MARPOL Annex I regulatory limits (15 ppm / 30 L/nmi).",
        bullet_style
    ))
    elements.append(Spacer(1, 10))

    # STAGE 3
    elements.append(Paragraph("4. STAGE 3: PHYSICOCHEMICAL WEATHERING & LAGRANGIAN BACKTRACKING", h1_style))
    elements.append(Paragraph(
        "Surface oil drifts and weathers under ocean currents and wind stress. Naively accusing the vessel nearest to the slick at the time of satellite capture "
        "is fatal (the 'nearest-ship fallacy'). Stage 3 couples weathering inversion with 4th-order hydrodynamic backtracking.",
        body_style
    ))
    elements.append(Paragraph("<b>A. Fay-Mackay Weathering & Age Inversion Model</b>", h2_style))
    elements.append(Paragraph(
        "• <b>Fay Radial Spreading Inversion</b>: Inverts gravity-viscous radial expansion kinetics to estimate slick age: "
        "<b>A(t) = pi * [ (k_s^4 * Delta^2 * V0^2 * t^3) / nu_w ]^(1/6)</b>, where k_s = 1.45, Delta = 1 - rho_oil/rho_w, and nu_w is seawater kinematic viscosity.<br/>"
        "• <b>Mackay Distillation & Component Evaporation</b>: Inverts evaporative fraction <b>F_e = (1/B) * ln(1 + B * theta * T_exp)</b>, cross-referencing water-in-oil emulsification "
        "and viscosity increase (<b>mu = mu0 * exp(2.5 * Y_w / (1 - 0.654 * Y_w))</b>). Yields physical slick age <b>Delta_t_age</b> and release time <b>t0 = t_SAR - Delta_t_age</b>.",
        bullet_style
    ))
    elements.append(Paragraph("<b>B. 4th-Order Runge-Kutta (RK4) Reverse Lagrangian Hydrodynamic Backtracker</b>", h2_style))
    elements.append(Paragraph(
        "Reconstructs the reverse advection trajectory from t_SAR back to t0 using step size dt = 300 seconds:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<b>X_{n-1} = X_n - (dt / 6) * (k1 + 2*k2 + 2*k3 + k4)</b><br/>"
        "where drift velocity is governed by: <b>V_drift(x, t) = V_current(x, t) + V_leeway(x, t) + V_Stokes(x, t)</b>.<br/>"
        "• <b>V_current</b>: High-resolution (500m) coastal Eulerian current mesh from INCOIS / HYCOM ocean circulation models.<br/>"
        "• <b>V_Stokes</b>: Wave Stokes drift parameterization: <b>V_Stokes ~ 0.012 * U10</b>.",
        bullet_style
    ))
    elements.append(Paragraph("<b>C. Calibrated Variable Wind Leeway Deflection (Samuels-Allen Framework)</b>", h2_style))
    elements.append(Paragraph(
        "Wind leeway pushes the surface slick at alpha = 3.2% of 10m wind velocity U10, deflected by variable angle theta(phi):<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<b>V_leeway = alpha * R(theta_deflection) * U10</b><br/>"
        "• <i>Physics Foundation</i>: Classical infinite-depth laminar Ekman theory predicts a constant 45 deg deflection. Real-world ocean observations "
        "(post-<i>Torrey Canyon</i> studies; <b>Allen & Plourde (1999)</b> USCG R&D Report CG-D-08-99) converge on a much smaller 10 deg to 20 deg surface leeway.<br/>"
        "• <i>Variable Angle Extension</i>: Extending the variable-deflection philosophy of <b>Samuels, Huang & Amstutz (1982)</b> (<i>Ocean Engineering</i>), "
        "SAGAR-DRISHTI parameterizes deflection as a function of latitude: <b>theta(phi) = 16 deg * sin(phi)</b>.<br/>"
        "• <i>Tropical Calibration</i>: The 16 deg amplitude was calibrated so that at mid-latitudes (45-50 deg N, sin(phi) ~ 0.71-0.77), deflection evaluates to 11.3 - 12.3 deg (matching benchmark North Atlantic studies). "
        "In India's tropical EEZ (6 deg N to 23 deg N), sin(phi) is 0.10 to 0.39, correctly producing an operational deflection of <b>1.7 deg to 6.3 deg</b>, capturing the weakening of the Coriolis planetary parameter "
        "<b>f = 2*Omega*sin(phi)</b> near the equator.",
        bullet_style
    ))
    elements.append(Paragraph("<b>D. Turbulent Diffusion Dispersion Envelope</b>", h2_style))
    elements.append(Paragraph(
        "Positional uncertainty expands over time as oceanic horizontal turbulent diffusion: <b>sigma_origin(t) = sqrt(sigma0^2 + 2*D_h*Delta_t)</b>, where D_h = 2.5 m^2/s and sigma0 = 100m. "
        "For a 2.4-hour backtrack, sigma_origin ~ 230.7 meters.",
        bullet_style
    ))
    elements.append(Spacer(1, 10))

    # STAGE 4
    elements.append(Paragraph("5. STAGE 4: 3D CYLINDER TRAFFIC FILTERING & DYNAMIC BAYESIAN ATTRIBUTION", h1_style))
    elements.append(Paragraph(
        "In dense maritime lanes (e.g., off Mumbai High or the Gulf of Kutch), querying AIS returns hundreds of vessels. "
        "Stage 4 filters ambient traffic down to relevant suspects and executes a closed-form Dirichlet Bayesian inference.",
        body_style
    ))
    elements.append(Paragraph("<b>A. 3D Spatiotemporal Traffic Funnel (traffic_filter.py)</b>", h2_style))
    elements.append(Paragraph(
        "Filters the raw transponder database via a 3D spatiotemporal cylinder query:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<b>Dist(x_vessel(t), x_origin) &lt;= R_gate (35 km) &nbsp;&nbsp;AND&nbsp;&nbsp; |t_AIS - t0| &lt;= Delta_t_gate (+-6 hours)</b><br/>"
        "Applies a kinematic filter (SOG &gt;= 0.5 knots) to weed out anchored or stationary platforms, pruning 95%+ of ambient traffic before scoring.",
        bullet_style
    ))
    elements.append(Paragraph("<b>B. Conditional Dark-Ship AIS Anomaly Detection (anomaly.py)</b>", h2_style))
    elements.append(Paragraph(
        "Offshore AIS satellite occlusions are common. To avoid false alarms, transponder silence gaps (&gt; 1.0 hour) are penalized <b>if and only if</b>: "
        "(1) The gap overlaps the estimated discharge window [t0 - Delta_t, t0 + Delta_t], and (2) The vessel's last fix was inside the spatiotemporal drift cone.",
        bullet_style
    ))
    elements.append(Paragraph("<b>C. Reconciled Dynamic Uncertainty Kernel (sigma_kernel)</b>", h2_style))
    elements.append(Paragraph(
        "The proximity scoring Gaussian width is dynamically coupled to the backtrack dispersion and genuine sensor specs via quadrature:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<b>sigma_kernel = sqrt(sigma_origin^2 + sigma_registration^2) = sqrt(230.7^2 + 35.4^2) ~ 233.4 meters</b><br/>"
        "where sigma_registration = sqrt(sigma_SAR^2 + sigma_AIS^2 + sigma_jitter^2) = sqrt(20^2 + 15^2 + 25^2) ~ 35.4 meters (Sentinel-1 10m pixel resampling 20m, AIS DGPS antenna mast offset 15m, ITU-R M.1371 ping interpolation jitter 25m).",
        bullet_style
    ))
    elements.append(Paragraph("<b>D. Dirichlet-Categorical Conjugate Bayesian Posterior Engine (attribution.py)</b>", h2_style))
    elements.append(Paragraph(
        "• Given K filtered candidate vessels, base priors are defined by vessel type risk: <b>theta ~ Dirichlet(alpha0)</b>.<br/>"
        "• Physical evidence Likelihood (proximity, collinearity, kinetic anomaly, temporal plausibility) provides categorical observations L_k.<br/>"
        "• Concentration parameter update: <b>alpha_post,k = alpha0,k + N_eff * L_k</b>.<br/>"
        "• Expected posterior probability: <b>E[theta_k | Evidence] = alpha_post,k / Sum(alpha_post,j)</b>.<br/>"
        "• Formally guarantees that candidate attribution probabilities <b>strictly sum to 1.000</b>.",
        bullet_style
    ))
    elements.append(Paragraph("<b>E. Exact Linear Factor Decomposition & Legal Narrative (explainability.py)</b>", h2_style))
    elements.append(Paragraph(
        "By Shapley efficiency axioms, for an additive linear score S = Sum(w_i * f_i), exact Shapley values reduce in closed form to <b>phi_i = w_i * f_i(x)</b>. "
        "Avoids stochastic Monte Carlo estimation variance in court dossiers and outputs exact percentage attribution shares.",
        bullet_style
    ))
    elements.append(Spacer(1, 10))

    # STAGE 5 & 6
    elements.append(Paragraph("6. STAGE 5: CRYPTOGRAPHIC MERKLE LEDGER & APPEND-ONLY CUSTODY", h1_style))
    elements.append(Paragraph(
        "• <b>Deterministic Canonical Serialization (RFC 8785 JCS)</b>: Normalizes all JSON telemetry payloads before hashing.<br/>"
        "• <b>Binary Merkle Tree Assembly</b>: Folds four independent leaves (Raw SAR Hash, AIS Log Hash, MetOcean Hash, Bayesian Attribution Matrix) into a 32-byte <b>Merkle Root</b>.<br/>"
        "• <b>RFC 8032 Ed25519 Digital Signatures</b>: Processing authority node signs the Merkle root with a 64-byte deterministic signature.<br/>"
        "• <b>True O(1) Append-Only JSONL Storage</b>: Committed to <code>output/ledger_chain.json</code> in true append mode, preventing in-memory history loss.<br/>"
        "• <b>External Anchor Architecture</b>: Formatted as an anchor payload designed for publication to external RFC 3161 Timestamp Authorities.",
        bullet_style
    ))
    elements.append(Spacer(1, 10))

    elements.append(Paragraph("7. STAGE 6: MARITIME COP & SECTION 65B EVIDENCE DOSSIER", h1_style))
    elements.append(Paragraph(
        "• <b>Interactive Command Dashboard (React / Deck.gl / MapLibre)</b>: Sub-pixel SAR backscatter overlays, dynamic time slider (reverse backtrack to t₀ and forward +48h future forecast), and live suspect ranking.<br/>"
        "• <b>Automated Section 65B MARPOL Enforcement Dossier (PDF/A)</b>: Multi-page courtroom-ready document featuring high-res forensic maps, tabular factor shares, MetOcean conditions, and a formal statutory technical attestation to support certification by a human Competent Authority under Section 65B of the Indian Evidence Act and the Bharatiya Sakshya Adhiniyam, 2023.",
        bullet_style
    ))
    elements.append(Spacer(1, 14))

    # Verification Table
    elements.append(Paragraph("8. SYSTEM VERIFICATION & COMPLIANCE MATRIX", h1_style))
    test_data = [
        [
            Paragraph("Subsystem / Module", cell_head),
            Paragraph("Test Suite Target", cell_head),
            Paragraph("Verification Criterion", cell_head),
            Paragraph("Result", cell_head)
        ],
        [
            Paragraph("Stage 1 (SAR / Optical)", cell_body_b),
            Paragraph("test_cmod5_and_thickness.py<br/>test_optical_sentinel2.py<br/>test_sar_eos04.py", cell_body),
            Paragraph("CMOD5.N calm wind gating (&lt; 3m/s), Sentinel-2 FAI cloud masking, RISAT-1A m-chi Stokes decomposition.", cell_body),
            Paragraph("<b>PASSED</b><br/>(100%)", cell_body)
        ],
        [
            Paragraph("Stage 2 (Cascade & Loss)", cell_body_b),
            Paragraph("test_sar_cascade.py<br/>test_losses.py", cell_body),
            Paragraph("GSHHG 500m buffer, CFAR scout 75%+ tile rejection, Focal + Lovasz compound loss optimization.", cell_body),
            Paragraph("<b>PASSED</b><br/>(100%)", cell_body)
        ],
        [
            Paragraph("Stage 3 (Hydrodynamics)", cell_body_b),
            Paragraph("test_drift.py<br/>test_weathering_and_forecast.py", cell_body),
            Paragraph("Fay-Mackay 2.4h age inversion, RK4 reverse integration, Samuels-Allen leeway (1.7 deg - 6.3 deg EEZ range).", cell_body),
            Paragraph("<b>PASSED</b><br/>(100%)", cell_body)
        ],
        [
            Paragraph("Stage 4 (Attribution)", cell_body_b),
            Paragraph("test_attribution.py<br/>test_stage4_hardening.py", cell_body),
            Paragraph("3D cylinder funnel, conditional dark-ship gate, dynamic sigma-kernel (233.4m), Dirichlet posterior sum = 1.000.", cell_body),
            Paragraph("<b>PASSED</b><br/>(100%)", cell_body)
        ],
        [
            Paragraph("Stage 5 (Ledger)", cell_body_b),
            Paragraph("test_evidence.py", cell_body),
            Paragraph("Deterministic JCS hash, Ed25519 64-byte signature, disk-backed JSONL append persistence.", cell_body),
            Paragraph("<b>PASSED</b><br/>(100%)", cell_body)
        ],
        [
            Paragraph("Stage 6 (Full Pipeline)", cell_body_b),
            Paragraph("main.py pipeline", cell_body),
            Paragraph("End-to-end execution, realistic CPA (143m), ISO PDF/A dossier export, Sec. 65B technical attestation.", cell_body),
            Paragraph("<b>PASSED</b><br/>(100%)", cell_body)
        ]
    ]
    t_test = Table(test_data, colWidths=[1.4 * inch, 1.8 * inch, 3.2 * inch, 0.9 * inch])
    t_test.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [c_light, white]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(t_test)

    # Build Document
    doc.build(elements, canvasmaker=NumberedCanvas)
    return output_path

if __name__ == "__main__":
    out_file = Path("architectureSIH26143.pdf")
    build_architecture_pdf(str(out_file))
    print(f"Architecture PDF successfully built at: {out_file.resolve()}")
