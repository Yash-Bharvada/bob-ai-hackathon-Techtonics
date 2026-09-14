"""
Stage 3 — Train Model 2: DGA Fault Classifier
===============================================
Dataset : dga_dataset.csv  (Kaggle: luizflaviopereira/dga-dissolved-gas-
          analysis, real data, 4150 rows, semicolon-separated,
          comma decimal separators)
Target  : Fail column (strip whitespace before use)
Labels  : NF, D1, D2, PD, T1, T2, T3

Raw features : H2, CH4, C2H6, C2H4, C2H2  (short gas codes)
Engineered   : CH4_H2  = CH4/(H2+1)
               C2H2_C2H4 = C2H2/(C2H4+1)
               C2H4_C2H6 = C2H4/(C2H6+1)

CRITICAL: SHORT gas codes here (H2, CH4, C2H6, C2H4, C2H2) — different
from Model 1 full names. Rename step is in the integration pipeline.

Methodology (exactly as specified):
  - RandomForestClassifier(n_estimators=300, max_depth=12,
      class_weight='balanced', random_state=42)
  - Stratified 80/20 split
  - Full classification_report + raw confusion matrix (not just accuracy)
  - T2 recall ~0.74 is expected — document honestly, never hide it

Output: src/models/dga_fault_model.pkl
        {"model", "raw_gas_cols", "engineered_cols", "classes"}
"""

import pickle
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

warnings.filterwarnings("ignore")

MODELS_DIR  = Path(__file__).parent
DATA_DIR    = MODELS_DIR.parent / "data"
RANDOM_SEED = 42

RAW_GAS_COLS  = ["H2", "CH4", "C2H6", "C2H4", "C2H2"]
ENG_COLS      = ["CH4_H2", "C2H2_C2H4", "C2H4_C2H6"]
LABEL_COL     = "Fail"

# ---------------------------------------------------------------------------
# 1. Load dataset
# ---------------------------------------------------------------------------
def load_dga_data() -> pd.DataFrame:
    csv_path = DATA_DIR / "dga_dataset.csv"

    if csv_path.exists():
        print(f"[Model2] Loading local file: {csv_path}")
        # semicolon-separated, comma decimals
        df = pd.read_csv(csv_path, sep=";", decimal=",")
        return df

    try:
        import kagglehub, os
        print("[Model2] Downloading via kagglehub...")
        path = kagglehub.dataset_download(
            "luizflaviopereira/dga-dissolved-gas-analysis"
        )
        for root, dirs, files in os.walk(path):
            for fname in files:
                if fname.endswith(".csv"):
                    full = Path(root) / fname
                    print(f"[Model2] Found: {full}")
                    # try semicolon first
                    try:
                        df = pd.read_csv(full, sep=";", decimal=",")
                        if LABEL_COL in df.columns or any("Fail" in c for c in df.columns):
                            df.to_csv(csv_path, sep=";", decimal=",", index=False)
                            return df
                    except Exception:
                        pass
                    try:
                        df = pd.read_csv(full)
                        df.to_csv(csv_path, index=False)
                        return df
                    except Exception:
                        pass
        raise FileNotFoundError("CSV not found in kagglehub download")
    except Exception as exc:
        print(f"[Model2] kagglehub failed: {exc}")
        raise RuntimeError(
            "Cannot find dga_dataset.csv locally or via kagglehub. "
            "Please download manually from "
            "https://www.kaggle.com/datasets/luizflaviopereira/dga-dissolved-gas-analysis "
            "and place as src/data/dga_dataset.csv"
        )


df_raw = load_dga_data()
print(f"[Model2] Raw dataset shape: {df_raw.shape}")
print(f"[Model2] Columns: {list(df_raw.columns)}")

# ---------------------------------------------------------------------------
# 2. Normalise column names — strip whitespace everywhere
# ---------------------------------------------------------------------------
df_raw.columns = [c.strip() for c in df_raw.columns]

# Also handle potential column-name variants for the label
if LABEL_COL not in df_raw.columns:
    # Try case-insensitive match
    candidates = [c for c in df_raw.columns if c.strip().lower() == "fail"]
    if candidates:
        df_raw = df_raw.rename(columns={candidates[0]: LABEL_COL})
    else:
        print(f"[Model2] Columns available: {list(df_raw.columns)}")
        raise ValueError(f"Cannot find '{LABEL_COL}' label column.")

# Strip whitespace from label values
df_raw[LABEL_COL] = df_raw[LABEL_COL].astype(str).str.strip()

print(f"[Model2] Label distribution (raw):")
print(df_raw[LABEL_COL].value_counts().to_string())

