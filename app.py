import os
import json
import re
import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# JSON Fallback storage file
STORAGE_FILE = os.path.join(os.path.dirname(__file__), 'saved_designs.json')

def get_db_connection():
    """Attempt SQL Server SSMS Connection via PyODBC"""
    try:
        import pyodbc
        # Configure your SQL Server instance name here if needed (e.g. localhost\\SQLEXPRESS or .)
        conn_str = (
            "DRIVER={ODBC Driver 17 for SQL Server};"
            "SERVER=localhost;"
            "DATABASE=HandloomDesignDB;"
            "Trusted_Connection=yes;"
        )
        conn = pyodbc.connect(conn_str, timeout=3)
        return conn
    except Exception as e:
        # DB Connection fallback
        return None

def load_local_designs():
    if os.path.exists(STORAGE_FILE):
        try:
            with open(STORAGE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_local_designs(designs):
    with open(STORAGE_FILE, 'w', encoding='utf-8') as f:
        json.dump(designs, f, ensure_ascii=False, indent=2)

# AI / Rule-based Generative Handloom Design Engine - 5 Primary Andhra Pradesh Traditions
HANDLOOM_STYLES = [
    {
        "id": "mangalagiri",
        "nameEn": "Mangalagiri Cotton & Silk",
        "nameTe": "మంగళగిరి కాటన్ & పట్టు",
        "region": "Guntur District, Andhra Pradesh",
        "featuresEn": "Famous for Nizam solid gold zari borders, micro checks, and high thread count warp.",
        "featuresTe": "నిజాం గోపురం బోర్డర్లు, సూక్ష్మ గడులు మరియు నాణ్యమైన పట్టు నూలు నేతకు ప్రసిద్ధి.",
        "defaultBody": "#047857",
        "defaultBorder": "#800020",
        "defaultPallu": "#991B1B",
        "defaultMotif": "Temple Gopuram",
        "borderStyle": "temple"
    },
    {
        "id": "uppada",
        "nameEn": "Uppada Jamdani Silks",
        "nameTe": "ఉప్పాడ జమ్‌దానీ పట్టు",
        "region": "East Godavari Coast, Andhra Pradesh",
        "featuresEn": "Non-mechanical geometric Jamdani weft insertion, lightweight translucent texture, and floating zari buttis.",
        "featuresTe": "చేనేత మగ్గంపై అల్లిన జమ్‌దానీ తీగలు, తేలికపాటి పారదర్శక పట్టు నేత.",
        "defaultBody": "#0F766E",
        "defaultBorder": "#BE185D",
        "defaultPallu": "#BE185D",
        "defaultMotif": "Peacock (Mayuri)",
        "borderStyle": "zari_stripes"
    },
    {
        "id": "pochampally",
        "nameEn": "Pochampally Double Ikat",
        "nameTe": "పోచంపల్లి ఇకత్ (టై & డై)",
        "region": "Historic Handloom Corridor, Andhra & Telangana",
        "featuresEn": "Tie-and-dye resist weaving with bold geometric stepped diamonds and wave patterns.",
        "featuresTe": "రంగులు అద్దిన దారాలతో రూపొందించే సుందరమైన రేఖాగణిత ఇకత్ డైమండ్ డిజైన్లు.",
        "defaultBody": "#EAB308",
        "defaultBorder": "#5B21B6",
        "defaultPallu": "#5B21B6",
        "defaultMotif": "Geometric Ikat Diamond",
        "borderStyle": "ikat_wave"
    },
    {
        "id": "venkatagiri",
        "nameEn": "Venkatagiri Zari Spires",
        "nameTe": "వెంకటగిరి జరీ శిఖరాలు",
        "region": "Tirupati / Nellore, Andhra Pradesh",
        "featuresEn": "Fine 100s count cotton and fine silk with rich all-over gold zari dots (chalu buttis) and temple spires.",
        "featuresTe": "100s సన్నని పట్టు దారం, బంగారు చల్లు బుటాలు మరియు రాజసం ఉట్టిపడే గోపురం బోర్డర్.",
        "defaultBody": "#064E3B",
        "defaultBorder": "#B91C1C",
        "defaultPallu": "#B91C1C",
        "defaultMotif": "Mango / Paisley (Kalka)",
        "borderStyle": "double_zari"
    },
    {
        "id": "dharmavaram",
        "nameEn": "Dharmavaram Bridal Brocade",
        "nameTe": "ధర్మవరం పెళ్లి పట్టు",
        "region": "Sri Sathya Sai / Anantapur, Andhra Pradesh",
        "featuresEn": "Opulent bridal mulberry pure silk, broad kada borders, and majestic double-shade tissue chakra medallion pallu.",
        "featuresTe": "భారీ పెళ్లి పట్టు నేత, వెడల్పాటి కాడా బోర్డర్ మరియు ద్విరంగుల టిష్యూ చక్ర పల్లూ.",
        "defaultBody": "#4A0812",
        "defaultBorder": "#991B1B",
        "defaultPallu": "#800020",
        "defaultMotif": "Elephant (Gaja)",
        "borderStyle": "peacock_border"
    }
]

COLOR_PALETTES = {
    "wedding": {"body": "#800020", "border": "#D97706", "pallu": "#991B1B", "zari": "#FBBF24", "name": "Bridal Crimson & Royal Gold"},
    "festive": {"body": "#0F766E", "border": "#BE185D", "pallu": "#BE185D", "zari": "#F59E0B", "name": "Peacock Teal & Magenta"},
    "traditional": {"body": "#064E3B", "border": "#B91C1C", "pallu": "#B91C1C", "zari": "#D97706", "name": "Deep Temple Green & Vermilion"},
    "puja": {"body": "#EAB308", "border": "#5B21B6", "pallu": "#5B21B6", "zari": "#991B1B", "name": "Pitambaram Yellow & Deep Violet"},
    "modern": {"body": "#1E1B4B", "border": "#4338CA", "pallu": "#312E81", "zari": "#E2E8F0", "name": "Indigo Night & Silver Zari"},
    "pastel": {"body": "#F472B6", "border": "#0EA5E9", "pallu": "#0EA5E9", "zari": "#F59E0B", "name": "Rose Quartz & Sky Blue"}
}

MOTIF_CATALOG = [
    {"id": "lotus", "en": "Lotus / Floral (Kamala)", "te": "తామర పూవు (కమల) / పూలు", "symbol": "Purity & Grace"},
    {"id": "rose", "en": "Rose (Gulabi)", "te": "గులాబీ పువ్వు", "symbol": "Beauty & Devotion"},
    {"id": "jasmine", "en": "Jasmine (Malle)", "te": "మల్లె మొగ్గలు", "symbol": "Auspicious Fragrance"},
    {"id": "sunflower", "en": "Sunflower (Suryakanthi)", "te": "సూర్యకాంతి పువ్వు", "symbol": "Radiance & Joy"},
    {"id": "peacock", "en": "Peacock (Mayuri)", "te": "నెమలి (మయూరి)", "symbol": "Royalty & Grace"},
    {"id": "mango", "en": "Mango / Paisley (Kalka)", "te": "మామిడి పిందే (కల్కా)", "symbol": "Prosperity"},
    {"id": "parrot", "en": "Parrot (Chiluka/Kili)", "te": "చిలుక", "symbol": "Joy & Nature"},
    {"id": "temple", "en": "Temple Gopuram", "te": "దేవాలయ గోపురం", "symbol": "Divine Protection"},
    {"id": "ikat", "en": "Geometric Ikat Diamond", "te": "ఇకత్ డైమండ్", "symbol": "Heritage Precision"},
    {"id": "leaves", "en": "Leaves & Vines (Lata)", "te": "ఆకులు & తీగలు", "symbol": "Botanical Harmony"},
    {"id": "elephant", "en": "Elephant (Gaja)", "te": "ఏనుగు (గజ)", "symbol": "Strength & Royalty"},
    {"id": "swan", "en": "Swan (Hamsa)", "te": "హంస", "symbol": "Elegance & Discernment"}
]

BODY_PATTERNS = [
    {"id": "floral_vines", "en": "Floral Vines (Lata)", "te": "పూల తీగలు (లత)"},
    {"id": "checks", "en": "Geometric Checks (Kattam)", "te": "గడులు (కట్టం)"},
    {"id": "lattice", "en": "Diamond Lattice (Jaal)", "te": "జాల్ మోటిఫ్ వల"},
    {"id": "diagonal_ikat", "en": "Diagonal Ikat Lines", "te": "రేఖాగణిత శైలి గీతలు"},
    {"id": "scattered_buttis", "en": "Scattered Buttis", "te": "చల్లు బుటాలు"},
    {"id": "stripes", "en": "Fine Zari Stripes (Vanki)", "te": "జరీ గీతలు"},
    {"id": "paisley_lattice", "en": "Paisley Grid Lattice", "te": "మామిడి పిందే జాల్"}
]

BORDER_PATTERNS = [
    {"id": "temple", "en": "Temple Gopuram Spikes", "te": "గోపురం బోర్డర్"},
    {"id": "double_zari", "en": "Double Zari Floral Border", "te": "ద్వంద్వ జరీ బోర్డర్"},
    {"id": "ikat_wave", "en": "Geometric Ikat Waves", "te": "ఇకత్ తరంగాలు"},
    {"id": "zari_stripes", "en": "Modern Zari Stripes", "te": "సన్న జరీ పట్టీ"},
    {"id": "peacock_border", "en": "Peacock Silhouette Border", "te": "నెమలి బోర్డర్"},
    {"id": "chevron_pattern", "en": "Chevron Zig-Zag Border", "te": "జిగ్-జాగ్ బోర్డర్"}
]

PALLU_PATTERNS = [
    {"id": "traditional_stripes", "en": "Traditional Zari Stripes & Fringes", "te": "సాంప్రదాయ పట్టీల కొంగు"},
    {"id": "grand_medallion", "en": "Grand Chakra Medallion Pallu", "te": "భారీ చక్ర పల్లూ"},
    {"id": "decorative_pallu", "en": "Decorative Floral & Motif Panel", "te": "అలంకార పూల కొంగు"},
    {"id": "ikat_block", "en": "Geometric Ikat Color-Blocked Pallu", "te": "ఇకత్ కలర్-బ్లాక్ కొంగు"},
    {"id": "cascade_temple", "en": "Cascading Temple Gopuram Tiers", "te": "గోపురాల అంచల కొంగు"}
]

def generate_variations_from_prompt(user_prompt, language="en-US", seed=0):
    prompt_raw = user_prompt or ''
    prompt_lower = prompt_raw.lower().strip()

    # 1. Comprehensive Handloom Color Catalog with English & Telugu Names
    COLOR_DEFS = [
        (["crimson red", "crimson", "kempu", "ruby", "maroon", "red", "కెంపు", "రూబీ", "సిందూరం", "ఎరుపు", "ఎర్రని", "మెరూన్"], "#800020", "Crimson Red"),
        (["royal blue", "navy blue", "indigo", "navy", "dark blue", "blue", "రాయల్ బ్లూ", "నేవీ", "ఇండిగో", "నీలం", "బ్లూ"], "#1D4ED8", "Royal Blue"),
        (["sky blue", "cyan", "baby blue", "turquoise", "ఆకాశ నీలం"], "#0284C7", "Sky Blue"),
        (["peacock teal", "peacock blue", "teal", "cyan", "sea green", "పింఛం", "నెమలి రంగు"], "#0F766E", "Peacock Teal"),
        (["emerald green", "bottle green", "green", "మరకత పచ్చ", "ఆకుపచ్చ", "పచ్చ"], "#047857", "Emerald Green"),
        (["parrot green", "light green", "చిలుక పచ్చ"], "#16A34A", "Parrot Green"),
        (["pitambaram yellow", "pitambaram", "golden yellow", "yellow", "పీతాంబరం", "పసుపు"], "#EAB308", "Pitambaram Yellow"),
        (["mustard gold", "mustard", "ochre", "turmeric", "ఆవాలు"], "#D97706", "Mustard Gold"),
        (["antique gold", "rich gold", "gold zari", "golden", "gold", "స్వర్ణ", "బంగారు", "బంగారం"], "#D97706", "Rich Gold"),
        (["rose pink", "rani pink", "magenta", "baby pink", "pink", "రాణి గులాబీ", "గులాబీ రంగు", "పింక్"], "#DB2777", "Rose Pink"),
        (["royal purple", "violet", "vangapuvvu", "lavender", "purple", "వంగపువ్వు", "ఊదా", "పర్పుల్"], "#6B21A8", "Royal Purple"),
        (["terracotta orange", "terracotta", "saffron", "rust", "orange", "నారింజ", "కాషాయం", "టెర్రకోట"], "#C2410C", "Terracotta Orange"),
        (["charcoal black", "jet black", "black", "dark", "నలుపు", "నల్లని"], "#18181B", "Charcoal Black"),
        (["ivory white", "off white", "cream", "white", "తెలుపు", "తెల్లని", "ఐవరీ", "వెన్న"], "#FAF7F2", "Ivory White"),
        (["metallic silver", "silver zari", "silver", "gray", "వెండి", "సిల్వర్"], "#94A3B8", "Metallic Silver"),
        (["chocolate brown", "copper", "brown", "గోధుమ", "రాగి"], "#78350F", "Chocolate Brown")
    ]

    # 2. Comprehensive Handloom Motif Catalog with English & Telugu Names & Placements
    MOTIF_DEFINITIONS = [
        ("rose", MOTIF_CATALOG[1], [
            "rose motif", "rose motifs", "rose flower", "rose flowers", "rose butti", "rose buttis", 
            "roses", "rosebud", "gulabi", "గులాబీ పువ్వు", "గులాబీ మోటిఫ్", "గులాబి పువ్వు", 
            "గులాబీలు", "గులాబి", "గులాబీ"
        ]),
        ("lotus", MOTIF_CATALOG[0], [
            "lotus", "lotuses", "kamala", "kamal", "padma", "తామర పువ్వు", "కమలం", "తామర", 
            "కమల", "పద్మం", "తామర పూవు", "పూలు", "పూల మోటిఫ్"
        ]),
        ("jasmine", MOTIF_CATALOG[2], [
            "jasmine", "malle moggu", "malli moggu", "malle", "malli", "moggu", "chameli", 
            "mallipoo", "మల్లె మొగ్గలు", "మల్లె మొగ్గ", "మల్లెపువ్వు", "మల్లెలు", "మల్లె", "మల్లి"
        ]),
        ("sunflower", MOTIF_CATALOG[3], [
            "sunflower", "sunflowers", "surajmukhi", "suryakanthi", "సూర్యకాంతి పువ్వు", 
            "సూర్యకాంతి", "పొద్దుతిరుగుడు"
        ]),
        ("peacock", MOTIF_CATALOG[4], [
            "peacock", "peacocks", "mayuri", "mayur", "mor", "నెమలి", "నెమళ్ళు", 
            "మయూరి", "మయూరం"
        ]),
        ("mango", MOTIF_CATALOG[5], [
            "mango motif", "mango motifs", "mango", "paisley", "paisleys", "kalka", "ambi", 
            "keri", "మామిడి పిందె", "మామిడి పిందే", "మామిడి", "కల్కా", "పైస్లే"
        ]),
        ("parrot", MOTIF_CATALOG[6], [
            "parrot", "parrots", "kili", "chiluka", "ramachiluka", "tota", "రామచిలుక", 
            "చిలుకలు", "చిలుక"
        ]),
        ("temple", MOTIF_CATALOG[7], [
            "temple motif", "temple gopuram", "gopuram motif", "spire", "గోపురం మోటిఫ్", 
            "గోపురం", "గోపురాలు", "కోవెల"
        ]),
        ("ikat", MOTIF_CATALOG[8], [
            "geometric ikat", "ikat diamond", "double ikat", "geometric pattern", 
            "geometric patterns", "geometric design", "geometric motif", "geometric", 
            "geometry", "ఇకత్ డైమండ్", "ఇకత్", "రేఖాగణిత నమూనా", "రేఖాగణిత"
        ]),
        ("leaves", MOTIF_CATALOG[9], [
            "leaves and vines", "leaves & vines", "leaf motif", "leaves", "leaf", "vine", 
            "vines", "lata", "creeper", "creepers", "ఆకులు & తీగలు", "తీగలు", "ఆకులు", 
            "తీగ", "ఆకు", "లత"
        ]),
        ("elephant", MOTIF_CATALOG[10], [
            "elephant", "elephants", "gaja", "hathi", "ఏనుగు", "ఏనుగులు", "గజ"
        ]),
        ("swan", MOTIF_CATALOG[11], [
            "swan", "swans", "hamsa", "హంస", "హంసలు"
        ])
    ]

    found_motif_spans = []
    for motif_id, catalog_item, keywords in MOTIF_DEFINITIONS:
        for kw in keywords:
            start_pos = 0
            while True:
                idx = prompt_lower.find(kw, start_pos)
                if idx == -1:
                    break
                is_word_start = (idx == 0) or prompt_lower[idx - 1] in " ,.;:!?\"'()/-"
                end_idx = idx + len(kw)
                is_word_end = (end_idx == len(prompt_lower)) or prompt_lower[end_idx] in " ,.;:!?\"'()/-"

                is_only_rose_pink = (kw in ['rose', 'గులాబీ']) and \
                    any(c in prompt_lower for c in ['rose pink', 'rose color', 'rose colour', 'గులాబీ రంగు', 'గులాబి రంగు']) and \
                    not any(m in prompt_lower for m in ['rose motif', 'rose flower', 'rose butti', 'roses', 'గులాబీ పువ్వు', 'గులాబీలు'])

                if is_word_start and is_word_end and not is_only_rose_pink:
                    found_motif_spans.append({
                        "motif_id": motif_id,
                        "catalog_item": catalog_item,
                        "keyword": kw,
                        "index": idx,
                        "length": len(kw)
                    })
                start_pos = idx + len(kw)

        # Standalone "rose" check with boundary
        if motif_id == "rose" and re.search(r'\brose\b', prompt_lower):
            has_color = any(c in prompt_lower for c in ['rose pink', 'rose color', 'rose colour'])
            has_explicit = any(m in prompt_lower for m in ['rose motif', 'rose flower', 'rose butti', 'roses'])
            if not has_color or has_explicit:
                match = re.search(r'\brose\b', prompt_lower)
                if match and not any(o["motif_id"] == "rose" for o in found_motif_spans):
                    found_motif_spans.append({
                        "motif_id": "rose",
                        "catalog_item": catalog_item,
                        "keyword": "rose",
                        "index": match.start(),
                        "length": 4
                    })

    found_motif_spans.sort(key=lambda x: (x["index"], -x["length"]))
    non_overlapping_motifs = []
    for occ in found_motif_spans:
        overlaps = any(
            (occ["index"] >= prev["index"] and occ["index"] < prev["index"] + prev["length"]) or
            (prev["index"] >= occ["index"] and prev["index"] < occ["index"] + occ["length"])
            for prev in non_overlapping_motifs
        )
        if not overlaps:
            non_overlapping_motifs.append(occ)

    border_motif = None
    pallu_motif = None
    body_motif = None
    primary_motif = None

    for occ in non_overlapping_motifs:
        before_win = prompt_lower[max(0, occ["index"] - 35):occ["index"]]
        after_win = prompt_lower[occ["index"] + occ["length"]:min(len(prompt_lower), occ["index"] + occ["length"] + 35)]
        comb = before_win + " " + occ["keyword"] + " " + after_win

        is_border = any(k in comb for k in ['border', 'anchu', 'kaddi', 'బోర్డర్', 'అంచు'])
        is_pallu = any(k in comb for k in ['pallu', 'kongu', 'పల్లూ', 'కొంగు'])
        is_body = any(k in comb for k in ['body', 'all over', 'butti', 'buttis', 'fabric', 'saree', 'బాడీ', 'చీర', 'అంతా'])

        if is_border and not border_motif:
            border_motif = occ["catalog_item"]
        elif is_pallu and not pallu_motif:
            pallu_motif = occ["catalog_item"]
        elif is_body and not body_motif:
            body_motif = occ["catalog_item"]
        elif not primary_motif:
            primary_motif = occ["catalog_item"]

    if not primary_motif:
        primary_motif = body_motif or border_motif or pallu_motif

    user_specified_motif = (primary_motif is not None)

    # 3. Andhra Pradesh Handloom Tradition Detection
    if any(k in prompt_lower for k in ['dharmavaram', 'bridal', 'kada', 'brocade', 'ధర్మవరం', 'కాడా', 'పెళ్లి పట్టు']):
        style_info = HANDLOOM_STYLES[4]
        style_label = "Dharmavaram Bridal Brocade"
    elif any(k in prompt_lower for k in ['uppada', 'jamdani', 'translucent', 'lightweight', 'ఉప్పాడ', 'జమ్‌దానీ', 'తేలిక']):
        style_info = HANDLOOM_STYLES[1]
        style_label = "Uppada Jamdani Silks"
    elif any(k in prompt_lower for k in ['pochampally', 'double ikat', 'ikat', 'పోచంపల్లి', 'ఇకత్']):
        style_info = HANDLOOM_STYLES[2]
        style_label = "Pochampally Double Ikat"
    elif any(k in prompt_lower for k in ['venkatagiri', 'spires', 'butti', 'buttis', 'chalu', 'వెంకటగిరి', 'బుటాలు', 'శిఖరాలు']):
        style_info = HANDLOOM_STYLES[3]
        style_label = "Venkatagiri Zari Spires"
    elif any(k in prompt_lower for k in ['mangalagiri', 'nizam', 'gopuram', 'cotton', 'మంగళగిరి', 'నిజాం']):
        style_info = HANDLOOM_STYLES[0]
        style_label = "Mangalagiri Cotton & Silk"
    else:
        style_info = HANDLOOM_STYLES[0]
        style_label = "Mangalagiri Cotton & Silk"

    # Default motif from selected tradition only when user has not specified one
    if not primary_motif:
        if "dharmavaram" in style_label.lower():
            primary_motif = MOTIF_CATALOG[4] # Peacock
        elif "uppada" in style_label.lower():
            primary_motif = MOTIF_CATALOG[0] # Lotus
        elif "pochampally" in style_label.lower():
            primary_motif = MOTIF_CATALOG[8] # Ikat
        elif "venkatagiri" in style_label.lower():
            primary_motif = MOTIF_CATALOG[0] # Lotus
        else:
            primary_motif = MOTIF_CATALOG[7] # Temple Gopuram

    if not body_motif:
        body_motif = primary_motif
    if not pallu_motif:
        pallu_motif = primary_motif

    # 4. Contextual Color Extraction for Body, Border, Pallu, and Motif
    found_occurrences = []
    for keywords, hex_val, color_name in COLOR_DEFS:
        for kw in keywords:
            start_pos = 0
            while True:
                idx = prompt_lower.find(kw, start_pos)
                if idx == -1:
                    break
                is_word_start = (idx == 0) or prompt_lower[idx - 1] in " ,.;:!?\"'()/-"
                end_idx = idx + len(kw)
                is_word_end = (end_idx == len(prompt_lower)) or prompt_lower[end_idx] in " ,.;:!?\"'()/-"

                is_rose_flower = (kw in ['rose', 'గులాబీ']) and (primary_motif['id'] == 'rose' or (body_motif and body_motif['id'] == 'rose')) and \
                    not any(k in prompt_lower for k in ['rose pink', 'rose color', 'rose colour', 'గులాబీ రంగు', 'గులాబి రంగు'])

                if is_word_start and is_word_end and not is_rose_flower:
                    found_occurrences.append({
                        "hex": hex_val,
                        "name": color_name,
                        "index": idx,
                        "length": len(kw)
                    })
                start_pos = idx + len(kw)

    found_occurrences.sort(key=lambda x: (x["index"], -x["length"]))
    non_overlapping = []
    for occ in found_occurrences:
        overlaps = any(
            (occ["index"] >= prev["index"] and occ["index"] < prev["index"] + prev["length"]) or
            (prev["index"] >= occ["index"] and prev["index"] < occ["index"] + occ["length"])
            for prev in non_overlapping
        )
        if not overlaps:
            non_overlapping.append(occ)

    user_body = None
    user_border = None
    user_pallu = None
    user_motif_color = None

    for occ in non_overlapping:
        before_win = prompt_lower[max(0, occ["index"] - 35):occ["index"]]
        after_win = prompt_lower[occ["index"] + occ["length"]:min(len(prompt_lower), occ["index"] + occ["length"] + 35)]
        comb = before_win + " " + after_win

        is_motif_ctx = any(k in comb for k in ['motif', 'motifs', 'zari', 'butti', 'buttis', 'flower', 'మోటిఫ్', 'జరీ', 'పువ్వు'])
        is_border_ctx = any(k in comb for k in ['border', 'anchu', 'kaddi', 'బోర్డర్', 'అంచు'])
        is_pallu_ctx = any(k in comb for k in ['pallu', 'kongu', 'పల్లూ', 'కొంగు'])
        is_body_ctx = any(k in comb for k in ['body', 'saree body', 'saree', 'fabric', 'బాడీ', 'చీర'])

        if is_motif_ctx and not user_motif_color:
            user_motif_color = occ
        elif is_border_ctx and not user_border:
            user_border = occ
        elif is_pallu_ctx and not user_pallu:
            user_pallu = occ
        elif is_body_ctx and not user_body:
            user_body = occ
        else:
            occ["unassigned"] = True

    for occ in [o for o in non_overlapping if o.get("unassigned")]:
        if not user_body:
            user_body = occ
        elif not user_border and occ["name"] != user_body["name"]:
            user_border = occ
        elif not user_motif_color and occ["name"] != user_body["name"] and (not user_border or occ["name"] != user_border["name"]):
            user_motif_color = occ

    body_hex = user_body["hex"] if user_body else style_info["defaultBody"]
    border_hex = user_border["hex"] if user_border else style_info["defaultBorder"]
    pallu_hex = user_pallu["hex"] if user_pallu else border_hex
    zari_hex = user_motif_color["hex"] if user_motif_color else "#FBBF24"

    if "silver" in prompt_lower or "వెండి" in prompt_lower:
        zari_hex = "#E2E8F0"

    body_name = user_body["name"] if user_body else style_info["nameEn"]

    if user_body and user_border:
        palette_label = f"{user_body['name']} Body & {user_border['name']} Border"
    elif user_body:
        palette_label = f"{user_body['name']} Body with {style_label} Border"
    elif user_border:
        palette_label = f"{style_label} with {user_border['name']} Border"
    else:
        palette_label = f"{style_label} Heritage Weave"

    # User Pattern preferences
    user_border_style = "temple" if "temple" in style_label.lower() else "double_zari"
    if (border_motif and border_motif["id"] == "peacock") or any(k in prompt_lower for k in ['peacock border', 'నెమలి బోర్డర్', 'నెమలి అంచు']):
        user_border_style = "peacock_border"
    elif any(k in prompt_lower for k in ['temple border', 'gopuram border', 'గోపురం బోర్డర్', 'temple spikes']):
        user_border_style = "temple"
    elif any(k in prompt_lower for k in ['ikat wave', 'wave border', 'ఇకత్ బోర్డర్']):
        user_border_style = "ikat_wave"
    elif any(k in prompt_lower for k in ['chevron', 'zig', 'జిగ్']):
        user_border_style = "chevron_pattern"
    elif any(k in prompt_lower for k in ['stripe', 'గీతల బోర్డర్']):
        user_border_style = "zari_stripes"
    elif border_motif:
        user_border_style = f"{border_motif['id']}_border" if border_motif['id'] == 'peacock' else "double_zari"

    user_body_pattern = "checks" if "mangalagiri" in style_label.lower() else "floral_vines"
    if any(k in prompt_lower for k in ['check', 'kattam', 'గడులు', 'గళ్ళు', 'చెక్స్', 'geometric']):
        user_body_pattern = "checks"
    elif any(k in prompt_lower for k in ['lattice', 'jaal', 'వల']):
        user_body_pattern = "lattice"
    elif any(k in prompt_lower for k in ['paisley lattice', 'మామిడి జాల్']):
        user_body_pattern = "paisley_lattice"
    elif any(k in prompt_lower for k in ['diagonal', 'క్రాస్']):
        user_body_pattern = "diagonal_ikat"
    elif any(k in prompt_lower for k in ['stripe', 'గీతలు']):
        user_body_pattern = "stripes"
    elif any(k in prompt_lower for k in ['butti', 'బుటాలు', 'chalu']):
        user_body_pattern = "scattered_buttis"
    elif any(k in prompt_lower for k in ['solid', 'plain', 'సాదా']):
        user_body_pattern = "solid"
    elif any(k in prompt_lower for k in ['floral vines', 'vines', 'తీగలు']):
        user_body_pattern = "floral_vines"

    user_pallu_style = "grand_medallion"
    if pallu_motif or any(k in prompt_lower for k in ['floral pallu', 'పూల కొంగు', 'పల్లూ లో', 'కొంగు లో']):
        user_pallu_style = "decorative_pallu"
    elif any(k in prompt_lower for k in ['temple pallu', 'cascade', 'గోపురాలు']):
        user_pallu_style = "cascade_temple"
    elif any(k in prompt_lower for k in ['traditional pallu', 'పట్టీల కొంగు', 'గీతల కొంగు']):
        user_pallu_style = "traditional_stripes"
    elif any(k in prompt_lower for k in ['ikat pallu', 'ఇకత్ కొంగు']):
        user_pallu_style = "ikat_block"

    # Define motif variations:
    # If user explicitly requested a motif, preserve it across all generated variations!
    if user_specified_motif:
        motif_var1 = primary_motif
        motif_var2 = primary_motif
        motif_var3 = primary_motif
    else:
        motif_var1 = primary_motif
        motif_var2 = MOTIF_CATALOG[4] if primary_motif["id"] != "peacock" else MOTIF_CATALOG[0]
        motif_var3 = MOTIF_CATALOG[5] if primary_motif["id"] != "mango" else MOTIF_CATALOG[8]

    # Define 5 distinct variation presets (rotated by seed)
    v_configs = [
        {
            "id": 1,
            "title_en": f"Design 1: {user_body_pattern.replace('_', ' ').title()} Body + {user_border_style.replace('_', ' ').title()} Border",
            "title_te": f"డిజైన్ 1: {primary_motif['te']} మోటిఫ్ మరియు సాంప్రదాయ నేత",
            "bodyPattern": user_body_pattern,
            "borderStyle": user_border_style,
            "palluStyle": user_pallu_style,
            "motif": motif_var1,
            "motifArrangement": "staggered",
            "motifDensity": "Medium",
            "layoutType": "Authentic Handloom Layout",
            "zariShine": zari_hex,
            "desc": f"Custom synthesized {primary_motif['en']} handloom design matching prompt."
        },
        {
            "id": 2,
            "title_en": f"Design 2: Geometric Checks + Double Zari Border + Grand Pallu",
            "title_te": "డిజైన్ 2: రేఖాగణిత గడుల బాడీ + జరీ బోర్డర్ + చక్ర పల్లూ",
            "bodyPattern": "checks",
            "borderStyle": "double_zari",
            "palluStyle": "grand_medallion",
            "motif": motif_var2,
            "motifArrangement": "grid",
            "motifDensity": "Dense",
            "layoutType": "Geometric Zari Grid Layout",
            "zariShine": "#F59E0B" if zari_hex == "#FBBF24" else zari_hex,
            "desc": "Kattam checks body pattern with rich double zari border and grand medallion pallu."
        },
        {
            "id": 3,
            "title_en": f"Design 3: Diamond Lattice + Ikat Border + Decorative Pallu",
            "title_te": "డిజైన్ 3: ప్యాటర్న్ వల బాడీ + పూల బోర్డర్ + అలంకార పల్లూ",
            "bodyPattern": "lattice",
            "borderStyle": "ikat_wave",
            "palluStyle": "decorative_pallu",
            "motif": motif_var3,
            "motifArrangement": "lattice_nodes",
            "motifDensity": "Sparse",
            "layoutType": "Decorative Heritage Layout",
            "zariShine": zari_hex,
            "desc": "Diamond lattice body pattern with ikat waves border and intricate multi-paneled decorative pallu."
        },
        {
            "id": 4,
            "title_en": f"Design 4: Diagonal Weave + Peacock Border + Cascading Pallu",
            "title_te": "డిజైన్ 4: క్రాస్ గీతల బాడీ + నెమలి బోర్డర్ + గోపురాల పల్లూ",
            "bodyPattern": "diagonal_ikat",
            "borderStyle": "peacock_border",
            "palluStyle": "cascade_temple",
            "motif": motif_var1,
            "motifArrangement": "diagonal",
            "motifDensity": "Medium",
            "layoutType": "Dynamic Diagonal Weave Layout",
            "zariShine": zari_hex,
            "desc": "Diagonal ikat body weave with repeating peacock border silhouettes and cascading temple pallu."
        },
        {
            "id": 5,
            "title_en": f"Design 5: Fine Stripes + Chevron Border + Color-Blocked Pallu",
            "title_te": "డిజైన్ 5: జరీ గీతల బాడీ + జిగ్-జాగ్ బోర్డర్ + బహుళ రంగుల పల్లూ",
            "bodyPattern": "stripes",
            "borderStyle": "chevron_pattern",
            "palluStyle": "ikat_block",
            "motif": motif_var2,
            "motifArrangement": "border_trailing",
            "motifDensity": "Sparse",
            "layoutType": "Modern Jamdani Layout",
            "zariShine": zari_hex,
            "desc": "Parallel zari pin-stripe body with geometric chevron border and bold color-blocked ikat pallu."
        }
    ]

    # Rotate selection based on seed for "Generate Another Design"
    shift = (seed * 2) % len(v_configs)
    selected_configs = [v_configs[(0 + shift) % len(v_configs)],
                        v_configs[(1 + shift) % len(v_configs)],
                        v_configs[(2 + shift) % len(v_configs)]]

    variations = []
    for idx, cfg in enumerate(selected_configs, 1):
        v_body_hex = body_hex
        v_border_hex = border_hex
        v_pallu_hex = pallu_hex

        # Subtle variation in shade if prompt allows, keeping theme intact
        if idx == 2 and border_hex == pallu_hex:
            v_pallu_hex = border_hex

        weaver_specs = {
            "warpYarn": "2/120s Mulberry Silk" if "silk" in prompt_lower or "పట్టు" in prompt_lower else "2/100s Mercerized Cotton",
            "weftYarn": "Pure Silk 20/22 Denier" if "silk" in prompt_lower or "పట్టు" in prompt_lower else "80s Combed Cotton",
            "reedPicks": f"{80 + idx*4} Reed / {88 + idx*4} Picks per inch",
            "zariType": f"Tested Metallic Zari ({'Silver' if cfg['zariShine'] == '#E2E8F0' else 'Gold'})",
            "estimatedWeavingTime": f"{6 + idx} Days (Handloom Jacquard)",
            "jacquardCards": f"{240 + idx*40} Hooks Jacquard Card Set"
        }

        mot_en = cfg["motif"]["en"]
        mot_te = cfg["motif"]["te"]

        if 'te' in language:
            summary = f"<b>{cfg['title_te']}</b><br/>🎨 రంగులు: {palette_label} <br/>🪷 మోటిఫ్: {mot_te} ({cfg['motifArrangement']}) <br/>🏛️ బోర్డర్: {cfg['borderStyle'].replace('_', ' ').title()} <br/>📐 బాడీ ప్యాటర్న్: {cfg['bodyPattern'].replace('_', ' ').title()}"
        else:
            summary = f"<b>{cfg['title_en']}</b><br/>🎨 Colors: {palette_label} <br/>🪷 Motif: {mot_en} ({cfg['motifArrangement']}) <br/>🏛️ Border: {cfg['borderStyle'].replace('_', ' ').title()} <br/>📐 Body Pattern: {cfg['bodyPattern'].replace('_', ' ').title()}"

        variations.append({
            "variationId": idx,
            "variationTitle": cfg["title_te"] if 'te' in language else cfg["title_en"],
            "style": style_info,
            "colors": {
                "body": v_body_hex,
                "border": v_border_hex,
                "pallu": v_pallu_hex,
                "zari": cfg["zariShine"],
                "paletteName": palette_label
            },
            "motif": cfg["motif"],
            "bodyMotif": body_motif["id"] if body_motif else cfg["motif"]["id"],
            "borderMotif": border_motif["id"] if border_motif else (cfg["borderStyle"].replace('_border', '') if cfg["borderStyle"].endswith('_border') else None),
            "palluMotif": pallu_motif["id"] if pallu_motif else cfg["motif"]["id"],
            "userRequestedMotif": primary_motif["id"] if user_specified_motif else None,
            "bodyPattern": cfg["bodyPattern"],
            "borderStyle": cfg["borderStyle"],
            "palluStyle": cfg["palluStyle"],
            "motifArrangement": cfg["motifArrangement"],
            "motifDensity": cfg["motifDensity"],
            "layoutType": cfg["layoutType"],
            "aiSummary": summary,
            "weaverSpecs": weaver_specs,
            "suggestedTitle": f"{body_name} {mot_en.split()[0]} Saree (Variation {idx})"
        })

    detected_reqs = {
        "color": palette_label,
        "motif": primary_motif["en"],
        "border": f"{user_border_style.replace('_', ' ').title()} Border",
        "style": style_label,
        "userRequestedMotif": primary_motif["id"] if user_specified_motif else None
    }

    return {
        "success": True,
        "variations": variations,
        "suggestion": variations[0], # For backward compatibility
        "detectedRequirements": detected_reqs,
        "prompt": user_prompt
    }

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/suggest', methods=['POST'])
def suggest_design():
    data = request.get_json() or {}
    user_prompt = data.get('prompt', '').strip()
    user_style = data.get('style', '').strip()
    language = data.get('language', 'en-US')
    seed = data.get('seed', 0)

    if user_style and user_style.lower() not in user_prompt.lower():
        user_prompt = f"{user_style} style saree. {user_prompt}"

    result = generate_variations_from_prompt(user_prompt, language, seed)
    return jsonify(result)



@app.route('/api/designs', methods=['GET'])
def get_designs():
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT DesignID, DesignTitle, SareeStyle, FabricType, BodyColor, BorderColor, PalluColor, ZariColor, MotifType, MotifDensity, BorderStyle, PromptUsed, CreatedAt FROM dbo.Designs ORDER BY CreatedAt DESC")
            rows = cursor.fetchall()
            designs = []
            for row in rows:
                designs.append({
                    "id": row[0],
                    "title": row[1],
                    "sareeStyle": row[2],
                    "fabricType": row[3],
                    "bodyColor": row[4],
                    "borderColor": row[5],
                    "palluColor": row[6],
                    "zariColor": row[7],
                    "motifType": row[8],
                    "motifDensity": row[9],
                    "borderStyle": row[10],
                    "prompt": row[11],
                    "createdAt": str(row[12])
                })
            conn.close()
            return jsonify({"success": True, "source": "sql_server", "designs": designs})
        except Exception as e:
            pass
    
    # Fallback to local JSON file
    local_designs = load_local_designs()
    return jsonify({"success": True, "source": "local_storage", "designs": local_designs})


@app.route('/api/designs', methods=['POST'])
def save_design():
    data = request.get_json() or {}
    title = data.get('title', 'Handloom Saree Design')
    saree_style = data.get('sareeStyle', 'Mangalagiri')
    fabric_type = data.get('fabricType', 'Silk')
    body_color = data.get('bodyColor', '#800020')
    border_color = data.get('borderColor', '#D97706')
    pallu_color = data.get('palluColor', '#991B1B')
    zari_color = data.get('zariColor', '#FBBF24')
    motif_type = data.get('motifType', 'Peacock')
    motif_density = data.get('motifDensity', 'Medium')
    border_style = data.get('borderStyle', 'temple')
    prompt_used = data.get('prompt', '')

    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO dbo.Designs (DesignTitle, SareeStyle, FabricType, BodyColor, BorderColor, PalluColor, ZariColor, MotifType, MotifDensity, BorderStyle, PromptUsed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (title, saree_style, fabric_type, body_color, border_color, pallu_color, zari_color, motif_type, motif_density, border_style, prompt_used))
            conn.commit()
            conn.close()
            return jsonify({"success": True, "message": "Design saved to SQL Server successfully!"})
        except Exception as e:
            pass

    # Save locally
    local_designs = load_local_designs()
    new_design = {
        "id": int(datetime.datetime.now().timestamp()),
        "title": title,
        "sareeStyle": saree_style,
        "fabricType": fabric_type,
        "bodyColor": body_color,
        "borderColor": border_color,
        "palluColor": pallu_color,
        "zariColor": zari_color,
        "motifType": motif_type,
        "motifDensity": motif_density,
        "borderStyle": border_style,
        "prompt": prompt_used,
        "createdAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    local_designs.insert(0, new_design)
    save_local_designs(local_designs)

    return jsonify({"success": True, "message": "Design saved to local storage!", "design": new_design})


@app.route('/api/motifs', methods=['GET'])
def get_motifs():
    return jsonify({"success": True, "motifs": MOTIF_CATALOG})


@app.route('/api/palettes', methods=['GET'])
def get_palettes():
    return jsonify({"success": True, "palettes": COLOR_PALETTES})

CONTACT_FILE = os.path.join(os.path.dirname(__file__), 'contact_submissions.json')

@app.route('/api/contact', methods=['POST'])
def submit_contact():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    cluster = data.get('cluster', '').strip()
    purpose = data.get('purpose', '').strip()
    message = data.get('message', '').strip()

    if not name or not email:
        return jsonify({"success": False, "error": "Name and email are required"}), 400

    entry = {
        "id": int(datetime.datetime.now().timestamp() * 1000),
        "name": name,
        "email": email,
        "phone": phone,
        "cluster": cluster,
        "purpose": purpose,
        "message": message,
        "createdAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    try:
        submissions = []
        if os.path.exists(CONTACT_FILE):
            try:
                with open(CONTACT_FILE, 'r', encoding='utf-8') as f:
                    submissions = json.load(f)
            except Exception:
                submissions = []
        submissions.append(entry)
        with open(CONTACT_FILE, 'w', encoding='utf-8') as f:
            json.dump(submissions, f, ensure_ascii=False, indent=2)
    except Exception as e:
        pass

    return jsonify({"success": True, "message": "Thank you! Your message has been received by our Handloom Studio team.", "entry": entry})


@app.route('/api/health', methods=['GET'])
def health():
    db_conn = get_db_connection()
    db_status = "Connected to SQL Server (HandloomDesignDB)" if db_conn else "Running on local JSON mode (SQL Server optional)"
    if db_conn:
        db_conn.close()
    return jsonify({
        "status": "online",
        "app": "Chenetha Design Mitra - Handloom AI Tool",
        "database": db_status
    })

if __name__ == '__main__':
    print("==========================================================")
    print("  CHENETHA DESIGN MITRA - Handloom AI Suggestion Server   ")
    print("  Running on: http://127.0.0.1:5000                       ")
    print("==========================================================")
    app.run(host='0.0.0.0', port=5000, debug=True)
