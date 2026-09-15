import io
import re
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple

ALIAS_MAP = {
    "risk_id": [
        "risk id", "risk_id", "code", "risk code", "risk_code", "id", "ref"
    ],
    "key_business_process": [
        "key business process / objective", "key business process", "strategic objective",
        "business process", "process", "objective", "key business process / objective"
    ],
    "risk_description": [
        "risk description", "description", "risk", "details", "risk details"
    ],
    "category": [
        "category", "risk category", "type", "risk type"
    ],
    "causes": [
        "causes", "root causes", "cause", "risk causes"
    ],
    "consequence": [
        "consequence", "consequences", "impact description", "effect", "effects"
    ],
    "inherent_likelihood": [
        "likelihood (1–5)", "likelihood (1-5)", "likelihood", "inherent likelihood",
        "l", "inh likelihood", "inherent_likelihood"
    ],
    "inherent_impact": [
        "impact (1–5)", "impact (1-5)", "impact", "inherent impact",
        "i", "inh impact", "inherent_impact"
    ],
    "controls": [
        "existing controls", "controls in place", "controls", "current controls"
    ],
    "control_rating": [
        "control effectiveness", "control rating", "effectiveness"
    ],
    "residual_likelihood": [
        "residual likelihood", "res likelihood", "residual_l", "res_l", "residual_likelihood"
    ],
    "residual_impact": [
        "residual impact", "res impact", "residual_i", "res_i", "residual_impact"
    ],
    "treatment_option": [
        "treatment option", "treatment strategy", "treatment", "strategy"
    ],
    "treatment_actions": [
        "treatment actions (smart)", "treatment actions", "mitigation plan",
        "actions", "action plan", "smart actions", "treatment_actions"
    ],
    "timeframe": [
        "timeframe", "target date", "review date", "timeline", "deadline"
    ],
    "risk_owner": [
        "risk owner", "owner", "owner / logged by", "responsible", "assignee"
    ],
    "status": [
        "status", "state", "progress"
    ],
}

def score_to_rating(score: int) -> str:
    if score <= 4:
        return "Low"
    if score <= 9:
        return "Tolerable"
    if score <= 16:
        return "High"
    return "Critical"

def clean_str(val: Any) -> str:
    if pd.isna(val) or val is None:
        return ""
    s = str(val).strip()
    return "" if s.lower() in ("nan", "none", "null") else s

def clean_header(val: Any) -> str:
    if pd.isna(val) or val is None:
        return ""
    s = str(val).replace("\n", " ").strip()
    # Normalize unicode hyphens/dashes
    s = re.sub(r"[\u2010-\u2015]", "-", s)
    return re.sub(r"\s+", " ", s)

def safe_int(val: Any, default: int = 3, min_val: int = 1, max_val: int = 5) -> int:
    if pd.isna(val) or val is None:
        return default
    try:
        # Extract digits if string contains numbers
        if isinstance(val, str):
            match = re.search(r"\d+", val)
            if match:
                v = int(match.group(0))
            else:
                return default
        else:
            v = int(val)
        return max(min_val, min(max_val, v))
    except Exception:
        return default

def match_column_header(header: str) -> Optional[str]:
    h_clean = clean_header(header).lower()
    for field, aliases in ALIAS_MAP.items():
        for alias in aliases:
            if alias.lower() in h_clean:
                return field
    return None

