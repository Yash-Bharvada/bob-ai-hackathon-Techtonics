"""
Verification: risk_model.pkl loads clean (no shap_explainer key),
and score_asset_risk() still returns top3_shap_features correctly.
"""
import pickle
import sys
from pathlib import Path

# Step 1 — fresh load in this process
pkl_path = Path("src/models/risk_model.pkl")
with open(pkl_path, "rb") as f:
    artifact = pickle.load(f)

print("=== pickle.load() succeeded ===")
print(f"  Keys: {list(artifact.keys())}")
assert "shap_explainer" not in artifact, "FAIL: shap_explainer still present in pkl"
assert "model" in artifact, "FAIL: model key missing"
assert "feature_cols" in artifact, "FAIL: feature_cols key missing"
print("  'shap_explainer' key absent: OK")
print(f"  model type: {type(artifact['model']).__name__}")

# Step 2 — score_asset_risk() returns top3_shap_features
sys.path.insert(0, "src/pipeline")
from score_asset_risk import score_all_assets

result_df = score_all_assets(day=89, generate_advisory=False)
tx107 = result_df[result_df["asset_id"] == "TX-107"].iloc[0]
shap_feats = tx107["top3_shap_features"]

print("\n=== score_asset_risk() SHAP check (TX-107) ===")
print(f"  top3_shap_features: {shap_feats}")
assert shap_feats and len(shap_feats) == 3, "FAIL: expected 3 SHAP features"
assert all(isinstance(f, str) and isinstance(v, float)
           for f, v in shap_feats), "FAIL: unexpected shap feature format"
print("  top3_shap_features: 3 (str, float) pairs returned — OK")
print("\nAll checks passed.")
