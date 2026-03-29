# Directive: Supply Chain Sourcing & Vetting

**Goal**: Systematically research, organize, and audit hardware product suppliers. Compute factory probability scores to avoid middlemen, and cross-reference proprietary components to find cheaper Asian equivalents.

## Context
When performing hardware sourcing, it's crucial to identify technically capable factories (injection molding, CNC, PCBA, fabrication) and avoid trading companies that inflate BOM costs by 30-40% and obfuscate QA/QC. 

Furthermore, Western proprietary part numbers (like specific Molex headers, TI ICs, sensors) can often be substituted by exact functional equivalents in the Chinese domestic market (LCSC) for massive cost savings.

## Inputs
1. **Supplier Vetting**: A URL to an Alibaba profile or a Chinese business license number.
2. **Component Cross-Reference**: A Western proprietary part number (e.g. `Molex 53047-0210`).
3. **General Sourcing**: A technical specification or mechanical drawing requirement.

## Available Execution Tools

### 1. The Factory vs. Trader Engine
**File**: `execution/sourcing/factory_vs_trader.py`
**Usage**: `python execution/sourcing/factory_vs_trader.py --query "<business_license_or_name>"`
**Description**: Uses Chinese corporate registries (Qichacha/Tianyancha) and satellite insights to compute a "Factory vs. Trader" probability score.
**Outputs**: JSON with a % probability, and reasoning based on address (Industrial Park vs CBD Office) and scope (Manufacturing vs Trading).

### 2. Alibaba Profile Parser
**File**: `execution/sourcing/alibaba_parser.py`
**Usage**: `python execution/sourcing/alibaba_parser.py --url "<alibaba_supplier_url>"`
**Description**: Parses an Alibaba supplier profile via API to extract claimed certifications, years on Alibaba, main products, and the Business License number.

### 3. Component Cross-Referencer
**File**: `execution/sourcing/lcsc_cross_referencer.py`
**Usage**: `python execution/sourcing/lcsc_cross_referencer.py --pn "<western_part_number>"`
**Description**: Queries Asian databases (LCSC) for the exact generic domestic market equivalent. 
**Outputs**: JSON representing pricing, stock, part numbers, and datasheet URLs.

### 4. Open Web Discovery (Firecrawl)
**File**: `execution/sourcing/firecrawl_sourcing.py`
**Usage**: `python execution/sourcing/firecrawl_sourcing.py --tech "<technology>" --region "<region>" --reqs "<requirements>"`
**Description**: Leverages Firecrawl's AI capabilities to scan the open web for suppliers matching highly specific technical and geographical requirements.
**Outputs**: JSON representing extracted structured data (company name, URL, extracted capabilities, contact info, and address).

## Process Flow

### Workflow A: Supplier Vetting (The "Ghost" Detector)
1. **Extract License**: If user gives an Alibaba URL, run `alibaba_parser.py` to extract the underlying business license number or registered company name.
2. **Fetch Corporate Registry**: Run `factory_vs_trader.py` using the extracted business license number.
3. **Cross-Reference**: Read the reasoning block. If the result is "Likely Trader", immediately warn the user and explain the logic (e.g. registered in an office building downtown, business scope only lists wholesale).
4. **Compile Report**: Summarize Technical capabilities (machinery/processes), Ownership ethos, Quality/Certifications, and the final Probability Score. Add sourcing tags for future searchability (e.g., `#injection-molding`, `#pcba-house`).

### Workflow B: Component BOM Cost Down
1. **Parse Part**: User provides an expensive Western component part number.
2. **Search API**: Run `lcsc_cross_referencer.py` to find generic alternatives.
3. **Datasheet Audit**: Review the `differences` field in the JSON output. Highlight any minor tolerance or material changes (e.g., "Housing is PBT instead of LCP; carefully review reflow profiles").
4. **Output Savings**: Output the exact new generic part number, the cost savings percentage, and the datasheet comparison summary.

### Workflow C: Open Web Discovery via Firecrawl
1. **Parse Requirements**: Identify the user's requested technology (e.g. "CNC Machining"), target region (e.g. "Shenzhen"), and constraints (e.g. "ISO9001, low-volume").
2. **Run Firecrawl**: Execute `firecrawl_sourcing.py` with these parameters.
3. **Filter and Vet**: Review the structured output. If an address looks suspiciously like an office building (rather than an industrial park), flag it to the user.
4. **Compile List**: Present the top matching candidates with URLs, extracted capabilities, and contact emails for outreach.

## Edge Cases
- **Missing API Keys**: If the execution scripts return mock data (because keys aren't set up yet), inform the user that simulated data is being shown for demonstration, and instruct them to update their `.env`.
- **Tianyancha GitHub SDK**: The scripts are built to be extended. If the API returns limits/errors, inform the user they can integrate the Tianyancha GitHub SDK directly into `factory_vs_trader.py`.
- **Ambiguous Factory**: If the probability score is between 40%-70% ("Mixed/Inconclusive"), recommend a third-party physical audit (e.g., V-Trust, AsiaInspection) as the next step.
