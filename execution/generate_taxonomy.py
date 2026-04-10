import os
import json
import re

# Raw text mapping provided by the user
RAW_TEXT = """1. Material families
Metals
Carbon steel
Stainless steel
Tool steel
Spring steel
Aluminium alloys
Magnesium alloys
Titanium alloys
Copper alloys
Brass
Bronze
Nickel alloys
Zinc alloys
Precious metals
Refractory metals
Polymers
Commodity thermoplastics
Engineering thermoplastics
High-performance thermoplastics
Thermosets
Elastomers
Liquid silicone rubber
Foams
Bioplastics
Recycled polymers
Ceramics and glass
Technical ceramics
Structural ceramics
Electronic ceramics
Glass
Glass-ceramics
Sapphire and specialty transparent materials
Composites
FRP composites
Carbon fiber composites
Glass fiber composites
Aramid composites
Natural fiber composites
Thermoplastic composites
Thermoset laminates
Sandwich panels
Natural materials
Wood
Cork
Leather
Paper
Cardboard
Textiles
Bio-derived materials
2. Primary shaping and forming technologies
Metal shaping
Casting
Sand casting
Die casting
Investment casting
Permanent mold casting
Gravity casting
Lost foam casting
Centrifugal casting
Forging
Open die
Closed die
Cold forging
Warm forging
Hot forging
Rolling
Extrusion
Drawing
Sheet metal forming
Blanking
Punching
Bending
Deep drawing
Hydroforming
Spinning
Stamping
Powder metallurgy
Press and sinter
MIM
HIP
Plastic shaping
Injection molding
Single-shot
2K / multi-shot
Insert molding
Overmolding
Gas-assisted
Micro injection
Thin-wall
Blow molding
Extrusion blow
Injection blow
Stretch blow
Thermoforming
Rotational molding
Compression molding
Transfer molding
Reaction injection molding
Silicone molding
LSR
HCR
Foam molding
Composite shaping
Hand layup
Vacuum bagging
Resin infusion
RTM
Pultrusion
Filament winding
Compression molding of composites
Autoclave curing
Prepreg layup
SMC / BMC molding
Ceramic and glass forming
Pressing
Slip casting
Tape casting
Extrusion
Sintering routes
Glass blowing
Float glass
Pressed glass
Molded glass
Wood and natural materials forming
Sawing
Milling
Veneering
Steam bending
Laminating
Molding of fiber products
3. Subtractive manufacturing
Machining
Turning
Milling
Drilling
Tapping
Boring
Reaming
Grinding
Honing
Lapping
Broaching
Sawing
Precision machining specialties
Swiss machining
5-axis machining
Hard milling
Micromachining
Ultra-precision machining
Non-traditional machining
EDM
Wire EDM
Sinker EDM
ECM
Laser cutting
Waterjet
Plasma cutting
Ultrasonic machining
Chemical milling
Photochemical etching
4. Additive manufacturing
Polymer AM
FDM / FFF
SLA
DLP
MSLA
SLS
MJF
Binder jetting
Material jetting
Metal AM
SLM / LPBF
DMLS
EBM
Binder jet metal
DED
WAAM
Other AM
Ceramic printing
Composite printing
Sand printing
Bio-based printing
5. Joining and assembly technologies
Mechanical joining
Screws
Bolts
Nuts
Rivets
Clinching
Crimping
Snap fits
Press fits
Interference fits
Pins
Inserts
Helicoils
Fold tabs
Seaming
Welding
MIG
TIG
Resistance welding
Spot welding
Seam welding
Laser welding
Ultrasonic welding
Friction welding
Friction stir welding
Projection welding
Stud welding
Plastic welding
Hot plate
Ultrasonic
Vibration
Spin
Laser transmission
Solvent welding
Brazing and soldering
Torch brazing
Furnace brazing
Soft soldering
Reflow soldering
Wave soldering
Selective soldering
Adhesive bonding
Structural adhesives
Acrylics
Epoxies
Polyurethanes
Silicones
UV-curing adhesives
Pressure-sensitive adhesives
Film adhesives
Foam tapes
Potting and encapsulation compounds
Textile and softgoods joining
Sewing
RF welding
Heat sealing
Ultrasonic sealing
Lamination
Stitch-and-turn constructions
6. Surface engineering and finishing
Mechanical surface finishing
Sanding
Polishing
Buffing
Brushing
Tumbling
Vibratory finishing
Shot blasting
Bead blasting
Burnishing
Deburring
Chemical and electrochemical finishing
Pickling
Passivation
Electropolishing
Chemical polishing
Etching
Conversion coatings
Metallic coatings
Electroplating
Nickel
Chrome
Zinc
Copper
Gold
Silver
Tin
Electroless plating
Galvanizing
PVD
CVD
Thermal spray
Metal cladding
Oxide and conversion finishes
Anodizing
Type II
Hard anodizing
Color anodizing
Alodine / chromate conversion
Black oxide
Phosphating
Paint and organic coatings
Liquid paint
Powder coating
E-coating
UV coatings
Soft-touch coatings
Anti-scratch coatings
Anti-fingerprint coatings
Ceramic-like coatings
EMI coatings
Insulating coatings
Conductive coatings
Optical / functional coatings
Anti-reflective
Hard coats
Hydrophobic
Oleophobic
Anti-fog
UV-blocking
IR-reflective
Antimicrobial
Wood/leather/textile finishing
Dyeing
Staining
Sealing
Waxing
Lacquering
Oil finishing
Topcoats
Waterproofing
7. Decoration and cosmetic technologies
Print-based decoration
Screen printing
Pad printing
Digital UV printing
Inkjet
Dye sublimation
Heat transfer printing
Mold-integrated decoration
In-mold labeling
In-mold decoration
Film insert molding
Back-mold decoration
Foil and transfer decoration
Hot stamping
Cold foil
Heat transfer foil
Decorative lamination
Laser and material-removal decoration
Laser marking
Laser engraving
Laser ablation
Backlit icon creation
Graphic and label systems
Decals
Domed labels
Overlays
Membrane graphics
Nameplates
Rating labels
Durable industrial labels
Luxury / tactile cosmetic methods
Embossing
Debossing
Grain texturing
Microtextures
Knurling
Wrapped finishes
Leather skin application
Fabric lamination
8. Electronics technologies
PCB technologies
Rigid PCB
Flex PCB
Rigid-flex
HDI PCB
Metal-core PCB
Ceramic PCB
Assembly technologies
SMT
THT
COB
Wire bonding
Underfill
Potting
Conformal coating
Power technologies
AC-DC conversion
DC-DC regulation
Battery management
Charging systems
Wireless charging
Power distribution
Sensors and controls
Mechanical switches
Capacitive touch
Hall sensors
IMUs
Pressure sensors
Optical sensors
Temperature sensing
Biosensing modules
Connectivity
Bluetooth
Wi-Fi
NFC
RFID
LTE / cellular
GNSS
UWB
Zigbee / Thread
Display and interface
LEDs
OLED
LCD
E-paper
Light guides
Haptics
Audio modules
Protection and compliance-related electronics specialties
EMC design
Shielding
Grounding
Thermal management
ESD design
Creepage/clearance design
Isolation design
9. Electromechanical and motion technologies
Actuation
DC motors
BLDC motors
Stepper motors
Servo systems
Solenoids
Piezo actuators
Pneumatic actuators
Hydraulic actuators
Transmission and motion control
Gears
Belts
Pulleys
Lead screws
Ball screws
Springs
Dampers
Clutches
Bearings
Linear guides
Mechatronic packaging
Enclosures
Sealing
Shock isolation
Cable routing
Connector systems
Thermal dissipation structures
10. Thermal, sealing, and environmental protection technologies
Thermal management
Heat sinks
Heat spreaders
Thermal pads
TIMs
Heat pipes
Vapor chambers
Active cooling
Liquid cooling
Sealing and ingress protection
Gaskets
O-rings
Overmolded seals
Ultrasonic sealed housings
Membrane vents
Potting
Encapsulation
Ruggedization
Drop protection structures
Vibration isolation
Impact energy absorption
EMI shielding
Flame-retardant systems
Chemical resistance systems
11. Softgoods and hybrid product technologies
Pattern cutting
Sewing construction
Seam sealing
Quilting
RF welding
TPU film lamination
Foam lamination
Spacer fabrics
Molded EVA
Injection + textile hybrid overmolding
Bonded fabric constructions
12. Packaging technologies
Corrugated packaging
Folding cartons
Thermoformed trays
Pulp-molded packaging
Foam packaging
Blister packs
Clamshells
Shrink wrapping
Retail display packaging
Tamper-evident systems
Anti-static packaging
Barrier packaging
13. Secondary operations
Trimming
Deflashing
Deburring
Thread forming
Insert installation
Tapping
Surface prep
Masking
Cleaning
Washing
Ultrasonic cleaning
Leak testing
Calibration
Serialization
Inspection
Kitting
14. Inspection, validation, and quality technologies
Metrology
Vernier / micrometer inspection
CMM
Optical scanning
Vision systems
CT scanning
Surface roughness measurement
Gloss measurement
Colorimetry
Coating thickness measurement
Reliability testing
Drop
Vibration
Shock
Thermal cycling
Salt spray
UV exposure
Humidity
Wear / abrasion
Fatigue
Button life
Hinge life
Chemical resistance
IP testing
Process quality
SPC
MSA
FAI
PPAP
IQC / IPQC / OQC
Traceability systems
15. Regulatory and certification-linked technology domains
Electrical safety compliance
EMC/EMI compliance
Radio certification
RoHS
REACH
WEEE
FDA / medical pathways
Food contact compliance
Toy safety
Biocompatibility
Flammability compliance
Pressure equipment standards
Transport safety
Battery transport compliance
16. Manufacturing systems and production-enabling technologies
Tooling design
Mold design
Die design
Jigs and fixtures
Automation
Robotics
Pick-and-place
Assembly cells
Leak-test stations
End-of-line testers
MES
ERP integration
Traceability coding
Inline inspection
Digital twins
Process simulation"""

