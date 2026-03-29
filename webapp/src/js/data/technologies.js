export const TECHNOLOGY_TAXONOMY = {
  "Injection Moulding": [
    "High-Precision Moulding",
    "Medical Moulding",
    "2K Moulding",
    "Gas-Assisted Injection Moulding"
  ],
  "CNC Machining": [
    "Precision CNC Machining",
    "CNC Turning",
    "5-Axis Machining",
    "Micro Machining",
    "CNC Drilling",
    "Wire EDM"
  ],
  "Metal fabrication": [
    "Laser Cutting",
    "Waterjet Cutting",
    "CNC Bending",
    "Stamping",
    "Punching",
    "Deep Drawing",
    "Welding",
    "Turret Punching"
  ],
  "3D Printing": [
    "FDM (Fused Deposition Modeling)",
    "SLA (Stereolithography)",
    "SLS (Selective Laser Sintering)",
    "Metal 3D Printing",
    "MJF (Multi Jet Fusion)"
  ],
  "Casting & Forging": [
    "Die Casting",
    "Investment Casting",
    "Sand Casting",
    "Pressure Die Casting"
  ],
  "Electronics": [
    "PCBA",
    "SMT Assembly",
    "Box Build",
    "Wire Harness Assembly",
    "Cables Assembly",
    "Flexible PCB",
    "Rigid-Flex PCB"
  ],
  "Surface Finishing": [
    "Anodizing",
    "Powder Coating",
    "Electroplating",
    "Sandblasting",
    "Polishing",
    "Painting",
    "Electroless Nickel Plating",
    "Passivation"
  ],
  "Plastics & Rubbers": [
    "Extrusion",
    "Blow Moulding",
    "Thermoforming",
    "Compression Moulding",
    "Liquid Silicone Rubber (LSR)",
    "Vacuum Forming",
    "Rotational Moulding"
  ],
  "Cables & Harnesses": [
    "Automotive looms",
    "Custom Cable Connectors",
    "Wire Harness",
    "Cable Assemblies",
    "Shielded Cables",
    "Wire Extrusions"
  ]
};

export const TECH_DESCRIPTIONS = {
  "Laser Cutting": {
    desc: "Laser cutting directs the output of a high-power laser to slice through materials like steel, titanium, and aluminum. It produces complex shapes with pristine edge quality.",
    images: ["https://images.unsplash.com/photo-1565439390214-c146b9a842f6?auto=format&fit=crop&q=80&w=600", "https://images.unsplash.com/photo-1621217730953-fb5291dc572f?auto=format&fit=crop&q=80&w=600"]
  },
  "Medical Moulding": {
    desc: "A highly regulated injection moulding process performed in ISO-certified cleanrooms. Utilizes biocompatible resins to produce surgical instruments, implants, and diagnostics.",
    images: ["https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=600", "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&q=80&w=600"]
  },
  "CNC Milling": {
    desc: "A subtractive manufacturing process that employs computerized controls and rotating multi-point cutting tools to progressively remove material from a workpiece.",
    images: ["https://images.unsplash.com/photo-1611117769992-ac0124b898a3?auto=format&fit=crop&q=80&w=600", "https://images.unsplash.com/photo-1565439387816-c956abdb3326?auto=format&fit=crop&q=80&w=600"]
  },
  "Overmoulding": {
    desc: "A multi-step injection moulding process where two or more distinct materials are moulded together, often combining a rigid plastic substrate with a soft rubber-like exterior for grip.",
    images: ["https://images.unsplash.com/photo-1504917595217-d4f500a0eb89?auto=format&fit=crop&q=80&w=600"]
  },
  "default": {
    desc: "This highly specialized manufacturing technology requires strict quality controls, specialized machinery, and tailored production methodologies to meet stringent industry tolerances.",
    images: ["https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&q=80&w=600", "https://images.unsplash.com/photo-1504917595217-d4f500a0eb89?auto=format&fit=crop&q=80&w=600"]
  }
};

export const ALL_TECHNOLOGIES = Object.keys(TECHNOLOGY_TAXONOMY).concat(
  Object.values(TECHNOLOGY_TAXONOMY).flat()
);
