import sys, io, json, urllib.request, uuid
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

products = [
    {"name": "Topclass EP V58.3 Dye Ink 1LT - Black (03-26)", "price": 4.25, "stock": 512},
    {"name": "Topclass EP V58.3 Dye Ink 1LT - Cyan (03-26)", "price": 4.25, "stock": 512},
    {"name": "Topclass EP V58.3 Dye Ink 1LT - Magenta (03-26)", "price": 4.25, "stock": 384},
    {"name": "Topclass EP V58.3 Dye Ink 1LT - Yellow (03-26)", "price": 4.25, "stock": 512},
    {"name": "Master Book Magic HP Dye Ink 1LT - Black (03-26)", "price": 4.25, "stock": 512},
    {"name": "Master Book Magic HP Dye Ink 1LT - Cyan (03-26)", "price": 4.25, "stock": 512},
    {"name": "Master Book Magic HP Dye Ink 1LT - Magenta (03-26)", "price": 4.25, "stock": 512},
    {"name": "Master Book Magic HP Dye Ink 1LT - Yellow (03-26)", "price": 4.25, "stock": 512},
    {"name": "Bro T Series Dye Ink - Black", "price": 1.15, "stock": 100},
    {"name": "Bro T Series Dye Ink - Cyan", "price": 1.15, "stock": 100},
    {"name": "Bro T Series Dye Ink - Magenta", "price": 1.15, "stock": 100},
    {"name": "Bro T Series Dye Ink - Yellow", "price": 1.15, "stock": 100},
    {"name": "EP 3110 Dye Ink 70ML - Black", "price": 0.78, "stock": 400},
    {"name": "EP 3110 Dye Ink 70ML - Cyan", "price": 0.78, "stock": 300},
    {"name": "EP 3110 Dye Ink 70ML - Magenta", "price": 0.78, "stock": 300},
    {"name": "EP 3110 Dye Ink 70ML - Yellow", "price": 0.78, "stock": 300},
    {"name": "EP 664 Dye Ink 70ML - Black", "price": 0.78, "stock": 100},
    {"name": "EP 664 Dye Ink 70ML - Cyan", "price": 0.78, "stock": 100},
    {"name": "EP 664 Dye Ink 70ML - Magenta", "price": 0.78, "stock": 100},
    {"name": "EP 664 Dye Ink 70ML - Yellow", "price": 0.78, "stock": 100},
    {"name": "HH GT51/52 HP Dye Ink - Black 90ML", "price": 0.78, "stock": 100},
    {"name": "HH GT51/52 HP Dye Ink - Cyan 70ML", "price": 0.78, "stock": 100},
    {"name": "HH GT51/52 HP Dye Ink - Magenta 70ML", "price": 0.78, "stock": 100},
    {"name": "HH GT51/52 HP Dye Ink - Yellow 70ML", "price": 0.78, "stock": 100},
    {"name": "CN 490 Dye Ink 135ML - Black", "price": 0.88, "stock": 200},
    {"name": "CN 490 Dye Ink 70ML - Cyan", "price": 0.78, "stock": 200},
    {"name": "CN 490 Dye Ink 70ML - Magenta", "price": 0.78, "stock": 200},
    {"name": "CN 490 Dye Ink 70ML - Yellow", "price": 0.78, "stock": 200},
    {"name": "EP 101 Dye Ink - Black", "price": 0.88, "stock": 100},
    {"name": "EP 101 Dye Ink - Cyan", "price": 0.78, "stock": 100},
    {"name": "EP 101 Dye Ink - Magenta", "price": 0.78, "stock": 100},
    {"name": "EP 101 Dye Ink - Yellow", "price": 0.78, "stock": 100},
    {"name": "CN GI-41 Canon Dye Ink 70ML - Cyan", "price": 0.93, "stock": 25},
    {"name": "CN GI-41 Canon Dye Ink 70ML - Magenta", "price": 0.93, "stock": 25},
    {"name": "CN GI-41 Canon Dye Ink 70ML - Yellow", "price": 0.93, "stock": 25},
    {"name": "CN GI-41 Canon Pigment Ink 100ML - Black", "price": 1.98, "stock": 25},
    {"name": "EP Eco Tank Sublimation Ink - Black", "price": 1.95, "stock": 35},
    {"name": "EP Eco Tank Sublimation Ink - Cyan", "price": 1.95, "stock": 35},
    {"name": "EP Eco Tank Sublimation Ink - Magenta", "price": 1.95, "stock": 35},
    {"name": "EP Eco Tank Sublimation Ink - Yellow", "price": 1.95, "stock": 35},
    {"name": "EP L805 Sublimation Ink - Black", "price": 1.95, "stock": 10},
    {"name": "EP L805 Sublimation Ink - Cyan", "price": 1.95, "stock": 10},
    {"name": "EP L805 Sublimation Ink - Light Cyan", "price": 1.95, "stock": 10},
    {"name": "EP L805 Sublimation Ink - Light Magenta", "price": 1.95, "stock": 10},
    {"name": "EP L805 Sublimation Ink - Magenta", "price": 1.95, "stock": 10},
    {"name": "EP L805 Sublimation Ink - Yellow", "price": 1.95, "stock": 10},
    {"name": "Epson C5790/C5890 Tank Set", "price": 10.45, "stock": 520},
    {"name": "C400 Refillable Cartridge", "price": 18.95, "stock": 50},
    {"name": "Waste Ink Tank C6000", "price": 20.45, "stock": 30},
    {"name": "5799 Tank", "price": 4.95, "stock": 56},
    {"name": "Inkjet PP Glossy Sticker A4", "price": 4.65, "stock": 400},
    {"name": "120g Double-Side Glossy Photo Paper A4\u00d7100", "price": 3.20, "stock": 260},
    {"name": "C5290 Belt", "price": 10.45, "stock": 30},
]

KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhamphY29hY2hiempzZHpvaGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTg3NTYsImV4cCI6MjA4ODk3NDc1Nn0.Xa2rU5ViGIgupJDSyt90PVKlD5aSWKRCf4oLjqEik_A"
URL = "https://pajjacoachbzjsdzoheg.supabase.co/rest/v1/products"

rows = []
for p in products:
    rows.append({
        "id": str(uuid.uuid4()),
        "name": p["name"],
        "category": "",
        "price": p["price"],
        "stock": p["stock"],
        "unit": "\u0639\u0628\u0648\u0629",
        "sku": "",
        "description": "",
        "min_stock": 5,
    })

data = json.dumps(rows).encode("utf-8")
req = urllib.request.Request(URL, data=data, method="POST", headers={
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
})

try:
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    print(f"Successfully inserted {len(result)} products!")
    for r in result:
        print(f"  + {r['name']} | ${r['price']} | Stock: {r['stock']}")
except urllib.error.HTTPError as e:
    print(f"Error {e.code}: {e.read().decode()}")