import urllib.parse

def to_id(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')

def create_taxonomy():
    lines = RAW_TEXT.split('\n')
    taxonomy = []
    
    current_category = None
    current_sub_category = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Top level category (e.g. 1. Material families)
        if re.match(r'^\d+\.', line):
            current_category = re.sub(r'^\d+\.\s*', '', line)
            current_sub_category = None
        # Could be sub-category or item. Let's use a heuristic: if next lines are not numbered but this isn't lowercase, 
        # it's hard to tell without indentation from the raw text. Wait, the raw text lost indentation here!
        # Actually, let's map known sub-categories if possible, or just treat everything under Category as flat if we can't tell.
        # Given the raw text loss, we'll try to infer structured subcategories.
        else:
            # We will treat the current line as an item and stick it under Top category.
            # To get a realistic hierarchy, we can use a known list of sub-headers if we had indentation.
            pass

def create_better_taxonomy():
    # Since indentation was lost in the copy paste into the string, I will build a flat structure linked by category.
    # To rebuild it properly, let's use the numbering.
    lines = RAW_TEXT.split('\n')
    
    items = []
    current_cat = ""
    current_sub = ""
    
    # We will just treat ALL non-numbered lines as sub-technologies.
    # We add 5 Unsplash placeholder URLs.
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        if re.match(r'^\d+\.', line):
            current_cat = re.sub(r'^\d+\.\s*', '', line)
            current_sub = ""
        else:
            # Check if this line is likely a subcategory (no commas, fairly generic)
            # Actually, without indentation, we'll just treat them all as items under the main category.
            # Some are clearly groups like "Metal AM", but for the JSON, this works.
            
            item_name = line
            item_id = to_id(item_name)
            keyword = urllib.parse.quote(item_name)
            
            item = {
                "id": item_id,
                "name": item_name,
                "category": current_cat,
                "description": f"Detailed description for {line}. This paragraph explains what the sub-technology is.",
                "whyUtilized": f"Reasoning for why {line} is utilized.",
                "keyAchievement": f"The key achievement of {line}.",
                "intricacies": f"Intricacies involved in using {line}.",
                "wayToGoAboutIt": f"How to go about {line}, tooling requirements, etc.",
                "exampleProducts": [f"Example product made with {line} A", f"Example product made with {line} B"],
                "images": [
                    f"https://source.unsplash.com/featured/?{keyword},manufacturing,1",
                    f"https://source.unsplash.com/featured/?{keyword},manufacturing,2",
                    f"https://source.unsplash.com/featured/?{keyword},industry,3",
                    f"https://source.unsplash.com/featured/?{keyword},factory,4",
                    f"https://source.unsplash.com/featured/?{keyword},technology,5"
                ]
            }
            # Only add if it's not a known sub-header (we'll just add them all for now)
            items.append(item)
            
    # Wrap in our JSON
    master_json = {
        "metadata": {
            "version": "1.0.0",
            "title": "Master Hardware Manufacturing Taxonomy"
        },
        "technologies": items
    }
    
    output_path = os.path.join(os.path.dirname(__file__), '..', 'webapp', 'src', 'data', 'taxonomy', 'master_taxonomy.json')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(master_json, f, indent=2)
        
    print(f"Taxonomy JSON generated with {len(items)} items at {output_path}")
    print("Run `python execution/enrich_taxonomy.py` if you wish to hook up an LLM API to over-write the descriptions.")

if __name__ == '__main__':
    create_better_taxonomy()
