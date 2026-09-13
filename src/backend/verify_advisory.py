import urllib.request, json
r = urllib.request.urlopen('http://localhost:8000/api/asset/TX-107?generate_advisory=true')
d = json.loads(r.read())
adv = d.get('advisory_text', '')
is_fallback = '[Advisory' in adv or adv == ''
print('advisory_text present:', bool(adv))
print('source detected:', 'Template fallback' if is_fallback else 'AI-generated (Bob)')
print('text (first 150 chars):', adv[:150])
