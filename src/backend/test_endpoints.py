import urllib.request
import json

# Test /api/ranked
r = urllib.request.urlopen('http://localhost:8000/api/ranked')
data = json.loads(r.read())
print('=== /api/ranked (top 5) ===')
for a in data['ranked_assets'][:5]:
    print(f"  #{a['rank']} {a['asset_id']} score={a['composite_score']:.3f} tier={a['risk_tier']} RUL={a['RUL_days']}d fault={a.get('fault_type','?')}")

# Test /api/asset/TX-115
r2 = urllib.request.urlopen('http://localhost:8000/api/asset/TX-115?generate_advisory=false')
d2 = json.loads(r2.read())
print('=== /api/asset/TX-115 ===')
print(f"  HI={d2['health_index_score']} tier={d2['risk_tier']} RUL={d2['RUL_days']} fault={d2['fault_label']} rank=#{d2.get('rank','?')}")

# Test /api/plan
r3 = urllib.request.urlopen('http://localhost:8000/api/plan')
d3 = json.loads(r3.read())
print('=== /api/plan (summary) ===')
print(f"  plan_date={d3['plan_date']}, CRITICAL={d3['critical_count']}, HIGH={d3['high_count']}")
print(f"  Top action: {d3['asset_actions'][0]['asset_id']} -> {d3['asset_actions'][0]['action_code']}")

# List all endpoints from openapi
r4 = urllib.request.urlopen('http://localhost:8000/openapi.json')
oa = json.loads(r4.read())
print('=== ENDPOINTS ===')
for path in oa['paths']:
    methods = list(oa['paths'][path].keys())
    print(f"  {' '.join(m.upper() for m in methods):6} {path}")