def parse_template_bytes(content: bytes, filename: str, custom_mapping: Optional[Dict[str, str]] = None) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parses bytes from an uploaded Excel or CSV file.
    Returns: (parsed_items, raw_column_headers)
    """
    is_csv = filename.lower().endswith(".csv")
    df = None
    raw_columns = []

    if is_csv:
        try:
            df = pd.read_csv(io.BytesIO(content))
            raw_columns = [clean_header(c) for c in df.columns]
        except Exception as e:
            raise ValueError(f"Failed to read CSV file: {str(e)}")
    else:
        try:
            xl = pd.ExcelFile(io.BytesIO(content))
            target_sheet = None
            # Prioritize sheets named with 'Risk', 'Register', 'Operational', 'Strategic'
            for s in xl.sheet_names:
                if any(k in s.lower() for k in ("operational", "strategic", "register", "risk")):
                    target_sheet = s
                    break
            if not target_sheet and xl.sheet_names:
                target_sheet = xl.sheet_names[0]

            # Read raw sheet to locate header row
            df_raw = pd.read_excel(xl, sheet_name=target_sheet, header=None)

            header_row = 0
            for row_idx in range(min(25, len(df_raw))):
                row_vals = [clean_header(x).lower() for x in df_raw.iloc[row_idx].dropna().tolist()]
                # Check if this row looks like a header row
                if any("risk" in x or "description" in x or "likelihood" in x for x in row_vals):
                    header_row = row_idx
                    break

            df = pd.read_excel(xl, sheet_name=target_sheet, header=header_row)
            raw_columns = [clean_header(c) for c in df.columns]
        except Exception as e:
            raise ValueError(f"Failed to read Excel file: {str(e)}")

    if df is None or df.empty:
        return [], raw_columns

    # Clean DataFrame column names
    df.columns = [clean_header(c) for c in df.columns]

    # Map column headers to standard fields
    col_field_map = {}
    if custom_mapping:
        # custom_mapping is { "Raw Header in File": "standard_field" }
        for raw_col, std_field in custom_mapping.items():
            col_field_map[clean_header(raw_col)] = std_field
    else:
        for col in df.columns:
            matched = match_column_header(col)
            if matched:
                col_field_map[col] = matched

    items = []
    for idx, row in df.iterrows():
        item_data = {}
        for col, field in col_field_map.items():
            if col in row:
                item_data[field] = row[col]

        # Extract & sanitize values
        desc = clean_str(item_data.get("risk_description") or item_data.get("description"))
        if not desc:
            continue  # Skip empty rows without description

        risk_id = clean_str(item_data.get("risk_id")) or f"RISK-{(idx + 1):03d}"
        key_proc = clean_str(item_data.get("key_business_process"))
        cat = clean_str(item_data.get("category")) or "Operational"
        causes = clean_str(item_data.get("causes"))
        consequence = clean_str(item_data.get("consequence"))

        inh_l = safe_int(item_data.get("inherent_likelihood"), default=3)
        inh_i = safe_int(item_data.get("inherent_impact"), default=3)
        inh_score = inh_l * inh_i
        inh_rat = score_to_rating(inh_score)

        controls = clean_str(item_data.get("controls"))
        ctrl_rating = clean_str(item_data.get("control_rating")) or "Partial"

        res_l = safe_int(item_data.get("residual_likelihood"), default=max(1, inh_l - 1))
        res_i = safe_int(item_data.get("residual_impact"), default=max(1, inh_i - 1))
        res_score = res_l * res_i
        res_rat = score_to_rating(res_score)

        treat_opt = clean_str(item_data.get("treatment_option")) or "Treat"
        treat_act = clean_str(item_data.get("treatment_actions"))
        timeframe = clean_str(item_data.get("timeframe"))
        owner = clean_str(item_data.get("risk_owner"))
        status = clean_str(item_data.get("status")) or "Identified"

        # Map status to standard choices
        status_lower = status.lower()
        if "mitigat" in status_lower or "progress" in status_lower:
            status = "Under Mitigation"
        elif "resolve" in status_lower or "closed" in status_lower or "complete" in status_lower:
            status = "Resolved"
        else:
            status = "Identified"

        parsed_item = {
            "risk_id": risk_id,
            "item": desc[:50],  # short summary title
            "key_business_process": key_proc,
            "risk_description": desc,
            "category": cat,
            "causes": causes,
            "consequence": consequence,
            "inherent_likelihood": inh_l,
            "inherent_impact": inh_i,
            "inherent_risk_score": inh_score,
            "inherent_risk_rating": inh_rat,
            "controls": controls,
            "control_rating": ctrl_rating,
            "residual_likelihood": res_l,
            "residual_impact": res_i,
            "residual_risk_score": res_score,
            "residual_risk_rating": res_rat,
            "treatment_option": treat_opt,
            "treatment_actions": treat_act,
            "timeframe": timeframe,
            "risk_owner": owner,
            "status": status,
        }
        items.append(parsed_item)

    return items, raw_columns
