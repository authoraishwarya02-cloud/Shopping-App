import http.server
import socketserver
import json
import os
import sys
import re
import urllib.parse
from pathlib import Path
from datetime import datetime, timedelta
import random

PORT = 5050
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
PUBLIC_DIR = BASE_DIR / "public"
DB_FILE = DATA_DIR / "db.json"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
PUBLIC_DIR.mkdir(exist_ok=True)

# Initial Seed Data for NARUTO Fashion App
INITIAL_SEED = {
    "users": [
        {
            "id": "usr_demo",
            "name": "Naruto Uzumaki",
            "phone": "9876543210",
            "email": "naruto@leaf.village",
            "created_at": "2026-09-01T10:00:00Z"
        }
    ],
    "otps": {},
    "categories": [
        {"id": "cat_mens", "name": "Men's Clothing", "icon": "fa-mars", "image": "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=600&auto=format&fit=crop&q=80"},
        {"id": "cat_womens", "name": "Women's Clothing", "icon": "fa-venus", "image": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80"},
        {"id": "cat_kids", "name": "Kids", "icon": "fa-child", "image": "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&auto=format&fit=crop&q=80"},
        {"id": "cat_tshirts", "name": "T-Shirts", "icon": "fa-tshirt", "image": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80"},
        {"id": "cat_shirts", "name": "Shirts", "icon": "fa-shirt", "image": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80"},
        {"id": "cat_jeans", "name": "Jeans", "icon": "fa-user-ninja", "image": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80"},
        {"id": "cat_hoodies", "name": "Hoodies", "icon": "fa-vest", "image": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80"},
        {"id": "cat_jackets", "name": "Jackets", "icon": "fa-user-tie", "image": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80"},
        {"id": "cat_cargos", "name": "Cargo Pants", "icon": "fa-socks", "image": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80"},
        {"id": "cat_dresses", "name": "Dresses", "icon": "fa-person-dress", "image": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&auto=format&fit=crop&q=80"},
        {"id": "cat_shoes", "name": "Shoes", "icon": "fa-shoe-prints", "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80"},
        {"id": "cat_accessories", "name": "Accessories", "icon": "fa-glasses", "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"}
    ],
    "products": [
        {
            "id": "prod_1",
            "name": "Akatsuki Cloud Oversized Hoodie",
            "category": "Hoodies",
            "brand": "NARUTO Originals",
            "price": 1899,
            "original_price": 2999,
            "discount": 36,
            "rating": 4.9,
            "reviews_count": 342,
            "stock": 25,
            "is_popular": True,
            "is_new": True,
            "is_bestseller": True,
            "description": "Premium 400 GSM heavyweight cotton fleece hoodie with embroidered Akatsuki red cloud motif. Relaxed drop-shoulder fit designed for modern streetwear styling.",
            "specifications": {
                "Material": "100% Super Combed Organic Cotton",
                "Fit": "Oversized Streetwear Fit",
                "Wash Care": "Machine wash cold inside out",
                "Sleeve": "Long Sleeves with Ribbed Cuffs"
            },
            "sizes": ["S", "M", "L", "XL", "XXL"],
            "colors": ["Matte Black", "Crimson Red", "Shadow Gray"],
            "images": [
                "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800&auto=format&fit=crop&q=80"
            ]
        },
        {
            "id": "prod_2",
            "name": "Shinobi Orange Track Jacket",
            "category": "Jackets",
            "brand": "NARUTO Athletics",
            "price": 2499,
            "original_price": 3999,
            "discount": 37,
            "rating": 4.8,
            "reviews_count": 218,
            "stock": 18,
            "is_popular": True,
            "is_new": True,
            "is_bestseller": False,
            "description": "Iconic high-neck zip track jacket in vibrant Leaf Village orange with black dynamic side panels. Weatherproof breathable shell with mesh lining.",
            "specifications": {
                "Material": "Premium Nylon Poly-Blend",
                "Closure": "YKK Zip Front",
                "Pockets": "Dual Side Zip Pockets",
                "Fit": "Athletic Regular Fit"
            },
            "sizes": ["M", "L", "XL"],
            "colors": ["Signature Orange", "Midnight Black"],
            "images": [
                "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&auto=format&fit=crop&q=80"
            ]
        },
        {
            "id": "prod_3",
            "name": "Tactical Multi-Pocket Cargo Pants",
            "category": "Cargo Pants",
            "brand": "NARUTO Techwear",
            "price": 1999,
            "original_price": 3299,
            "discount": 39,
            "rating": 4.7,
            "reviews_count": 189,
            "stock": 30,
            "is_popular": True,
            "is_new": False,
            "is_bestseller": True,
            "description": "Heavy-duty ripstop cargo trousers featuring 8 utility pockets, adjustable ankle cinch straps, and elasticated drawstring waist.",
            "specifications": {
                "Material": "Cotton Ripstop Fabric",
                "Pockets": "8 Tactical Pockets",
                "Ankle": "Adjustable Drawstring Cinch",
                "Fit": "Tapered Cargo Fit"
            },
            "sizes": ["30", "32", "34", "36"],
            "colors": ["Stealth Black", "Tactical Olive", "Charcoal Gray"],
            "images": [
                "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800&auto=format&fit=crop&q=80"
            ]
        },
        {
            "id": "prod_4",
            "name": "Vintage Acid-Washed Graphic Tee",
            "category": "T-Shirts",
            "brand": "NARUTO Street",
            "price": 999,
            "original_price": 1699,
            "discount": 41,
            "rating": 4.6,
            "reviews_count": 412,
            "stock": 45,
            "is_popular": True,
            "is_new": False,
            "is_bestseller": True,
            "description": "Heavyweight 240 GSM acid-washed vintage t-shirt featuring high-density front print. Pre-shrunk for consistent fit wash after wash.",
            "specifications": {
                "Material": "100% Combed Cotton",
                "GSM": "240 GSM Heavy Weight",
                "Neckline": "Thick Ribbed Crew Neck",
                "Fit": "Boxy Oversized Fit"
            },
            "sizes": ["S", "M", "L", "XL", "XXL"],
            "colors": ["Vintage Charcoal", "Washed Orange", "Snow White"],
            "images": [
                "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80"
            ]
        },
        {
            "id": "prod_5",
            "name": "Dark Slim-Fit Stretch Denim Jeans",
            "category": "Jeans",
            "brand": "NARUTO Denim Co.",
            "price": 2199,
            "original_price": 3499,
            "discount": 37,
            "rating": 4.8,
            "reviews_count": 156,
            "stock": 20,
            "is_popular": False,
            "is_new": True,
            "is_bestseller": False,
            "description": "Premium indigo washed stretch denim jeans engineered for comfort and durability. Subtle whiskering effect with custom branded rivets.",
            "specifications": {
                "Material": "98% Cotton, 2% Elastane",
                "Rise": "Mid-Rise Fit",
                "Wash": "Dark Indigo Vintage",
                "Closure": "Zip Fly with Button"
            },
            "sizes": ["30", "32", "34", "36"],
            "colors": ["Deep Indigo", "Matte Black"],
            "images": [
                "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=800&auto=format&fit=crop&q=80"
            ]
        },
        {
            "id": "prod_6",
            "name": "Classic Linen-Blend Casual Shirt",
            "category": "Shirts",
            "brand": "NARUTO Couture",
            "price": 1499,
            "original_price": 2499,
            "discount": 40,
            "rating": 4.5,
            "reviews_count": 94,
            "stock": 15,
            "is_popular": False,
            "is_new": True,
            "is_bestseller": False,
            "description": "Breathable cotton-linen blend button-down shirt ideal for casual outings and smart streetwear pairing.",
            "specifications": {
                "Material": "55% Linen, 45% Cotton",
                "Collar": "Button-Down Collar",
                "Sleeve": "Full Sleeve with Roll-up Tab",
                "Pattern": "Solid Matte Finish"
            },
            "sizes": ["M", "L", "XL"],
            "colors": ["Cream White", "Olive Green", "Burnt Orange"],
            "images": [
                "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80"
            ]
        },
        {
            "id": "prod_7",
            "name": "Floral Tiered Summer Midi Dress",
            "category": "Dresses",
            "brand": "NARUTO Femme",
            "price": 1799,
            "original_price": 2999,
            "discount": 40,
            "rating": 4.9,
            "reviews_count": 275,
            "stock": 22,
            "is_popular": True,
            "is_new": True,
            "is_bestseller": True,
            "description": "Elegantly flowing printed midi dress crafted from soft rayon fabric with elasticated smocked waist and flutter short sleeves.",
            "specifications": {
                "Material": "100% Premium Rayon",
                "Length": "Midi Length",
                "Neckline": "Sweetheart V-Neck",
                "Closure": "Concealed Back Zipper"
            },
            "sizes": ["XS", "S", "M", "L"],
            "colors": ["Sunset Floral", "Emerald Meadow"],
            "images": [
                "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80"
            ]
        },
        {
            "id": "prod_8",
            "name": "Chunky Platform Street Sneakers",
            "category": "Shoes",
            "brand": "NARUTO Kicks",
            "price": 3299,
            "original_price": 5499,
            "discount": 40,
            "rating": 4.8,
            "reviews_count": 310,
            "stock": 14,
            "is_popular": True,
            "is_new": False,
            "is_bestseller": True,
            "description": "Futuristic high-top sneakers with cushioned air-sole unit, suede leather panels, and contrast orange piping.",
            "specifications": {
                "Upper Material": "Genuine Leather & Breathable Mesh",
                "Sole": "Ultra-Cushioned EVA Rubber",
                "Insole": "Memory Foam Ortho Cushion",
                "Closure": "Lace-Up with Ankle Strap"
            },
            "sizes": ["UK 7", "UK 8", "UK 9", "UK 10"],
            "colors": ["Black & Orange", "Pure White & Silver"],
            "images": [
                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80"
            ]
        },
        {
            "id": "prod_9",
            "name": "Chrono Orange-Accent Matte Wristwatch",
            "category": "Accessories",
            "brand": "NARUTO Timepieces",
            "price": 2799,
            "original_price": 4999,
            "discount": 44,
            "rating": 4.7,
            "reviews_count": 128,
            "stock": 12,
            "is_popular": False,
            "is_new": True,
            "is_bestseller": False,
            "description": "50m Water Resistant chronograph quartz watch featuring matte black stainless steel case and high-durability orange silicone strap.",
            "specifications": {
                "Movement": "Japanese Quartz Movement",
                "Case Diameter": "44mm Matte Steel",
                "Strap": "Medical Grade Silicone",
                "Water Resistance": "5 ATM / 50 Meters"
            },
            "sizes": ["One Size"],
            "colors": ["Matte Black / Orange"],
            "images": [
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&auto=format&fit=crop&q=80"
            ]
        },
        {
            "id": "prod_10",
            "name": "Kids Ninja Soft Cotton Graphic Tee",
            "category": "Kids",
            "brand": "NARUTO Junior",
            "price": 699,
            "original_price": 1199,
            "discount": 41,
            "rating": 4.9,
            "reviews_count": 87,
            "stock": 40,
            "is_popular": False,
            "is_new": True,
            "is_bestseller": True,
            "description": "Ultra-soft bio-washed hypoallergenic cotton t-shirt for kids. Skin-friendly non-toxic print that stays vibrant after multiple washes.",
            "specifications": {
                "Material": "100% Bio-Washed Soft Cotton",
                "Age Group": "4-12 Years",
                "Safety": "OEKO-TEX Certified Non-Toxic Ink",
                "Fit": "Regular Comfortable Fit"
            },
            "sizes": ["4-6Y", "6-8Y", "8-10Y", "10-12Y"],
            "colors": ["Sunny Orange", "Royal Blue", "Bright Yellow"],
            "images": [
                "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&auto=format&fit=crop&q=80"
            ]
        },
        {
            "id": "prod_11",
            "name": "Distressed Vintage Denim Trucker Jacket",
            "category": "Jackets",
            "brand": "NARUTO Denim Co.",
            "price": 2899,
            "original_price": 4599,
            "discount": 37,
            "rating": 4.8,
            "reviews_count": 164,
            "stock": 16,
            "is_popular": True,
            "is_new": True,
            "is_bestseller": False,
            "description": "Classic 14oz rigid denim trucker jacket with custom hand-distressed detailing, shank buttons, and fleece detachable collar.",
            "specifications": {
                "Material": "100% Heavyweight Cotton Denim",
                "Detailing": "Hand Distressed & Abrasion Effects",
                "Pockets": "Twin Chest Pockets + Side Slits",
                "Fit": "Relaxed Trucker Fit"
            },
            "sizes": ["M", "L", "XL"],
            "colors": ["Washed Blue", "Vintage Black"],
            "images": [
                "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=800&auto=format&fit=crop&q=80"
            ]
        },
        {
            "id": "prod_12",
            "name": "Ribbed Knit Bodycon Evening Dress",
            "category": "Dresses",
            "brand": "NARUTO Femme",
            "price": 1999,
            "original_price": 3299,
            "discount": 39,
            "rating": 4.7,
            "reviews_count": 92,
            "stock": 19,
            "is_popular": False,
            "is_new": True,
            "is_bestseller": False,
            "description": "Sleek ribbed knit silhouette dress featuring side slit details and elegant square neckline. Flattering curve-enhancing stretch fabric.",
            "specifications": {
                "Material": "Viscose Elastane Stretch Knit",
                "Neckline": "Square Collarline",
                "Detail": "Thigh-High Side Slit",
                "Care": "Hand wash recommended"
            },
            "sizes": ["S", "M", "L"],
            "colors": ["Jet Black", "Rust Orange", "Burgundy"],
            "images": [
                "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&auto=format&fit=crop&q=80"
            ]
        }
    ],
    "cart": {
        "usr_demo": []
    },
    "wishlist": {
        "usr_demo": ["prod_1", "prod_8"]
    },
    "addresses": {
        "usr_demo": [
            {
                "id": "addr_1",
                "name": "Naruto Uzumaki",
                "phone": "9876543210",
                "house": "Hokage Residence #7",
                "street": "Main Street, Leaf Village",
                "landmark": "Near Ichiraku Ramen",
                "city": "Konoha",
                "state": "Fire Country",
                "pincode": "400001",
                "is_default": True
            }
        ]
    },
    "orders": [
        {
            "id": "ORD-782910",
            "user_id": "usr_demo",
            "items": [
                {
                    "product_id": "prod_1",
                    "name": "Akatsuki Cloud Oversized Hoodie",
                    "price": 1899,
                    "quantity": 1,
                    "size": "L",
                    "color": "Matte Black",
                    "image": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80"
                }
            ],
            "address": {
                "name": "Naruto Uzumaki",
                "phone": "9876543210",
                "house": "Hokage Residence #7",
                "street": "Main Street, Leaf Village",
                "city": "Konoha",
                "state": "Fire Country",
                "pincode": "400001"
            },
            "subtotal": 1899,
            "discount": 0,
            "delivery_fee": 0,
            "tax": 95,
            "total_amount": 1994,
            "payment_method": "Online UPI (GPay)",
            "payment_status": "Paid",
            "order_status": "Out for Delivery",
            "status_history": [
                {"status": "Placed", "time": "2026-09-04T09:30:00Z", "note": "Order received and validated"},
                {"status": "Confirmed", "time": "2026-09-04T10:00:00Z", "note": "Payment verified. Seller confirmed order."},
                {"status": "Packed", "time": "2026-09-04T14:20:00Z", "note": "Packed in eco-friendly NARUTO box"},
                {"status": "Shipped", "time": "2026-09-05T06:00:00Z", "note": "Handed over to NARUTO Express (Tracking #NEX-98213)"},
                {"status": "Out for Delivery", "time": "2026-09-05T09:15:00Z", "note": "Rohan from NARUTO Express is out for delivery in Konoha"}
            ],
            "courier_name": "NARUTO Express Direct",
            "tracking_number": "NEX-98213",
            "order_date": "2026-09-04T09:30:00Z",
            "estimated_delivery": "Today by 6:00 PM"
        }
    ],
    "notifications": [
        {
            "id": "notif_1",
            "user_id": "usr_demo",
            "title": "Out for Delivery! 🚚",
            "message": "Order #ORD-782910 is out for delivery today. Get ready to style your new Akatsuki Hoodie!",
            "time": "2026-09-05T09:15:00Z",
            "is_read": False,
            "order_id": "ORD-782910"
        },
        {
            "id": "notif_2",
            "user_id": "usr_demo",
            "title": "Welcome to NARUTO Fashion 🔥",
            "message": "Use code 'NARUTO10' to get an extra 10% OFF on your first streetwear purchase!",
            "time": "2026-09-01T10:00:00Z",
            "is_read": True,
            "order_id": None
        }
    ]
}

def load_db():
    if not DB_FILE.exists():
        save_db(INITIAL_SEED)
        return INITIAL_SEED
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data
    except Exception as e:
        print(f"Error loading DB: {e}")
        return INITIAL_SEED

def save_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

class NarutoAPIHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def respond_json(self, data, code=200):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def get_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            raw_body = self.rfile.read(content_length).decode('utf-8')
            try:
                return json.loads(raw_body)
            except Exception:
                return {}
        return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        db = load_db()

        # API Routes
        if path == '/api/categories':
            return self.respond_json(db.get('categories', []))

        elif path == '/api/products':
            products = db.get('products', [])
            
            # Search filtering
            search = query.get('q', [''])[0].strip().lower()
            category = query.get('category', [''])[0].strip()
            brand = query.get('brand', [''])[0].strip()
            sort_by = query.get('sort', ['popular'])[0].strip()

            if search:
                products = [
                    p for p in products 
                    if search in p['name'].lower() 
                    or search in p['category'].lower() 
                    or search in p['brand'].lower()
                    or search in p['description'].lower()
                ]

            if category and category != 'All':
                products = [p for p in products if p['category'].lower() == category.lower()]

            if brand and brand != 'All':
                products = [p for p in products if p['brand'].lower() == brand.lower()]

            # Sorting
            if sort_by == 'price_low':
                products.sort(key=lambda x: x['price'])
            elif sort_by == 'price_high':
                products.sort(key=lambda x: x['price'], reverse=True)
            elif sort_by == 'rating':
                products.sort(key=lambda x: x['rating'], reverse=True)
            elif sort_by == 'newest':
                products.sort(key=lambda x: x.get('is_new', False), reverse=True)
            else: # popular
                products.sort(key=lambda x: x.get('is_popular', False), reverse=True)

            return self.respond_json(products)

        elif path.startswith('/api/products/'):
            pid = path.replace('/api/products/', '')
            products = db.get('products', [])
            prod = next((p for p in products if p['id'] == pid), None)
            if prod:
                return self.respond_json(prod)
            return self.respond_json({'error': 'Product not found'}, 404)

        elif path == '/api/wishlist':
            user_id = query.get('user_id', ['usr_demo'])[0]
            wish_ids = db.get('wishlist', {}).get(user_id, [])
            products = db.get('products', [])
            wish_prods = [p for p in products if p['id'] in wish_ids]
            return self.respond_json(wish_prods)

        elif path == '/api/cart':
            user_id = query.get('user_id', ['usr_demo'])[0]
            cart_items = db.get('cart', {}).get(user_id, [])
            return self.respond_json(cart_items)

        elif path == '/api/addresses':
            user_id = query.get('user_id', ['usr_demo'])[0]
            addresses = db.get('addresses', {}).get(user_id, [])
            return self.respond_json(addresses)

        elif path == '/api/orders':
            user_id = query.get('user_id', ['usr_demo'])[0]
            orders = [o for o in db.get('orders', []) if o.get('user_id') == user_id]
            orders.sort(key=lambda x: x.get('order_date', ''), reverse=True)
            return self.respond_json(orders)

        elif path.startswith('/api/orders/'):
            oid = path.replace('/api/orders/', '')
            orders = db.get('orders', [])
            ord_item = next((o for o in orders if o['id'] == oid), None)
            if ord_item:
                return self.respond_json(ord_item)
            return self.respond_json({'error': 'Order not found'}, 404)

        elif path == '/api/notifications':
            user_id = query.get('user_id', ['usr_demo'])[0]
            notifs = [n for n in db.get('notifications', []) if n.get('user_id') == user_id]
            notifs.sort(key=lambda x: x.get('time', ''), reverse=True)
            return self.respond_json(notifs)

        elif path == '/api/admin/orders':
            orders = db.get('orders', [])
            orders.sort(key=lambda x: x.get('order_date', ''), reverse=True)
            return self.respond_json(orders)

        elif path == '/api/admin/stats':
            orders = db.get('orders', [])
            products = db.get('products', [])
            users = db.get('users', [])
            total_revenue = sum(o.get('total_amount', 0) for o in orders if o.get('payment_status') == 'Paid')
            return self.respond_json({
                'revenue': total_revenue,
                'orders_count': len(orders),
                'products_count': len(products),
                'users_count': len(users)
            })

        # Static files fallback
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.get_body()
        db = load_db()

        # Auth - Send OTP
        if path == '/api/auth/send-otp':
            phone = body.get('phone', '').strip()
            if not phone or len(phone) < 10:
                return self.respond_json({'error': 'Please enter a valid 10-digit phone number.'}, 400)
            
            # Generate deterministic or random 6 digit OTP for quick testing
            otp = "789012"
            db['otps'][phone] = otp
            save_db(db)
            return self.respond_json({
                'message': 'OTP sent successfully to +91 ' + phone,
                'phone': phone,
                'debug_otp': otp # Provided so user can test without real SMS setup
            })

        # Auth - Verify OTP
        elif path == '/api/auth/verify-otp':
            phone = body.get('phone', '').strip()
            otp = body.get('otp', '').strip()

            saved_otp = db['otps'].get(phone)
            if not saved_otp or saved_otp != otp:
                return self.respond_json({'error': 'Incorrect OTP. Please try again.'}, 400)

            # Check if user exists
            existing_user = next((u for u in db['users'] if u['phone'] == phone), None)
            if existing_user:
                return self.respond_json({
                    'message': 'Login successful!',
                    'user': existing_user,
                    'is_new_user': False
                })
            else:
                return self.respond_json({
                    'message': 'OTP verified! Please complete your signup profile.',
                    'phone': phone,
                    'is_new_user': True
                })

        # Auth - Signup
        elif path == '/api/auth/signup':
            phone = body.get('phone', '').strip()
            name = body.get('name', '').strip()
            email = body.get('email', '').strip()

            if not name:
                return self.respond_json({'error': 'Full name is required.'}, 400)

            user_id = f"usr_{int(datetime.now().timestamp())}"
            new_user = {
                'id': user_id,
                'name': name,
                'phone': phone,
                'email': email or f"{phone}@naruto.fashion",
                'created_at': datetime.now().isoformat()
            }
            db['users'].append(new_user)
            db['cart'][user_id] = []
            db['wishlist'][user_id] = []
            db['addresses'][user_id] = []
            save_db(db)

            return self.respond_json({
                'message': 'Account created successfully!',
                'user': new_user
            })

        # Wishlist - Add / Remove
        elif path == '/api/wishlist/toggle':
            user_id = body.get('user_id', 'usr_demo')
            product_id = body.get('product_id')

            user_wish = db['wishlist'].get(user_id, [])
            if product_id in user_wish:
                user_wish.remove(product_id)
                added = False
            else:
                user_wish.append(product_id)
                added = True
            
            db['wishlist'][user_id] = user_wish
            save_db(db)
            return self.respond_json({'added': added, 'wishlist': user_wish})

        # Cart - Add Item
        elif path == '/api/cart/add':
            user_id = body.get('user_id', 'usr_demo')
            product_id = body.get('product_id')
            size = body.get('size', 'M')
            color = body.get('color', 'Default')
            quantity = int(body.get('quantity', 1))

            products = db.get('products', [])
            prod = next((p for p in products if p['id'] == product_id), None)
            if not prod:
                return self.respond_json({'error': 'Product not found'}, 404)

            if prod.get('stock', 0) <= 0:
                return self.respond_json({'error': 'Sorry, this product is currently out of stock.'}, 400)

            cart_items = db['cart'].get(user_id, [])
            existing_item = next((i for i in cart_items if i['product_id'] == product_id and i.get('size') == size and i.get('color') == color), None)

            if existing_item:
                existing_item['quantity'] += quantity
            else:
                cart_items.append({
                    'id': f"item_{int(datetime.now().timestamp() * 1000)}",
                    'product_id': product_id,
                    'name': prod['name'],
                    'brand': prod['brand'],
                    'price': prod['price'],
                    'original_price': prod['original_price'],
                    'image': prod['images'][0],
                    'size': size,
                    'color': color,
                    'quantity': quantity,
                    'stock': prod['stock']
                })

            db['cart'][user_id] = cart_items
            save_db(db)
            return self.respond_json({'message': 'Added to cart successfully', 'cart': cart_items})

        # Address - Add
        elif path == '/api/addresses/add':
            user_id = body.get('user_id', 'usr_demo')
            new_addr = {
                'id': f"addr_{int(datetime.now().timestamp())}",
                'name': body.get('name'),
                'phone': body.get('phone'),
                'house': body.get('house'),
                'street': body.get('street'),
                'landmark': body.get('landmark', ''),
                'city': body.get('city'),
                'state': body.get('state'),
                'pincode': body.get('pincode'),
                'is_default': body.get('is_default', False)
            }

            addresses = db['addresses'].get(user_id, [])
            if new_addr['is_default']:
                for a in addresses:
                    a['is_default'] = False
            if len(addresses) == 0:
                new_addr['is_default'] = True

            addresses.append(new_addr)
            db['addresses'][user_id] = addresses
            save_db(db)
            return self.respond_json({'message': 'Address added', 'addresses': addresses})

        # Order - Place Order
        elif path == '/api/orders/place':
            user_id = body.get('user_id', 'usr_demo')
            payment_method = body.get('payment_method', 'Cash on Delivery')
            address = body.get('address')

            cart_items = db['cart'].get(user_id, [])
            if not cart_items:
                return self.respond_json({'error': 'Your cart is empty.'}, 400)

            if not address:
                return self.respond_json({'error': 'Please select a delivery address.'}, 400)

            subtotal = sum(item['price'] * item['quantity'] for item in cart_items)
            discount = body.get('discount', 0)
            delivery_fee = 0 if subtotal > 1499 else 99
            if payment_method == 'Cash on Delivery':
                delivery_fee += 50 # COD charge
            
            tax = int(subtotal * 0.05) # 5% GST
            total_amount = subtotal - discount + delivery_fee + tax

            order_id = f"ORD-{random.randint(100000, 999999)}"
            now_iso = datetime.now().isoformat()
            estimated_deliv = (datetime.now() + timedelta(days=3)).strftime("%A, %b %d")

            order_status = "Placed"
            payment_status = "Paid" if "Online" in payment_method or "UPI" in payment_method or "Card" in payment_method else "Pending (COD)"

            new_order = {
                'id': order_id,
                'user_id': user_id,
                'items': cart_items,
                'address': address,
                'subtotal': subtotal,
                'discount': discount,
                'delivery_fee': delivery_fee,
                'tax': tax,
                'total_amount': total_amount,
                'payment_method': payment_method,
                'payment_status': payment_status,
                'order_status': order_status,
                'status_history': [
                    {'status': 'Placed', 'time': now_iso, 'note': 'Order received and confirmed by customer.'}
                ],
                'courier_name': 'NARUTO Express',
                'tracking_number': f"NEX-{random.randint(10000, 99999)}",
                'order_date': now_iso,
                'estimated_delivery': estimated_deliv
            }

            db['orders'].append(new_order)
            # Clear cart
            db['cart'][user_id] = []

            # Add notification
            db['notifications'].append({
                'id': f"notif_{int(datetime.now().timestamp())}",
                'user_id': user_id,
                'title': 'Order Placed Successfully! 🎉',
                'message': f"Your NARUTO order #{order_id} worth ₹{total_amount} has been placed.",
                'time': now_iso,
                'is_read': False,
                'order_id': order_id
            })

            save_db(db)
            return self.respond_json({'message': 'Order placed successfully!', 'order': new_order})

        # Admin - Add Product
        elif path == '/api/admin/products/add':
            new_prod = {
                'id': f"prod_{int(datetime.now().timestamp())}",
                'name': body.get('name'),
                'category': body.get('category'),
                'brand': body.get('brand', 'NARUTO Originals'),
                'price': float(body.get('price', 0)),
                'original_price': float(body.get('original_price', 0)),
                'discount': int(body.get('discount', 0)),
                'rating': 4.8,
                'reviews_count': 12,
                'stock': int(body.get('stock', 20)),
                'is_popular': True,
                'is_new': True,
                'is_bestseller': False,
                'description': body.get('description', ''),
                'specifications': {
                    'Material': '100% Cotton Premium Blend',
                    'Fit': 'Regular Fit',
                    'Care': 'Machine wash cold'
                },
                'sizes': body.get('sizes', ['S', 'M', 'L', 'XL']),
                'colors': body.get('colors', ['Black', 'Orange']),
                'images': body.get('images', ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'])
            }
            db['products'].append(new_prod)
            save_db(db)
            return self.respond_json({'message': 'Product added successfully', 'product': new_prod})

        # Admin - Update Order Status
        elif path == '/api/admin/orders/update-status':
            order_id = body.get('order_id')
            new_status = body.get('status')
            note = body.get('note', f"Order status updated to {new_status}")

            orders = db.get('orders', [])
            ord_item = next((o for o in orders if o['id'] == order_id), None)
            if not ord_item:
                return self.respond_json({'error': 'Order not found'}, 404)

            ord_item['order_status'] = new_status
            if new_status == 'Delivered':
                ord_item['payment_status'] = 'Paid'

            now_iso = datetime.now().isoformat()
            ord_item['status_history'].append({
                'status': new_status,
                'time': now_iso,
                'note': note
            })

            # Send Notification to customer
            db['notifications'].append({
                'id': f"notif_{int(datetime.now().timestamp())}",
                'user_id': ord_item['user_id'],
                'title': f"Order Status: {new_status} 📦",
                'message': f"Order #{order_id} is now {new_status}. {note}",
                'time': now_iso,
                'is_read': False,
                'order_id': order_id
            })

            save_db(db)
            return self.respond_json({'message': f"Order updated to {new_status}", 'order': ord_item})

        return self.respond_json({'error': 'Invalid endpoint'}, 404)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.get_body()
        db = load_db()

        # Update cart quantity
        if path == '/api/cart/update':
            user_id = body.get('user_id', 'usr_demo')
            item_id = body.get('item_id')
            quantity = int(body.get('quantity', 1))

            cart_items = db['cart'].get(user_id, [])
            item = next((i for i in cart_items if i['id'] == item_id), None)
            if item:
                if quantity <= 0:
                    cart_items.remove(item)
                else:
                    item['quantity'] = quantity
                db['cart'][user_id] = cart_items
                save_db(db)
                return self.respond_json({'message': 'Cart updated', 'cart': cart_items})
            return self.respond_json({'error': 'Cart item not found'}, 404)

        return self.respond_json({'error': 'Invalid endpoint'}, 404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)
        db = load_db()

        if path == '/api/cart/remove':
            user_id = query.get('user_id', ['usr_demo'])[0]
            item_id = query.get('item_id', [''])[0]

            cart_items = db['cart'].get(user_id, [])
            cart_items = [i for i in cart_items if i['id'] != item_id]
            db['cart'][user_id] = cart_items
            save_db(db)
            return self.respond_json({'message': 'Item removed from cart', 'cart': cart_items})

        elif path == '/api/addresses/delete':
            user_id = query.get('user_id', ['usr_demo'])[0]
            addr_id = query.get('addr_id', [''])[0]

            addresses = db['addresses'].get(user_id, [])
            addresses = [a for a in addresses if a['id'] != addr_id]
            db['addresses'][user_id] = addresses
            save_db(db)
            return self.respond_json({'message': 'Address deleted', 'addresses': addresses})

        return self.respond_json({'error': 'Invalid endpoint'}, 404)

if __name__ == '__main__':
    load_db()
    for try_port in [5050, 8080, 8000, 3000, 9000]:
        try:
            httpd = socketserver.TCPServer(("", try_port), NarutoAPIHandler)
            print(f"[NARUTO SERVER] Fashion Backend & App running at http://localhost:{try_port}")
            httpd.serve_forever()
            break
        except OSError:
            continue


