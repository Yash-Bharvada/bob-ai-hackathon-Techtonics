"""
Stage 2 — Train Model 1: Health Index Regression
==================================================
Dataset : Health index1.csv  (Kaggle: shashwatwork/failure-analysis-in-
          power-transformers-dataset, real data, 470 rows)
Target  : Health index   (DAMAGE score — 13.4=pristine, >=50=severe)
Features: 14 DGA + electrical / oil-quality columns (exact spelling preserved)
          NEVER include "Life expectation" — it leaks the target.

Methodology (exactly as specified):
  - RandomForestRegressor(n_estimators=200, min_samples_leaf=2, random_state=42)
  - 80/20 train/test split (stratified by binned health index)
  - 5-fold CV on the 80% train split  → reported separately
  - Held-out 20% test → reported separately (R2 ~0.76, MAE ~6)
  - SHAP TreeExplainer for per-instance top-3 feature explanations
  - RUL heuristic (no ground truth): health_index>=70 steep segment

Output: src/models/risk_model.pkl  {"model": model, "feature_cols": [...]}
"""

import os
import pickle
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split

warnings.filterwarnings("ignore")

MODELS_DIR = Path(__file__).parent
DATA_DIR   = MODELS_DIR.parent / "data"
RANDOM_SEED = 42

# ---------------------------------------------------------------------------
# Feature columns — exact spelling from Kaggle dataset
# ---------------------------------------------------------------------------
FEATURE_COLS = [
    "Hydrogen", "Oxigen", "Nitrogen", "Methane", "CO", "CO2",
    "Ethylene", "Ethane", "Acethylene",
    "DBDS", "Power factor", "Interfacial V", "Dielectric rigidity",
    "Water content",
]
TARGET_COL = "Health index"
LEAK_COL   = "Life expectation"   # must NEVER appear in features

# ---------------------------------------------------------------------------
# 1. Load dataset (try kagglehub first, then local)
# ---------------------------------------------------------------------------
def load_health_index_data() -> pd.DataFrame:
    """Attempt kagglehub download; fall back to local CSV."""
    csv_path = DATA_DIR / "Health index1.csv"

    if csv_path.exists():
        print(f"[Model1] Loading local file: {csv_path}")
        df = pd.read_csv(csv_path)
        return df

    try:
        import kagglehub
        print("[Model1] Downloading via kagglehub...")
        path = kagglehub.dataset_download(
            "shashwatwork/failure-analysis-in-power-transformers-dataset"
        )
        # kagglehub extracts to a temp dir — find the CSV
        for root, dirs, files in os.walk(path):
            for fname in files:
                if "health" in fname.lower() and fname.endswith(".csv"):
                    full = Path(root) / fname
                    print(f"[Model1] Found: {full}")
                    df = pd.read_csv(full)
                    df.to_csv(csv_path, index=False)   # cache locally
                    return df
        raise FileNotFoundError("CSV not found in kagglehub download")
    except Exception as exc:
        print(f"[Model1] kagglehub failed: {exc}")
        print("[Model1] Generating surrogate training data from synthetic time-series.")
        return _build_surrogate_df()


def _build_surrogate_df() -> pd.DataFrame:
    """
    Fallback: build a training set from the synthetic time-series.
    Adds modest noise to avoid trivial overfitting.
    This is clearly labeled as surrogate data in the output.
    """
    ts = pd.read_csv(DATA_DIR / "transformer_timeseries.csv")
    rng = np.random.default_rng(RANDOM_SEED)
    rows = []
    for _, row in ts.iterrows():
        r = {col: max(0.0, float(row[col]) + rng.normal(0, float(row[col]) * 0.05 + 0.01))
             for col in FEATURE_COLS}
        r[TARGET_COL] = float(row["health_index"])
        rows.append(r)
    df = pd.DataFrame(rows)
    print(f"[Model1] Surrogate dataset: {len(df)} rows from synthetic time-series.")
    return df


df_raw = load_health_index_data()
print(f"[Model1] Raw dataset shape: {df_raw.shape}")
print(f"[Model1] Columns: {list(df_raw.columns)}")

# ---------------------------------------------------------------------------
# 2. Validate columns
# ---------------------------------------------------------------------------
missing_feats = [c for c in FEATURE_COLS if c not in df_raw.columns]
if missing_feats:
    raise ValueError(f"Missing feature columns: {missing_feats}")

if LEAK_COL in df_raw.columns:
    print(f"[Model1] Dropping leak column '{LEAK_COL}' — not a feature.")

if TARGET_COL not in df_raw.columns:
    raise ValueError(f"Target column '{TARGET_COL}' not found in dataset.")

