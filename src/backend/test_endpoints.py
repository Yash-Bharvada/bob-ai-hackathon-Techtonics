"""
test_endpoints.py  (legacy quick-check — updated to match normalised field names)
Use test_connection.py for the full 50-check suite.
"""
import urllib.request
import json

# Test /api/ranked
r = urllib.request.urlopen('http://localhost:8000/api/ranked')
data = json.loads(r.read())
print('=== /api/ranked (top 5) ===')
for a in data['ranked_assets'][:5]:
    print(f"  #{a['rank']} {a['asset_id']} score={a['composite_score']:.3f} "
          f"tier={a['risk_tier']} RUL={a['RUL_days']}d fault={a.get('fault_type','?')}")

# Test /api/asset/TX-115  (normalised: health_index, not health_index_score)
r2 = urllib.request.urlopen('http://localhost:8000/api/asset/TX-115?generate_advisory=false')
d2 = json.loads(r2.read())
print('=== /api/asset/TX-115 ===')
print(f"  HI={d2['health_index']} tier={d2['risk_tier']} RUL={d2['RUL_days']} "
      f"fault={d2['fault_type']} rank=#{d2.get('rank','?')} "
      f"advisory_source={d2.get('advisory_source','?')}")

# Test /api/plan  (normalised: top_10_actions, generated_date)
r3 = urllib.request.urlopen('http://localhost:8000/api/plan')
d3 = json.loads(r3.read())
print('=== /api/plan (summary) ===')
print(f"  generated_date={d3['generated_date']}, "
      f"CRITICAL={d3['critical_count']}, HIGH={d3['high_count']}")
if d3['top_10_actions']:
    a0 = d3['top_10_actions'][0]
    print(f"  Top action: {a0['asset_id']} -> {a0['action_code']} "
          f"({a0['urgency_window']})")
tx = d3.get('tx115_narrative', {})
print(f"  TX-115 narrative: asset_id={tx.get('asset_id')} rul_recovered={tx.get('rul_recovered_days')}d")

# Test /events/report (clean)
req_data = json.dumps({
    "zone_name": "GIDC Industrial",
    "event_description": "Excavation backhoe struck underground cable trench.",
    "reporter_type": "citizen"
}).encode()
req = urllib.request.Request(
    'http://localhost:8000/events/report',
    data=req_data,
    headers={'Content-Type': 'application/json'},
    method='POST'
)
r4 = urllib.request.urlopen(req)
d4 = json.loads(r4.read())
print('=== /events/report (clean) ===')
print(f"  status={d4['status']} incident_id={d4.get('incident_id')} "
      f"category={d4.get('category')} multiplier={d4.get('risk_multiplier')}")

# List all endpoints from openapi
r5 = urllib.request.urlopen('http://localhost:8000/openapi.json')
oa = json.loads(r5.read())
print('=== ENDPOINTS ===')
for path in oa['paths']:
    methods = list(oa['paths'][path].keys())
    print(f"  {' '.join(m.upper() for m in methods):6} {path}")