# ---------------------------------------------------------------------------
# 3. Validate gas columns
# ---------------------------------------------------------------------------
missing = [c for c in RAW_GAS_COLS if c not in df_raw.columns]
if missing:
    print(f"[Model2] Missing raw gas cols: {missing}. Available: {list(df_raw.columns)}")
    # Some datasets use different capitalisation — try remapping
    col_map = {}
    for need in missing:
        for have in df_raw.columns:
            if have.strip().upper() == need.upper():
                col_map[have] = need
    if col_map:
        df_raw = df_raw.rename(columns=col_map)
        print(f"[Model2] Remapped columns: {col_map}")
    missing = [c for c in RAW_GAS_COLS if c not in df_raw.columns]
    if missing:
        raise ValueError(f"Still missing: {missing}")

# Convert to numeric (comma decimals already handled by read_csv decimal=",")
for col in RAW_GAS_COLS:
    df_raw[col] = pd.to_numeric(df_raw[col], errors="coerce")

df = df_raw[RAW_GAS_COLS + [LABEL_COL]].dropna()
print(f"\n[Model2] After dropna: {len(df)} rows.")

# ---------------------------------------------------------------------------
# 4. Engineer ratio features
# ---------------------------------------------------------------------------
df = df.copy()
df["CH4_H2"]    = df["CH4"] / (df["H2"] + 1)
df["C2H2_C2H4"] = df["C2H2"] / (df["C2H4"] + 1)
df["C2H4_C2H6"] = df["C2H4"] / (df["C2H6"] + 1)

ALL_FEATURES = RAW_GAS_COLS + ENG_COLS

# ---------------------------------------------------------------------------
# 5. Stratified train/test split
# ---------------------------------------------------------------------------
X = df[ALL_FEATURES].values
y = df[LABEL_COL].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
)
print(f"[Model2] Split: {len(X_train)} train / {len(X_test)} test")

# ---------------------------------------------------------------------------
# 6. Train classifier
# ---------------------------------------------------------------------------
model = RandomForestClassifier(
    n_estimators=300,
    max_depth=12,
    class_weight="balanced",
    random_state=RANDOM_SEED,
    n_jobs=-1,
)
model.fit(X_train, y_train)

# ---------------------------------------------------------------------------
# 7. Evaluate — full classification report + raw confusion matrix
# ---------------------------------------------------------------------------
y_pred = model.predict(X_test)
classes = model.classes_

print("\n" + "="*60)
print("CLASSIFICATION REPORT (full, not just accuracy)")
print("="*60)
report = classification_report(y_test, y_pred, target_names=classes, digits=3)
print(report)

# Overall accuracy
from sklearn.metrics import accuracy_score
acc = accuracy_score(y_test, y_pred)
print(f"Overall accuracy : {acc:.3f}  (target ~0.91)")

# Macro F1
from sklearn.metrics import f1_score
macro_f1 = f1_score(y_test, y_pred, average="macro")
print(f"Macro F1         : {macro_f1:.3f}  (target ~0.90)")

print("\n" + "="*60)
print("RAW CONFUSION MATRIX")
print("="*60)
cm = confusion_matrix(y_test, y_pred, labels=classes)
# Pretty-print with labels
header = f"{'':>4}" + "".join(f"{c:>6}" for c in classes)
label = "True\\Pred"
print(f"  {label:>10}  " + "  ".join(f"{c:>5}" for c in classes))
for i, row in enumerate(cm):
    print(f"  {classes[i]:>10}  " + "  ".join(f"{v:>5}" for v in row))

# Explicitly flag T2 recall
cr_dict = classification_report(y_test, y_pred, target_names=classes,
                                 output_dict=True)
if "T2" in cr_dict:
    t2_recall = cr_dict["T2"]["recall"]
    print(f"\n  [HONESTY NOTE] T2 recall = {t2_recall:.3f}  "
          f"(~0.74 expected — T2 confused with T1/T3, documented limitation)")
elif "T2 " in cr_dict:
    t2_recall = cr_dict["T2 "]["recall"]
    print(f"\n  [HONESTY NOTE] T2 recall = {t2_recall:.3f}  "
          f"(~0.74 expected — T2 confused with T1/T3, documented limitation)")

# Feature importance
fi = pd.Series(model.feature_importances_, index=ALL_FEATURES).sort_values(ascending=False)
print("\nTop feature importances:")
for feat, imp in fi.head(6).items():
    print(f"  {feat:<14} {imp:.4f}")

# ---------------------------------------------------------------------------
# 8. Save model artifact
# ---------------------------------------------------------------------------
artifact = {
    "model":           model,
    "raw_gas_cols":    RAW_GAS_COLS,
    "engineered_cols": ENG_COLS,
    "all_feature_cols": ALL_FEATURES,
    "classes":         list(classes),
    "test_accuracy":   acc,
    "test_macro_f1":   macro_f1,
    "classification_report": cr_dict,
}

pkl_path = MODELS_DIR / "dga_fault_model.pkl"
with open(pkl_path, "wb") as f:
    pickle.dump(artifact, f)

print(f"\n[Model2] Saved: {pkl_path}")
print("="*60)
print("Stage 3 complete.")
print("="*60)