df = df_raw[FEATURE_COLS + [TARGET_COL]].dropna()
print(f"[Model1] After dropna: {len(df)} rows.")
print(f"[Model1] Target stats — mean: {df[TARGET_COL].mean():.1f}, "
      f"std: {df[TARGET_COL].std():.1f}, "
      f"min: {df[TARGET_COL].min():.1f}, "
      f"max: {df[TARGET_COL].max():.1f}")
print(f"[Model1] % records with pristine baseline (~13.4): "
      f"{(df[TARGET_COL] < 20).mean()*100:.1f}%")

# ---------------------------------------------------------------------------
# 3. Train/test split — stratified by binned target
# ---------------------------------------------------------------------------
bins = pd.cut(df[TARGET_COL], bins=[0, 20, 40, 60, 80, 999], labels=False)
X = df[FEATURE_COLS].values
y = df[TARGET_COL].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=bins
)
print(f"\n[Model1] Split: {len(X_train)} train / {len(X_test)} test")

# ---------------------------------------------------------------------------
# 4. 5-fold CV on train split
# ---------------------------------------------------------------------------
model_cv = RandomForestRegressor(
    n_estimators=200, min_samples_leaf=2, random_state=RANDOM_SEED, n_jobs=-1
)
kf = KFold(n_splits=5, shuffle=True, random_state=RANDOM_SEED)
cv_r2  = cross_val_score(model_cv, X_train, y_train, cv=kf, scoring="r2")
cv_mae = cross_val_score(model_cv, X_train, y_train, cv=kf,
                         scoring="neg_mean_absolute_error")

print("\n" + "="*60)
print("5-FOLD CROSS-VALIDATION (on 80% train split)")
print("="*60)
print(f"  R2  per fold : {[round(v,3) for v in cv_r2]}")
print(f"  R2  mean±std : {cv_r2.mean():.3f} +/- {cv_r2.std():.3f}")
print(f"  MAE per fold : {[round(-v,2) for v in cv_mae]}")
print(f"  MAE mean±std : {(-cv_mae).mean():.2f} +/- {(-cv_mae).std():.2f}")

# ---------------------------------------------------------------------------
# 5. Fit final model on full train split; evaluate on held-out test
# ---------------------------------------------------------------------------
model = RandomForestRegressor(
    n_estimators=200, min_samples_leaf=2, random_state=RANDOM_SEED, n_jobs=-1
)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
test_r2  = r2_score(y_test, y_pred)
test_mae = mean_absolute_error(y_test, y_pred)

print("\n" + "="*60)
print("HELD-OUT TEST SET (genuine 20%, never seen during CV)")
print("="*60)
print(f"  R2  : {test_r2:.3f}  (target ~0.76)")
print(f"  MAE : {test_mae:.2f}  (target ~6)")
print()

# Feature importance
fi = pd.Series(model.feature_importances_, index=FEATURE_COLS).sort_values(ascending=False)
print("Top-5 feature importances:")
for feat, imp in fi.head(5).items():
    print(f"  {feat:<22} {imp:.4f}")

# ---------------------------------------------------------------------------
# 6. SHAP — TreeExplainer for per-instance top-3 feature explanations
# ---------------------------------------------------------------------------
print("\n[Model1] Computing SHAP values (TreeExplainer)...")
explainer = shap.TreeExplainer(model)
# Use test set; compute for first 50 rows for speed
shap_sample = X_test[:50]
shap_values = explainer.shap_values(shap_sample)

# Example: per-instance top-3 for first test record
print("\nSHAP example — Test record #0:")
sv = shap_values[0]
feat_shap = sorted(zip(FEATURE_COLS, sv), key=lambda x: abs(x[1]), reverse=True)
for rank, (feat, val) in enumerate(feat_shap[:3], 1):
    direction = "increases" if val > 0 else "decreases"
    print(f"  #{rank} {feat:<22}: SHAP={val:+.3f} ({direction} predicted damage)")

print(f"\n  Predicted health index: {model.predict(shap_sample[:1])[0]:.1f}")
print(f"  True health index     : {y_test[0]:.1f}")

# ---------------------------------------------------------------------------
# 7. Save model artifact
# ---------------------------------------------------------------------------
artifact = {
    "model": model,
    "feature_cols": FEATURE_COLS,
    "target_col": TARGET_COL,
    "test_r2": test_r2,
    "test_mae": test_mae,
    "cv_r2_mean": cv_r2.mean(),
    "cv_r2_std": cv_r2.std(),
}

pkl_path = MODELS_DIR / "risk_model.pkl"
with open(pkl_path, "wb") as f:
    pickle.dump(artifact, f)

print(f"\n[Model1] Saved: {pkl_path}")
print("="*60)
print("Stage 2 complete.")
print("="*60)
