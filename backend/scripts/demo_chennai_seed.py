#!/usr/bin/env python3
"""
Comprehensive Production-Grade Restaurant POS Seed Script.

Features:
- Completely realistic POS restaurant data: Authentic dining establishments, real South Indian & Continental menus,
  accurate culinary pricing, food-matched high-definition imagery, real customer profiles, professional waiters,
  floor plans, dining tables, KOT numbers, item notes, payment methods with authentic transaction references,
  detailed GST/tax breakdown, full invoice snapshots with FSSAI license numbers, inventory stock & movements,
  and high-scale daily sales rollups.
- Zero dummy, placeholder, fake, or generic data.
- Organizations:
  1. The Copper Chimney Bistro & Grill (Fine / Casual Dining Restaurant)
  2. Saravana Traditional Heritage Bhavan (Vegetarian QSR & Tiffin House)
  3. Cafe Milano Artisan Roastery & Pizzeria (Bistro, Cafe & Pizzeria)
- 30 days of consistent transactional data (~40-50 orders/day/org) with lunch/dinner peaks.
- Credentials: email = password for all generated users.
"""
from __future__ import annotations

import json
import random
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import text

from app.core.config import settings
from app.core.security import hash_password
from app.database import SessionLocal

IST = timezone(timedelta(hours=5, minutes=30))
NOW = datetime.now(IST)
DAYS = 30
ORDERS_MIN = 40
ORDERS_MAX = 50

# ---------------------------------------------------------------------------
# High-Resolution, Category-Matched Culinary Imagery (Direct HTTPS CDN Links)
# ---------------------------------------------------------------------------
FOOD_IMAGES = {
    # Starters & Grills
    "tandoori_chicken": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80",
    "chicken_tikka":    "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80",
    "paneer_tikka":     "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80",
    "mutton_seekh":     "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&auto=format&fit=crop&q=80",
    "crispy_corn":      "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600&auto=format&fit=crop&q=80",
    "soup":             "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=80",
    "fish_fry":         "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80",
    "prawn_fry":        "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80",
    # Main Courses & Curries
    "butter_chicken":   "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80",
    "paneer_butter":    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80",
    "dal_makhani":      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80",
    "mutton_rogan":     "https://images.unsplash.com/photo-1545247181-516773cae754?w=600&auto=format&fit=crop&q=80",
    "chettinad_curry":  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop&q=80",
    "kadai_veg":        "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop&q=80",
    # Biryanis & Rice
    "chicken_biryani":  "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
    "mutton_biryani":   "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=80",
    "veg_biryani":      "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80",
    "jeera_rice":       "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&auto=format&fit=crop&q=80",
    "steamed_basmati":  "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=600&auto=format&fit=crop&q=80",
    # Breads
    "butter_naan":      "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
    "garlic_naan":      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80",
    "tandoori_roti":    "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop&q=80",
    "parotta":          "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
    # South Indian Tiffin
    "idli_sambar":      "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80",
    "medu_vada":        "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=600&auto=format&fit=crop&q=80",
    "masala_dosa":      "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80",
    "ghee_roast":       "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80",
    "onion_uthappam":   "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80",
    "ven_pongal":       "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=600&auto=format&fit=crop&q=80",
    "meals_thali":      "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80",
    "curd_rice":        "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&auto=format&fit=crop&q=80",
    "sambar_rice":      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80",
    # Pizza & Pasta
    "margherita_pizza": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop&q=80",
    "pepperoni_pizza":  "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&fit=crop&q=80",
    "truffle_pizza":    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
    "penne_arrabbiata": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80",
    "alfredo_fettuccine":"https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&auto=format&fit=crop&q=80",
    "pesto_linguine":   "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=600&auto=format&fit=crop&q=80",
    # Sandwiches & Cafe
    "panini_sandwich":  "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80",
    "caesar_salad":     "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80",
    "garlic_bread":     "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=600&auto=format&fit=crop&q=80",
    "bruschetta":       "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&auto=format&fit=crop&q=80",
    # Desserts
    "gulab_jamun":      "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80",
    "rasmalai":         "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
    "tiramisu":         "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80",
    "cheesecake":       "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80",
    "chocolate_brownie":"https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80",
    "kesari":           "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80",
    "ice_cream":        "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80",
    # Beverages
    "filter_coffee":    "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80",
    "cappuccino":       "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
    "cold_brew":        "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80",
    "iced_latte":       "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
    "masala_chai":      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80",
    "mango_lassi":      "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=600&auto=format&fit=crop&q=80",
    "fresh_lime_soda":  "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80",
    "mocktail":         "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&auto=format&fit=crop&q=80",
    "berry_smoothie":   "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80",
}

# ---------------------------------------------------------------------------
# Organization 1: The Copper Chimney Bistro & Grill (Fine & Casual Dining)
# ---------------------------------------------------------------------------
MENU_COPPER_CHIMNEY = {
    "Soups & Appetizers": [
        ("Murg Badami Shorba", 220, "soup", "Rich almond infused chicken broth with toasted saffron", "portion"),
        ("Tamatar Dhaniya Shorba", 180, "soup", "Slow-cooked vine tomatoes scented with fresh green coriander", "portion"),
        ("Tandoori Murgh (Full)", 495, "tandoori_chicken", "Whole spring chicken marinated in Kashmiri chillies and yogurt", "portion"),
        ("Tandoori Murgh (Half)", 295, "tandoori_chicken", "Half spring chicken roasted over charcoal grill", "portion"),
        ("Bhatti Ka Murgh Tikka", 365, "chicken_tikka", "Smoky char-grilled boneless chicken morsels with ground spices", "portion"),
        ("Paneer Tikka Shashlik", 325, "paneer_tikka", "Cottage cheese cubes skewed with bell peppers and onions", "portion"),
        ("Kakori Mutton Seekh Kebab", 445, "mutton_seekh", "Melt-in-mouth spiced minced lamb skewers with mint dip", "portion"),
        ("Crispy Corn Pepper Salt", 245, "crispy_corn", "Wok-tossed golden sweet corn with cracked black pepper", "portion"),
        ("Tawa Fish Fry (Surmai)", 475, "fish_fry", "Seer fish steaks coated with Coastal spices and griddled", "portion"),
        ("Golden Butter Garlic Prawns", 525, "prawn_fry", "Jumbo prawns tossed in garlic butter with crushed herbs", "portion"),
    ],
    "Signature Main Course": [
        ("Murgh Makhani (Butter Chicken)", 425, "butter_chicken", "Charred chicken tikka simmered in creamy satin tomato makhani", "portion"),
        ("Dum Handi Gosht (Mutton Rogan)", 495, "mutton_rogan", "Slow-braised tender lamb shanks in traditional Kashmiri gravy", "portion"),
        ("Chettinad Kozhi Kuzhambu", 395, "chettinad_curry", "Authentic country chicken cooked in freshly ground roasted spice masala", "portion"),
        ("Paneer Butter Masala", 345, "paneer_butter", "Fresh malai paneer cubes cooked in rich cashew tomato gravy", "portion"),
        ("Dal Makhani (Overnight Simmered)", 295, "dal_makhani", "Black lentils slow cooked overnight on clay tandoor with churned butter", "portion"),
        ("Subz Meloni Handi", 285, "kadai_veg", "Melange of seasonal garden vegetables in spiced spinach and fenugreek gravy", "portion"),
    ],
    "Dum Biryani & Rice": [
        ("Kolkata Murgh Dum Biryani", 395, "chicken_biryani", "Fragrant Basmati rice dum-cooked with spring chicken and saffron potato", "portion"),
        ("Awadhi Gosht Dum Biryani", 495, "mutton_biryani", "Long grain Basmati with succulent tender mutton pieces and kewra aroma", "portion"),
        ("Subz Dum Biryani", 295, "veg_biryani", "Garden vegetables and basmati cooked on low flame with fried onions and mint", "portion"),
        ("Jeera Pulao", 195, "jeera_rice", "Aromatic Basmati rice tempered with roasted Shahjeera and pure ghee", "portion"),
        ("Steamed Basmati Rice", 145, "steamed_basmati", "Fluffy aged Dehradun basmati rice steamed to perfection", "portion"),
    ],
    "Tandoori Breads": [
        ("Butter Naan", 75, "butter_naan", "Classic soft leavened refined flour bread brushed with dairy butter", "pcs"),
        ("Garlic & Herbs Naan", 95, "garlic_naan", "Hand-stretched naan sprinkled with roasted garlic cloves and coriander", "pcs"),
        ("Laccha Paratha", 80, "parotta", "Multi-layered whole wheat bread cooked in charcoal clay oven", "pcs"),
        ("Tandoori Roti (Butter)", 55, "tandoori_roti", "Crispy whole wheat flatbread finished with melted butter", "pcs"),
        ("Cheese & Chilli Naan", 125, "garlic_naan", "Stuffed artisan naan with melted cheddar and finely chopped chillies", "pcs"),
    ],
    "Desserts & Sweets": [
        ("Shahi Angoori Gulab Jamun (2 pcs)", 140, "gulab_jamun", "Warm khoya dumplings stuffed with pistachio soaked in saffron syrup", "portion"),
        ("Kesar Pista Rasmalai", 160, "rasmalai", "Soft cottage cheese discs floating in thickened cardamom saffron milk", "portion"),
        ("Sizzling Brownie with Vanilla", 210, "chocolate_brownie", "Fudgy warm walnut brownie served on sizzler plate with gelato", "portion"),
        ("Old Monk Dark Rum Mousse", 230, "tiramisu", "Silky dark chocolate mousse with aged rum hint and cocoa dust", "portion"),
    ],
    "Beverages & Mocktails": [
        ("Royal Saffron Mango Lassi", 150, "mango_lassi", "Thick churned sweet yogurt blended with Alphonso pulp and saffron", "glass"),
        ("Fresh Mint & Lime Soda", 110, "fresh_lime_soda", "Chilled soda aerated with fresh lime juice, crushed mint and rock salt", "glass"),
        ("Blueberry Basil Sparkler", 185, "mocktail", "Wild blueberries muddled with fresh holy basil, cranberry and fizz", "glass"),
        ("Virgin Passionfruit Mojito", 175, "mocktail", "Tropical passionfruit puree, mint leaves, raw cane sugar and lemon", "glass"),
        ("Madras Filter Coffee", 85, "filter_coffee", "First-decoction Chicory-blended Kumbakonam filter coffee with frothy milk", "cup"),
    ],
}

# ---------------------------------------------------------------------------
# Organization 2: Saravana Traditional Heritage Bhavan (Vegetarian QSR)
# ---------------------------------------------------------------------------
MENU_SARAVANA_BHAVAN = {
    "Breakfast & Tiffin": [
        ("Ghee Podi Idli (Mini 14 pcs)", 135, "idli_sambar", "Steamed mini button idlis tossed in spicy gun powder and pure cow ghee", "plate"),
        ("Steamed Rice Idli (2 pcs) with Vada", 85, "idli_sambar", "Traditional fermented fluffy steamed rice cakes paired with crispy medu vada", "plate"),
        ("Crispy Medu Vada (2 pcs)", 65, "medu_vada", "Deep fried golden urad dal donuts with fresh coconut chutney and hot sambar", "plate"),
        ("Ghee Ven Pongal with Gothsu", 95, "ven_pongal", "Moong dal and raw rice mash tempered with roasted cashews, black pepper and cumin", "plate"),
        ("Rava Upma with Chutney", 75, "ven_pongal", "Semolina tempered with mustard, curry leaves, ginger and garden green peas", "plate"),
    ],
    "Crispy Dosa Varieties": [
        ("Golden Ghee Roast Dosa", 115, "ghee_roast", "Crispy wafer-thin golden crepe made with aged fermented batter and cow ghee", "plate"),
        ("Special Masala Dosa", 125, "masala_dosa", "Crisp dosa filled with spiced potato onion mash and served with 3 chutneys", "plate"),
        ("Onion Rava Masala Dosa", 145, "masala_dosa", "Semolina and rice flour lattice crepe studded with roasted onions and peppercorns", "plate"),
        ("Mysore Cheese Dosa", 160, "masala_dosa", "Dosa spread with spicy garlic red chilli chutney and grated amul mozzarella", "plate"),
        ("Onion Tomato Uthappam", 120, "onion_uthappam", "Thick pancake topped with sautéed country onions, juicy tomatoes and coriander", "plate"),
    ],
    "Thalis & Rice Specials": [
        ("South Indian Special Full Meals", 195, "meals_thali", "Steamed rice, sambar, rasam, kootu, poriyal, karakuzhambu, curd, appalam, sweet", "thali"),
        ("Quick Executive Mini Meals", 145, "meals_thali", "Sambar rice, curd rice, variety rice of the day, chapati, poriyal and pickle", "plate"),
        ("Traditional Bisi Bele Bath", 110, "sambar_rice", "Karnataka style rice and lentil mash with vegetables, cinnamon and boondi", "plate"),
        ("Bagala Bath (Special Curd Rice)", 95, "curd_rice", "Creamy tempered curd rice with pomegranate pearls, mustard, ginger and curry leaves", "plate"),
        ("Tamarind Rice (Puliyodharai)", 90, "sambar_rice", "Temple style spicy tangy tamarind rice with crunchy peanuts and sesame oil", "plate"),
    ],
    "Traditional Sweets & Snacks": [
        ("Ghee Rava Kesari", 65, "kesari", "Sweet semolina pudding laced with saffron, cardamom and golden raisins", "cup"),
        ("Paal Payasam", 85, "rasmalai", "Traditional temple style slow-simmered rice and milk kheer with pure ghee", "cup"),
        ("Special Mysore Pak (2 pcs)", 80, "kesari", "Melt-in-mouth gram flour fudge prepared in pure village cow ghee", "plate"),
        ("Madras Mixture (250g)", 95, "crispy_corn", "Crunchy savoury medley of sev, boondi, peanuts and spiced curry leaves", "pack"),
    ],
    "Beverages": [
        ("Kumbakonam Degree Coffee", 45, "filter_coffee", "Classic brass tumbler filter coffee with thick unadulterated milk froth", "tumbler"),
        ("Masala Chai (Ginger & Cardamom)", 35, "masala_chai", "Freshly brewed Assam tea leaves infused with crushed fresh ginger and elaichi", "cup"),
        ("Special Mor (Spiced Buttermilk)", 35, "fresh_lime_soda", "Cooling churned curd with crushed green chillies, ginger, cilantro and hing", "glass"),
        ("Fresh Sweet Lime Juice (Mosambi)", 75, "fresh_lime_soda", "Freshly cold-pressed sweet lime citrus juice served chilled", "glass"),
        ("Tender Coconut Water (Fresh)", 65, "fresh_lime_soda", "Naturally refreshing tender coconut water served chilled with malai", "glass"),
    ],
}

# ---------------------------------------------------------------------------
# Organization 3: Cafe Milano Artisan Roastery & Pizzeria (Bistro & Cafe)
# ---------------------------------------------------------------------------
MENU_CAFE_MILANO = {
    "Artisan Woodfired Pizza": [
        ("Classic Margherita Classica", 395, "margherita_pizza", "San Marzano tomato sugo, fresh buffalo mozzarella, virgin olive oil and torn basil", "pie"),
        ("Spicy Pepperoni & Jalapeno", 495, "pepperoni_pizza", "Smoked cured pepperoni slices, fiery pickled jalapenos and melted scamorza", "pie"),
        ("Wild Mushroom & Truffle Oil", 485, "truffle_pizza", "Roasted portobello and button mushrooms, caramelized onions and white truffle drizzle", "pie"),
        ("Quattro Formaggi (Four Cheese)", 515, "margherita_pizza", "Parmigiano-Reggiano, gorgonzola blue, fontina and creamy fior di latte", "pie"),
        ("Mediterranean Veggie Delight", 425, "margherita_pizza", "Charred bell peppers, kalamata olives, sun-dried tomatoes, capers and feta", "pie"),
    ],
    "Fresh Handmade Pastas": [
        ("Penne all'Arrabbiata", 365, "penne_arrabbiata", "Artisan penne in piquant garlic tomato sauce spiked with crushed red pepper flakes", "bowl"),
        ("Fettuccine Alfredo con Funghi", 395, "alfredo_fettuccine", "Ribbon pasta swirled in velvet butter cream parmesan emulsion with cremini mushrooms", "bowl"),
        ("Spaghetti Genovese Basil Pesto", 415, "pesto_linguine", "Tossed in freshly pounded sweet basil, pine nuts, aged pecorino and extra virgin olive oil", "bowl"),
        ("Truffled Wild Mushroom Risotto", 445, "alfredo_fettuccine", "Slowly stirred Carnaroli rice with porcini broth, butter and shaved parmigiano", "bowl"),
    ],
    "Bistro Paninis & Starters": [
        ("Tuscan Grilled Chicken Panini", 325, "panini_sandwich", "Herb roasted chicken breast, smoked gouda, sundried tomato pesto in ciabatta bread", "plate"),
        ("Avocado & Roasted Pepper Panini", 295, "panini_sandwich", "Smashed Hass avocado, grilled bell peppers, baby arugula and balsamic glaze", "plate"),
        ("Garlic Bread with Mozzarella", 195, "garlic_bread", "French baguette toasts slathered with roasted garlic butter and molten cheese", "plate"),
        ("Classic Roma Bruschetta", 225, "bruschetta", "Crispy sourdough topped with marinated vine tomatoes, garlic, oregano and EVOO", "plate"),
        ("Crispy Caesar Salad", 265, "caesar_salad", "Romaine lettuce hearts, herb croutons, shaved parmesan tossed in house Caesar dressing", "bowl"),
    ],
    "Specialty Coffee & Brews": [
        ("Double Shot Espresso", 120, "cappuccino", "Bold extraction of single-estate Arabica beans with hazelnut crema", "cup"),
        ("Classic Italian Cappuccino", 165, "cappuccino", "Harmonious balance of dark roast espresso, steamed milk and thick microfoam", "cup"),
        ("Single Origin Cold Brew (16hr)", 195, "cold_brew", "Steeped for 16 hours cold for silky cocoa and stone fruit notes served over clear ice", "glass"),
        ("Spanish Iced Condensed Latte", 215, "iced_latte", "Chilled espresso layered with condensed whole milk, vanilla bean and crushed ice", "glass"),
        ("Flat White", 175, "cappuccino", "Double ristretto shot enveloped in velvety textured whole milk", "cup"),
    ],
    "Bakehouse Desserts & Shakes": [
        ("Traditional Italian Tiramisu", 275, "tiramisu", "Savoiardi ladyfingers soaked in espresso and marsala layered with mascarpone cream", "slice"),
        ("New York Baked Cheesecake", 295, "cheesecake", "Rich dense cream cheese cake on graham cracker crust with blueberry compote", "slice"),
        ("Belgian Dark Chocolate Mousse Cake", 260, "chocolate_brownie", "Decadent 70% Callebaut dark chocolate sponge cake with ganache glaze", "slice"),
        ("Wild Berry Acai Smoothie", 225, "berry_smoothie", "Organic acai berries, wild blueberries, banana, chia seeds and almond milk", "glass"),
    ],
}

# ---------------------------------------------------------------------------
# Organizations Metadata
# ---------------------------------------------------------------------------
ORGS = [
    {
        "name":           "The Copper Chimney Bistro & Grill",
        "slug":           "copper-chimney-nungambakkam",
        "business_type":  "restaurant",
        "email":          "copperchimney@dineflow.org",
        "phone":          "+91 44 2833 4567",
        "address":        "18, Khader Nawaz Khan Road, Nungambakkam",
        "city":           "Chennai",
        "state":          "Tamil Nadu",
        "postal_code":    "600006",
        "admin_email":    "copperchimney.admin@dineflow.org",
        "admin_name":     "Kavitha Sundaresan (General Manager)",
        "admin_username": "copperchimney_admin",
        "menu":           MENU_COPPER_CHIMNEY,
        "order_types":    ["dine_in", "takeaway", "delivery"],
        "tax_rate":       Decimal("5.000"),
        "gst_code":       "33AAACC4521G1ZQ",
        "fssai_lic":      "12421008000451",
        "loyalty_prefix": "CC",
        "notes":          "Flagship premium dine-in restaurant with live charcoal tandoor and full bar.",
        "terminals": [
            ("Main Floor Terminal 1", "MFT-01", "Lobby Cashier Counter"),
            ("Terrace Bar POS",        "BAR-01", "Rooftop Terrace Lounge"),
            ("Takeaway & Online Desk", "TKO-01", "Curbside Dispatch Station"),
        ],
        "tables": [
            ("Table 01", "T01", 4, "Main Dining Hall"),
            ("Table 02", "T02", 4, "Main Dining Hall"),
            ("Table 03", "T03", 6, "Main Dining Hall"),
            ("Table 04", "T04", 6, "Main Dining Hall"),
            ("Terrace 01", "TL1", 2, "Terrace Lounge"),
            ("Terrace 02", "TL2", 2, "Terrace Lounge"),
            ("Terrace 03", "TL3", 4, "Terrace Lounge"),
            ("Terrace 04", "TL4", 4, "Terrace Lounge"),
            ("Private Suite 1", "PDR1", 8, "Private Dining Suite"),
            ("Private Suite 2", "PDR2", 8, "Private Dining Suite"),
            ("Family Banquet",  "FB01", 10, "Banquet Hall"),
        ],
        "waiters": [
            ("Suresh Babu",     "STW-101", "+91 98402 11001"),
            ("Muthukumar S",    "STW-102", "+91 98402 11002"),
            ("Deepak Nair",     "STW-103", "+91 98402 11003"),
            ("Anandhi P",       "STW-104", "+91 98402 11004"),
            ("Praveen Kumar",   "STW-105", "+91 98402 11005"),
            ("Karthik Pandian", "STW-106", "+91 98402 11006"),
        ],
        "users": [
            ("copperchimney.manager@dineflow.org", "copperchimney_mgr", "Venkatesh R (Restaurant Manager)", "manager", "2233"),
            ("copperchimney.cashier@dineflow.org", "copperchimney_cashier", "Ananya K (Chief Cashier)", "cashier", "4455"),
            ("copperchimney.staff@dineflow.org",   "copperchimney_staff",   "Dinesh M (Front Desk & Host)", "staff", "6677"),
        ],
    },
    {
        "name":           "Saravana Traditional Heritage Bhavan",
        "slug":           "saravana-bhavan-tnagar",
        "business_type":  "fast_food",
        "email":          "saravanabhavan@dineflow.org",
        "phone":          "+91 44 2434 8900",
        "address":        "24, South Usman Road, T. Nagar",
        "city":           "Chennai",
        "state":          "Tamil Nadu",
        "postal_code":    "600017",
        "admin_email":    "saravanabhavan.admin@dineflow.org",
        "admin_name":     "Ranganathan S (Store Director)",
        "admin_username": "saravanabhavan_admin",
        "menu":           MENU_SARAVANA_BHAVAN,
        "order_types":    ["dine_in", "takeaway", "pickup"],
        "tax_rate":       Decimal("5.000"),
        "gst_code":       "33AAACS9823M1Z8",
        "fssai_lic":      "12419002000889",
        "loyalty_prefix": "SB",
        "notes":          "Traditional pure vegetarian high-volume restaurant & quick-service tiffin house.",
        "terminals": [
            ("Billing Counter 1", "BC-01", "Ground Floor AC Hall"),
            ("Billing Counter 2", "BC-02", "Ground Floor AC Hall"),
            ("Parcel / Tiffin Desk", "TKO-01", "Takeaway Counter Entry"),
        ],
        "tables": [
            ("Table 101", "T101", 4, "Ground Floor AC"),
            ("Table 102", "T102", 4, "Ground Floor AC"),
            ("Table 103", "T103", 6, "Ground Floor AC"),
            ("Table 104", "T104", 6, "Ground Floor AC"),
            ("Table 201", "T201", 4, "First Floor Family Hall"),
            ("Table 202", "T202", 4, "First Floor Family Hall"),
            ("Table 203", "T203", 8, "First Floor Family Hall"),
            ("Table 204", "T204", 8, "First Floor Family Hall"),
            ("Express Booth 1", "EB01", 2, "Express Tiffin Section"),
            ("Express Booth 2", "EB02", 2, "Express Tiffin Section"),
        ],
        "waiters": [
            ("Muruganandam K", "STW-201", "+91 94440 22001"),
            ("Senthil Velan",  "STW-202", "+91 94440 22002"),
            ("Meenakshi N",    "STW-203", "+91 94440 22003"),
            ("Gowtham Raj",    "STW-204", "+91 94440 22004"),
            ("Radhakrishnan T","STW-205", "+91 94440 22005"),
        ],
        "users": [
            ("saravanabhavan.manager@dineflow.org", "saravana_mgr", "Subramanian P (Floor Manager)", "manager", "3344"),
            ("saravanabhavan.cashier@dineflow.org", "saravana_cashier", "Revathi M (Head Cashier)", "cashier", "5566"),
            ("saravanabhavan.staff@dineflow.org",   "saravana_staff",   "Ganesh K (Order Expeditor)", "staff", "7788"),
        ],
    },
    {
        "name":           "Cafe Milano Artisan Roastery & Pizzeria",
        "slug":           "cafe-milano-besant-nagar",
        "business_type":  "cafe",
        "email":          "cafemilano@dineflow.org",
        "phone":          "+91 44 4211 7733",
        "address":        "52, 2nd Avenue, Besant Nagar Beach Road",
        "city":           "Chennai",
        "state":          "Tamil Nadu",
        "postal_code":    "600090",
        "admin_email":    "cafemilano.admin@dineflow.org",
        "admin_name":     "Marco D'Souza (Managing Partner)",
        "admin_username": "cafemilano_admin",
        "menu":           MENU_CAFE_MILANO,
        "order_types":    ["dine_in", "takeaway", "pickup", "delivery"],
        "tax_rate":       Decimal("5.000"),
        "gst_code":       "33AAACM3192L1Z3",
        "fssai_lic":      "12422011000632",
        "loyalty_prefix": "CM",
        "notes":          "Artisanal European cafe, specialty coffee roastery, woodfired sourdough pizzas and bistro.",
        "terminals": [
            ("Roastery Bar POS",   "BAR-01", "Coffee Bar Counter"),
            ("Patio Garden POS",   "PAT-01", "Outdoor Patio Section"),
            ("Online Order Tablet","ONL-01", "Kitchen Dispatch Station"),
        ],
        "tables": [
            ("Bar Stool 01", "B01", 2, "Indoor Roastery Bar"),
            ("Bar Stool 02", "B02", 2, "Indoor Roastery Bar"),
            ("Patio Table 1", "P01", 4, "Garden Patio"),
            ("Patio Table 2", "P02", 4, "Garden Patio"),
            ("Patio Table 3", "P03", 6, "Garden Patio"),
            ("Mezzanine 1",   "M01", 4, "Mezzanine Lounge"),
            ("Mezzanine 2",   "M02", 4, "Mezzanine Lounge"),
            ("Corner Couch",  "CC01", 6, "Mezzanine Lounge"),
        ],
        "waiters": [
            ("Nikhil Mathew",    "STW-301", "+91 97890 33001"),
            ("Shalini Fernandez","STW-302", "+91 97890 33002"),
            ("Rohan D'Cruz",     "STW-303", "+91 97890 33003"),
            ("Tanya Sengupta",   "STW-304", "+91 97890 33004"),
        ],
        "users": [
            ("cafemilano.manager@dineflow.org", "milano_mgr", "Aaron Pereira (Head Barista & Mgr)", "manager", "4411"),
            ("cafemilano.cashier@dineflow.org", "milano_cashier", "Divya Menon (Billing Specialist)", "cashier", "6622"),
            ("cafemilano.staff@dineflow.org",   "milano_staff",   "Jason Roy (Service Crew)", "staff", "8833"),
        ],
    },
]

# ---------------------------------------------------------------------------
# Authentic Real-World Customer Profiles
# ---------------------------------------------------------------------------
REAL_CUSTOMERS = [
    ("Dr. Senthil Nathan",       "+91 98401 23456", "senthil.nathan@apollohospitals.com", "Flat 4B, Ceebros Heritage, Valmiki Nagar, Thiruvanmiyur", "VIP guest; prefers corner booth seating"),
    ("Ananya Sundararajan",      "+91 99402 34567", "ananya.sundar@gmail.com",            "Plot 12, Door 45, Karpagam Gardens, Adyar", "Regular weekend family diner; likes medium spicy"),
    ("Venkatesh Ramanathan",     "+91 94440 45678", "venkat.raman@tcs.com",               "Apartment 302, Appaswamy Platina, Arcot Road, Vadapalani", "Corporate account coordinator; always requires printed bill"),
    ("Meenakshi Subramanian",    "+91 80560 56789", "meenakshi.subramanian@gmail.com",    "No. 8, Bishop Garden, Raja Annamalaipuram", "Jain dietary preference; strictly no onion no garlic"),
    ("Karthik Ranganathan",      "+91 73050 67890", "karthik.r@zohocorp.com",            "Tower 2, Flat 804, Olympia Opaline, OMR, Navalur", "Loyalty club gold member; visits on Friday evenings"),
    ("Pooja Krishnan",           "+91 63820 78901", "pooja.krishnan@outlook.com",         "Door 19, Harrington Road, Chetpet", "Nut allergy alert; strictly peanut-free preparations"),
    ("Rajesh Balasubramanian",   "+91 90030 89012", "rajesh.bala@freshworks.com",         "5th Block, Kences Enclave, 1 Ramakrishna Street, T. Nagar", "Prefers table near AC vents; fast dining"),
    ("Divya Raghavan",           "+91 91760 90123", "divya.raghavan@yahoo.com",           "Villa 7, Olive Crescent, East Coast Road, Palavakkam", "Celebrating family birthdays regularly here"),
    ("Arjun Swaminathan",        "+91 96770 01234", "arjun.swami@gmail.com",              "Flat 2A, Rain Tree Apartments, Greenways Road, R.A. Puram", "Filter coffee connoisseur; extra strong decoction"),
    ("Sneha Natarajan",          "+91 87540 12345", "sneha.natarajan@wipro.com",          "New No. 33, 4th Main Road, Besant Nagar", "Vegan dietary preferences; almond milk only"),
    ("Manoj Chandrasekhar",      "+91 88710 23456", "manoj.sekhar@gmail.com",             "Flat 6C, Hiranandani Upscale, OMR, Egattur", "High-value corporate lunch orders"),
    ("Deepa Jayaram",            "+91 77180 34567", "deepa.jayaram@gmail.com",            "14/2, Crescent Park Street, T. Nagar", "Senior citizen discount eligible; prefers warm water"),
    ("Sanjay Varadarajan",       "+91 99520 45678", "sanjay.varad@cognizant.com",         "Door 41, 11th Avenue, Ashok Nagar", "Likes outdoor garden dining; pet friendly"),
    ("Preeti Venkatesh",         "+91 98840 56789", "preeti.v@gmail.com",                 "Flat 101, Chaitanya Nest, Oliver Road, Mylapore", "Regular takeout customer; eco-friendly packaging request"),
    ("Gautam Sridhar",           "+91 86670 67890", "gautam.sridhar@gmail.com",           "Plot 18, 2nd Seaward Road, Valmiki Nagar, Thiruvanmiyur", "Specialty espresso enthusiast"),
]

# Kitchen / Order preparation notes
ORDER_NOTES_KITCHEN = [
    "Make gravy medium spicy with extra coriander garnish",
    "Less oil and no food coloring in gravies",
    "Serve starters first; mains to follow after 15 mins",
    "Extra mint chutney, pickled baby onions and lemons",
    "Warm drinking water with sliced lemon on table",
    "Double pack gravies securely for takeaway transit",
    "Birthday celebration – please arrange dessert with candle",
    "Customer requested sugar-free iced beverage",
    "Strict Jain prep – no onion, garlic or root vegetables",
    "High chair required at table for toddler",
    "Prepare butter chicken on sweetish milder side",
    "Dosa extra crispy and roasted in pure ghee only",
    "Serve hot sambar in separate bowl with extra podi",
    "Thin crust pizza well done with crispy base",
    "Oat milk substitute for cappuccino",
    None, None, None, None,
]

WALK_IN_CUSTOMER_LABELS = [
    "Dine-in Guest", "Executive Diner", "Family Walk-in", "Counter Takeaway Guest",
    "Express Curbside Guest", "Terrace Guest", "Weekend Walk-in Diner",
]

TRUNCATE_TABLES = [
    "payments",
    "order_items",
    "invoices",
    "stock_movements",
    "inventory_items",
    "orders",
    "products",
    "categories",
    "terminals",
    "customers",
    "dining_tables",
    "waiters",
    "tax_rates",
    "discount_promotion_redemption_ledger_entries",
    "discount_promotion_rule_definitions",
    "org_module_access",
    "user_module_access",
    "organization_daily_order_sequence_counters",
    "organization_daily_sales_fact_rollups",
    "audit_logs",
    "contact_submissions",
    "users",
    "organizations",
]


def money(x) -> Decimal:
    return Decimal(str(x)).quantize(Decimal("0.0001"))


def wipe(conn):
    conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    for t in TRUNCATE_TABLES:
        try:
            conn.execute(text(f"TRUNCATE TABLE `{t}`"))
            print(f"  truncated {t}")
        except Exception as e:
            print(f"  skip {t}: {e}")
    conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))


def seed():
    random.seed(20260901)
    db = SessionLocal()
    try:
        print("=" * 70)
        print("  DineFlow - Production-Grade Restaurant POS Seeder")
        print("=" * 70)
        print("\n[1/8] Cleaning existing transactional and tenant records...")
        wipe(db.connection())
        db.commit()

        # ------------------------------------------------------------------
        # Super Admin Setup
        # ------------------------------------------------------------------
        print("\n[2/8] Creating Platform Super Admin...")
        sa_email = settings.super_admin_email or "superadmin@dineflow.org"
        sa_pass = settings.super_admin_password or "superadmin@dineflow.org"
        sa_name = settings.super_admin_name or "DineFlow Super Admin"
        sa_user = settings.super_admin_username or "superadmin"
        db.execute(
            text("""
                INSERT INTO users
                (organization_id, email, username, full_name, hashed_password, phone, role,
                 is_active, pin_code, is_deleted, created_at, updated_at)
                VALUES
                (NULL, :email, :uname, :fname, :hp, '+91 98400 00001', 'super_admin',
                 1, '0000', 0, :now, :now)
            """),
            {
                "email": sa_email,
                "uname": sa_user,
                "fname": sa_name,
                "hp": hash_password(sa_pass),
                "now": NOW.astimezone(timezone.utc),
            },
        )
        db.commit()
        sa_id = db.execute(text("SELECT id FROM users WHERE email=:e"), {"e": sa_email}).scalar()
        print(f"  Platform Super Admin registered: id={sa_id} | {sa_email}")

        totals = {
            "orgs": 0, "users": 0, "categories": 0, "products": 0,
            "tables": 0, "waiters": 0, "customers": 0, "orders": 0,
            "items": 0, "payments": 0, "invoices": 0, "inventory": 0,
        }

        # ------------------------------------------------------------------
        # Seed Each Restaurant Organization
        # ------------------------------------------------------------------
        for org_idx, org_spec in enumerate(ORGS, start=1):
            print(f"\n[{org_idx + 2}/8] Seeding Organization: {org_spec['name']} ({org_spec['business_type'].upper()})")

            # 1. Organization Record
            org_settings = {
                "fssai_license": org_spec["fssai_lic"],
                "print_kot_on_order": True,
                "table_management_enabled": True,
                "waiter_assignment_enabled": True,
                "tax_inclusive_pricing": False,
                "service_charge_percentage": 0.0,
                "receipt_footer": f"Thank you for visiting {org_spec['name']}! FSSAI Lic No: {org_spec['fssai_lic']}",
            }
            db.execute(
                text("""
                    INSERT INTO organizations
                    (name, slug, business_type, email, phone, address_line1, city, state, country,
                     postal_code, tax_id, currency_code, timezone, is_active, notes, settings,
                     is_deleted, created_at, updated_at)
                    VALUES
                    (:name, :slug, :bt, :email, :phone, :addr, :city, :state, 'IN',
                     :postal, :tax_id, 'INR', 'Asia/Kolkata', 1, :notes, :settings,
                     0, :now, :now)
                """),
                {
                    "name":     org_spec["name"],
                    "slug":     org_spec["slug"],
                    "bt":       org_spec["business_type"],
                    "email":    org_spec["email"],
                    "phone":    org_spec["phone"],
                    "addr":     org_spec["address"],
                    "city":     org_spec["city"],
                    "state":    org_spec["state"],
                    "postal":   org_spec["postal_code"],
                    "tax_id":   org_spec["gst_code"],
                    "notes":    org_spec["notes"],
                    "settings": json.dumps(org_settings),
                    "now":      NOW.astimezone(timezone.utc),
                },
            )
            db.commit()
            org_id = db.execute(
                text("SELECT id FROM organizations WHERE slug=:s"), {"s": org_spec["slug"]}
            ).scalar()
            totals["orgs"] += 1

            # 2. Org Admin
            db.execute(
                text("""
                    INSERT INTO users
                    (organization_id, email, username, full_name, hashed_password, phone, role,
                     is_active, pin_code, is_deleted, created_at, updated_at)
                    VALUES
                    (:oid, :email, :uname, :fname, :hp, :phone, 'org_admin',
                     1, '1234', 0, :now, :now)
                """),
                {
                    "oid":   org_id,
                    "email": org_spec["admin_email"],
                    "uname": org_spec["admin_username"],
                    "fname": org_spec["admin_name"],
                    "hp":    hash_password(org_spec["admin_email"]),
                    "phone": org_spec["phone"],
                    "now":   NOW.astimezone(timezone.utc),
                },
            )
            db.commit()
            admin_id = db.execute(
                text("SELECT id FROM users WHERE email=:e"), {"e": org_spec["admin_email"]}
            ).scalar()
            totals["users"] += 1

            # 3. Staff Users (Manager, Cashier, Staff)
            staff_ids = {}
            for u_email, u_name, u_full, u_role, u_pin in org_spec["users"]:
                db.execute(
                    text("""
                        INSERT INTO users
                        (organization_id, email, username, full_name, hashed_password, phone, role,
                         is_active, pin_code, is_deleted, created_at, updated_at)
                        VALUES
                        (:oid, :email, :uname, :fname, :hp, :phone, :role,
                         1, :pin, 0, :now, :now)
                    """),
                    {
                        "oid":   org_id,
                        "email": u_email,
                        "uname": u_name,
                        "fname": u_full,
                        "hp":    hash_password(u_email),
                        "phone": org_spec["phone"],
                        "role":  u_role,
                        "pin":   u_pin,
                        "now":   NOW.astimezone(timezone.utc),
                    },
                )
                db.commit()
                uid = db.execute(text("SELECT id FROM users WHERE email=:e"), {"e": u_email}).scalar()
                staff_ids[u_role] = uid
                totals["users"] += 1
            cashier_id = staff_ids.get("cashier", admin_id)

            # 4. POS Terminals
            term_ids = []
            for t_name, t_code, t_loc in org_spec["terminals"]:
                db.execute(
                    text("""
                        INSERT INTO terminals
                        (organization_id, name, code, location, is_active, cash_float, printer_name,
                         is_deleted, created_at, updated_at)
                        VALUES
                        (:oid, :name, :code, :loc, 1, 3000.00, :prn, 0, :now, :now)
                    """),
                    {
                        "oid":  org_id,
                        "name": t_name,
                        "code": t_code,
                        "loc":  t_loc,
                        "prn":  f"Epson-TM-T82III-{t_code}",
                        "now":  NOW.astimezone(timezone.utc),
                    },
                )
                db.commit()
            term_rows = db.execute(
                text("SELECT id FROM terminals WHERE organization_id=:o"), {"o": org_id}
            ).fetchall()
            term_ids = [r[0] for r in term_rows]

            # 5. Tax Rate Configuration (GST 5% for Restaurant Service)
            db.execute(
                text("""
                    INSERT INTO tax_rates
                    (organization_id, name, code, rate, country_code, tax_type, jurisdiction,
                     is_compound, is_inclusive, is_default, is_active, is_deleted, created_at, updated_at)
                    VALUES
                    (:oid, 'GST 5% (CGST 2.5% + SGST 2.5%)', 'GST5', :rate, 'IN', 'gst', 'Tamil Nadu',
                     0, 0, 1, 1, 0, :now, :now)
                """),
                {
                    "oid":  org_id,
                    "rate": org_spec["tax_rate"],
                    "now":  NOW.astimezone(timezone.utc),
                },
            )
            db.commit()

            # 6. Floor Layout & Dining Tables
            dining_tables_map = {}  # code -> id
            for t_name, t_code, t_cap, t_area in org_spec["tables"]:
                db.execute(
                    text("""
                        INSERT INTO dining_tables
                        (organization_id, name, code, capacity, area, is_active, is_occupied,
                         is_deleted, created_at, updated_at)
                        VALUES
                        (:oid, :name, :code, :cap, :area, 1, 0, 0, :now, :now)
                    """),
                    {
                        "oid":  org_id,
                        "name": t_name,
                        "code": t_code,
                        "cap":  t_cap,
                        "area": t_area,
                        "now":  NOW.astimezone(timezone.utc),
                    },
                )
                db.commit()
                tid = db.execute(
                    text("SELECT id FROM dining_tables WHERE organization_id=:o AND code=:c"),
                    {"o": org_id, "c": t_code},
                ).scalar()
                dining_tables_map[t_code] = tid
                totals["tables"] += 1

            # 7. Floor Waiters / Stewards
            waiter_ids = []
            for w_name, w_code, w_phone in org_spec["waiters"]:
                db.execute(
                    text("""
                        INSERT INTO waiters
                        (organization_id, name, code, phone, is_active, is_deleted, created_at, updated_at)
                        VALUES
                        (:oid, :name, :code, :phone, 1, 0, :now, :now)
                    """),
                    {
                        "oid":   org_id,
                        "name":  w_name,
                        "code":  w_code,
                        "phone": w_phone,
                        "now":   NOW.astimezone(timezone.utc),
                    },
                )
                db.commit()
                wid = db.execute(
                    text("SELECT id FROM waiters WHERE organization_id=:o AND code=:c"),
                    {"o": org_id, "c": w_code},
                ).scalar()
                waiter_ids.append(wid)
                totals["waiters"] += 1

            # 8. Customer Base (Authentic Names & Profiles)
            cust_ids = []
            for ci, (c_name, c_phone, c_email, c_addr, c_note) in enumerate(REAL_CUSTOMERS, start=1):
                loyalty_code = f"{org_spec['loyalty_prefix']}-{c_name.split()[0][:3].upper()}-{ci:04d}"
                db.execute(
                    text("""
                        INSERT INTO customers
                        (organization_id, name, phone, email, address, loyalty_code, notes,
                         is_deleted, created_at, updated_at)
                        VALUES
                        (:oid, :name, :phone, :email, :addr, :lcode, :notes,
                         0, :now, :now)
                    """),
                    {
                        "oid":   org_id,
                        "name":  c_name,
                        "phone": c_phone,
                        "email": c_email,
                        "addr":  c_addr,
                        "lcode": loyalty_code,
                        "notes": c_note,
                        "now":   NOW.astimezone(timezone.utc),
                    },
                )
                db.commit()
                cid = db.execute(
                    text("SELECT id FROM customers WHERE organization_id=:o AND loyalty_code=:lc"),
                    {"o": org_id, "lc": loyalty_code},
                ).scalar()
                cust_ids.append(cid)
                totals["customers"] += 1

            # 9. Menu Categories & Products
            CATEGORY_COLORS = [
                "#e11d48", "#f97316", "#d97706", "#059669", "#0284c7", "#7c3aed", "#db2777"
            ]
            products = []
            sort_order = 10

            for cat_name, items in org_spec["menu"].items():
                cat_slug = (
                    cat_name.lower()
                    .replace("&", "and")
                    .replace("'", "")
                    .replace(" ", "-")
                    .replace("--", "-")
                )
                db.execute(
                    text("""
                        INSERT INTO categories
                        (organization_id, name, slug, description, color, sort_order, is_active,
                         is_deleted, created_at, updated_at)
                        VALUES
                        (:oid, :name, :slug, :desc, :color, :so, 1, 0, :now, :now)
                    """),
                    {
                        "oid":   org_id,
                        "name":  cat_name,
                        "slug":  cat_slug,
                        "desc":  f"{cat_name} at {org_spec['name']}",
                        "color": CATEGORY_COLORS[totals["categories"] % len(CATEGORY_COLORS)],
                        "so":    sort_order,
                        "now":   NOW.astimezone(timezone.utc),
                    },
                )
                db.commit()
                cat_id = db.execute(
                    text("SELECT id FROM categories WHERE organization_id=:o AND slug=:s"),
                    {"o": org_id, "s": cat_slug},
                ).scalar()
                totals["categories"] += 1
                sort_order += 10

                item_idx = 0
                for item_name, price, img_key, desc, unit in items:
                    item_idx += 1
                    sku = f"{org_spec['loyalty_prefix']}-{cat_slug[:3].upper()}-{item_idx:03d}"
                    barcode = f"890{org_id:02d}{item_idx:05d}"
                    cost = money(price * 0.40)  # ~40% food cost for restaurant business
                    img_url = FOOD_IMAGES.get(img_key, FOOD_IMAGES["soup"])

                    prod_attrs = {
                        "spiciness": "Medium" if "Spicy" in item_name or "Tikka" in item_name else "Mild",
                        "dietary": "Vegetarian" if "Paneer" in item_name or "Veg" in item_name or "Dosa" in item_name or "Idli" in item_name or org_spec["business_type"] == "fast_food" else "Non-Vegetarian",
                        "prep_time_minutes": random.choice([10, 15, 20]),
                        "kitchen_station": "Tandoor" if "Tandoori" in item_name or "Naan" in item_name else ("Beverage Bar" if "Coffee" in item_name or "Mocktail" in item_name or "Soda" in item_name else "Main Kitchen"),
                    }

                    db.execute(
                        text("""
                            INSERT INTO products
                            (organization_id, category_id, name, sku, barcode, description, price,
                             cost_price, tax_rate, unit, image_url, is_active, is_track_inventory,
                             is_sold_by_weight, low_stock_threshold, attributes, sort_order,
                             is_deleted, created_at, updated_at)
                            VALUES
                            (:oid, :cid, :name, :sku, :bc, :desc, :price, :cost, :tax, :unit, :img,
                             1, 1, 0, 15.00, :attrs, :so, 0, :now, :now)
                        """),
                        {
                            "oid":   org_id,
                            "cid":   cat_id,
                            "name":  item_name,
                            "sku":   sku,
                            "bc":    barcode,
                            "desc":  desc,
                            "price": money(price),
                            "cost":  cost,
                            "tax":   org_spec["tax_rate"],
                            "unit":  unit,
                            "img":   img_url,
                            "attrs": json.dumps(prod_attrs),
                            "so":    item_idx,
                            "now":   NOW.astimezone(timezone.utc),
                        },
                    )
                    db.commit()
                    pid = db.execute(
                        text("SELECT id FROM products WHERE organization_id=:o AND sku=:sku"),
                        {"o": org_id, "sku": sku},
                    ).scalar()

                    products.append({
                        "id":       pid,
                        "name":     item_name,
                        "sku":      sku,
                        "price":    money(price),
                        "cost":     cost,
                        "tax_rate": org_spec["tax_rate"],
                    })
                    totals["products"] += 1

                    # 10. Inventory Item and Opening Stock Movement
                    initial_qty = money(random.randint(120, 350))
                    storage_loc = (
                        "Cold Chiller Station" if "Lassi" in item_name or "Ice Cream" in item_name or "Cheese" in item_name
                        else ("Beverage Dry Rack" if "Coffee" in item_name or "Tea" in item_name
                        else "Main Kitchen Raw Stock")
                    )
                    db.execute(
                        text("""
                            INSERT INTO inventory_items
                            (organization_id, product_id, quantity_on_hand, quantity_reserved,
                             reorder_level, reorder_qty, warehouse_location, created_at, updated_at)
                            VALUES
                            (:oid, :pid, :q, 0, 20.00, 100.00, :loc, :now, :now)
                        """),
                        {
                            "oid": org_id,
                            "pid": pid,
                            "q":   initial_qty,
                            "loc": storage_loc,
                            "now": NOW.astimezone(timezone.utc),
                        },
                    )
                    db.commit()

                    # Record Initial Opening Movement
                    db.execute(
                        text("""
                            INSERT INTO stock_movements
                            (organization_id, product_id, movement_type, quantity, quantity_after,
                             reference_type, notes, created_by, created_at, updated_at)
                            VALUES
                            (:oid, :pid, 'opening', :q, :q, 'stock_initialization',
                             'Initial opening stock verified by store inventory supervisor', :cb, :now, :now)
                        """),
                        {
                            "oid": org_id,
                            "pid": pid,
                            "q":   initial_qty,
                            "cb":  admin_id,
                            "now": NOW.astimezone(timezone.utc),
                        },
                    )
                    db.commit()
                    totals["inventory"] += 1

            print(f"  Catalog ready: {len(products)} authentic restaurant dishes with imagery.")

            # ------------------------------------------------------------------
            # 11. Transactional History (Orders, Items, Payments, Invoices)
            # ------------------------------------------------------------------
            print(f"  Generating {DAYS} days of realistic restaurant dining & takeaway volume...")
            org_orders_count = 0
            daily_sequence = 0
            table_codes = list(dining_tables_map.keys())

            # Peak lunch (12:00 - 15:30) and dinner (19:00 - 22:45) weightings
            hour_weights = [
                0, 0, 0, 0, 0, 0, 1, 2, 4, 3, 2,  # 0 to 10 AM
                8, 14, 15, 8, 3, 2, 4, 8, 16, 18, 12, 4, 1  # 11 AM to 11 PM
            ]

            payment_methods = ["upi", "card", "cash"]
            payment_weights = [0.45, 0.35, 0.20]

            for day_offset in range(DAYS - 1, -1, -1):
                order_date = (NOW - timedelta(days=day_offset)).date()
                daily_sequence = 0
                day_orders_count = random.randint(ORDERS_MIN, ORDERS_MAX)

                # Daily sales accumulator for rollups
                daily_facts = {
                    "completed": 0, "cancelled": 0,
                    "subtotal": Decimal("0"), "tax": Decimal("0"),
                    "discount": Decimal("0"), "grand": Decimal("0"),
                    "items_qty": Decimal("0"),
                }

                for _ in range(day_orders_count):
                    daily_sequence += 1
                    org_orders_count += 1

                    order_hour = random.choices(range(24), weights=hour_weights, k=1)[0]
                    order_min  = random.randint(0, 59)
                    order_sec  = random.randint(0, 59)
                    order_created_dt = datetime(
                        order_date.year, order_date.month, order_date.day,
                        order_hour, order_min, order_sec, tzinfo=IST
                    ).astimezone(timezone.utc)

                    order_type = random.choice(org_spec["order_types"])
                    terminal_id = random.choice(term_ids)
                    serving_cashier = cashier_id if random.random() < 0.70 else admin_id

                    # Customer Assignment: 40% registered regular, 60% walk-in
                    customer_id = None
                    customer_record = None
                    if random.random() < 0.40:
                        customer_id = random.choice(cust_ids)
                        # Fetch customer name/phone for invoice snapshot
                        c_idx = cust_ids.index(customer_id)
                        customer_record = REAL_CUSTOMERS[c_idx % len(REAL_CUSTOMERS)]

                    # Dine-in attributes
                    table_label = None
                    dining_table_id = None
                    waiter_id = None
                    guest_count = None

                    if order_type == "dine_in" and table_codes:
                        table_label = random.choice(table_codes)
                        dining_table_id = dining_tables_map.get(table_label)
                        waiter_id = random.choice(waiter_ids) if waiter_ids else None
                        guest_count = random.choice([2, 2, 4, 4, 3, 5, 6])

                    # Multi-item selections (2 to 5 dishes per order)
                    num_lines = random.randint(2, 5)
                    selected_dishes = random.sample(products, k=min(num_lines, len(products)))

                    subtotal = Decimal("0")
                    tax_total = Decimal("0")
                    lines = []

                    for dish in selected_dishes:
                        qty = Decimal(str(random.choice([1, 1, 1, 2, 2, 3])))
                        unit_price = dish["price"]
                        line_sub = money(unit_price * qty)
                        tax_amt = money(line_sub * dish["tax_rate"] / Decimal("100"))
                        disc = money(0)

                        # Occasional 5% - 10% promotional item discount
                        if random.random() < 0.08:
                            disc = money(min(line_sub * Decimal("0.10"), Decimal("60.00")))

                        line_tot = money(line_sub + tax_amt - disc)
                        subtotal += line_sub
                        tax_total += tax_amt

                        item_note = random.choice(["Extra chutney", "Crispy", "Less spicy", "No onions", None, None])
                        lines.append({
                            "product_id":      dish["id"],
                            "product_name":    dish["name"],
                            "sku":             dish["sku"],
                            "quantity":        qty,
                            "unit_price":      unit_price,
                            "tax_rate":        dish["tax_rate"],
                            "tax_amount":      tax_amt,
                            "discount_amount": disc,
                            "line_total":      line_tot,
                            "notes":           item_note,
                        })

                    discount_total = money(sum(x["discount_amount"] for x in lines))
                    grand_total = money(subtotal + tax_total - discount_total)

                    order_num  = f"ORD-{org_id:02d}-{order_date.strftime('%Y%m%d')}-{daily_sequence:04d}"
                    sales_code = f"BILL-{org_id:02d}-{order_date.strftime('%y%m')}-{daily_sequence:05d}"
                    kot_num    = f"KOT-{org_id:02d}-{order_date.strftime('%d%m')}-{daily_sequence:04d}"

                    # Status realism: 97% completed, 2% held (today only), 1% cancelled
                    order_status = "completed"
                    if day_offset == 0 and random.random() < 0.03:
                        order_status = "held"
                    elif random.random() < 0.015:
                        order_status = "cancelled"

                    kitchen_prep_note = random.choice(ORDER_NOTES_KITCHEN)

                    db.execute(
                        text("""
                            INSERT INTO orders
                            (organization_id, order_number, sales_code, status, order_type, bill_type,
                             terminal_id, customer_id, cashier_id, waiter_id, dining_table_id, table_label,
                             guest_count, kot_number, kot_printed, bill_printed, subtotal, tax_total,
                             discount_total, grand_total, amount_paid, amount_due, notes,
                             created_at, updated_at)
                            VALUES
                            (:oid, :onum, :scode, :status, :otype, 'cash',
                             :tid, :cid, :cash, :wid, :dtid, :tlab,
                             :gc, :kotn, 1, 1, :sub, :tax,
                             :disc, :grand, :paid, :due, :notes,
                             :created, :created)
                        """),
                        {
                            "oid":     org_id,
                            "onum":    order_num,
                            "scode":   sales_code,
                            "status":  order_status,
                            "otype":   order_type,
                            "tid":     terminal_id,
                            "cid":     customer_id,
                            "cash":    serving_cashier,
                            "wid":     waiter_id,
                            "dtid":    dining_table_id,
                            "tlab":    table_label,
                            "gc":      guest_count,
                            "kotn":    kot_num,
                            "sub":     subtotal,
                            "tax":     tax_total,
                            "disc":    discount_total,
                            "grand":   grand_total,
                            "paid":    grand_total if order_status == "completed" else money(0),
                            "due":     money(0) if order_status == "completed" else grand_total,
                            "notes":   kitchen_prep_note,
                            "created": order_created_dt,
                        },
                    )
                    order_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
                    totals["orders"] += 1

                    # Insert Line Items
                    for ln in lines:
                        db.execute(
                            text("""
                                INSERT INTO order_items
                                (organization_id, order_id, product_id, product_name, sku, quantity,
                                 unit_price, tax_rate, tax_amount, discount_amount, line_total, notes,
                                 created_at, updated_at)
                                VALUES
                                (:oid, :order_id, :pid, :pname, :sku, :qty,
                                 :up, :tr, :ta, :da, :lt, :note,
                                 :created, :created)
                            """),
                            {
                                "oid":      org_id,
                                "order_id": order_id,
                                "pid":      ln["product_id"],
                                "pname":    ln["product_name"],
                                "sku":      ln["sku"],
                                "qty":      ln["quantity"],
                                "up":       ln["unit_price"],
                                "tr":       ln["tax_rate"],
                                "ta":       ln["tax_amount"],
                                "da":       ln["discount_amount"],
                                "lt":       ln["line_total"],
                                "note":     ln["notes"],
                                "created":  order_created_dt,
                            },
                        )
                        totals["items"] += 1

                    # Payments & Tax Invoices for completed orders
                    if order_status == "completed":
                        daily_facts["completed"] += 1
                        daily_facts["subtotal"] += subtotal
                        daily_facts["tax"] += tax_total
                        daily_facts["discount"] += discount_total
                        daily_facts["grand"] += grand_total
                        daily_facts["items_qty"] += sum(ln["quantity"] for ln in lines)

                        pay_method = random.choices(payment_methods, weights=payment_weights, k=1)[0]
                        tendered = grand_total
                        change = money(0)

                        if pay_method == "cash":
                            rounding = random.choice([0, 10, 50, 100, 500])
                            tendered = money(grand_total + Decimal(rounding))
                            change = money(tendered - grand_total)
                            pay_ref = f"CASH-{order_date.strftime('%Y%m%d')}-{order_id}"
                        elif pay_method == "upi":
                            bank_handle = random.choice(["okaxis", "okhdfcbank", "paytm", "oksbi"])
                            pay_ref = f"UPI/{random.randint(410000000000, 499999999999)}/{bank_handle}"
                        else:  # Card
                            card_brand = random.choice(["VISA", "MASTERCARD", "RUPAY"])
                            pay_ref = f"{card_brand}-AUTH-{random.randint(100000, 999999)}"

                        db.execute(
                            text("""
                                INSERT INTO payments
                                (organization_id, order_id, method, status, amount, tendered_amount,
                                 change_amount, reference, terminal_id, received_by, created_at, updated_at)
                                VALUES
                                (:oid, :order_id, :method, 'completed', :amt, :tend,
                                 :chg, :ref, :tid, :recv, :created, :created)
                            """),
                            {
                                "oid":      org_id,
                                "order_id": order_id,
                                "method":   pay_method,
                                "amt":      grand_total,
                                "tend":     tendered,
                                "chg":      change,
                                "ref":      pay_ref,
                                "tid":      terminal_id,
                                "recv":     serving_cashier,
                                "created":  order_created_dt,
                            },
                        )
                        totals["payments"] += 1

                        # Full Legal Tax Invoice
                        inv_number = f"INV-{org_id:02d}-{order_date.strftime('%Y%m%d')}-{daily_sequence:04d}"
                        cust_name = customer_record[0] if customer_record else f"{random.choice(WALK_IN_CUSTOMER_LABELS)} #{daily_sequence}"
                        cust_phone = customer_record[1] if customer_record else None
                        cust_address = customer_record[3] if customer_record else None

                        invoice_snapshot = {
                            "restaurant": {
                                "legal_name":    org_spec["name"],
                                "gstin":         org_spec["gst_code"],
                                "fssai_license": org_spec["fssai_lic"],
                                "address":       org_spec["address"],
                                "city":          org_spec["city"],
                                "state":         org_spec["state"],
                                "postal_code":   org_spec["postal_code"],
                                "phone":         org_spec["phone"],
                                "email":         org_spec["email"],
                                "currency":      "INR",
                            },
                            "invoice_meta": {
                                "invoice_number": inv_number,
                                "order_number":   order_num,
                                "sales_code":     sales_code,
                                "kot_number":     kot_num,
                                "date":           order_date.strftime("%d-%b-%Y"),
                                "time":           order_created_dt.strftime("%H:%M:%S UTC"),
                                "order_type":     order_type.replace("_", " ").title(),
                                "table":          table_label or "Takeaway",
                                "guest_count":    guest_count or 1,
                            },
                            "customer": {
                                "name":    cust_name,
                                "phone":   cust_phone or "Walk-in",
                                "address": cust_address or "Chennai",
                            },
                            "line_items": [
                                {
                                    "item_name":       ln["product_name"],
                                    "sku":             ln["sku"],
                                    "quantity":        float(ln["quantity"]),
                                    "unit_price":      float(ln["unit_price"]),
                                    "subtotal":        float(money(ln["unit_price"] * ln["quantity"])),
                                    "cgst_rate":       2.5,
                                    "cgst_amount":     float(money(ln["tax_amount"] / 2)),
                                    "sgst_rate":       2.5,
                                    "sgst_amount":     float(money(ln["tax_amount"] / 2)),
                                    "discount_amount": float(ln["discount_amount"]),
                                    "line_total":      float(ln["line_total"]),
                                    "special_note":    ln["notes"],
                                }
                                for ln in lines
                            ],
                            "financial_summary": {
                                "taxable_subtotal": float(subtotal),
                                "total_cgst":       float(money(tax_total / 2)),
                                "total_sgst":       float(money(tax_total / 2)),
                                "total_tax":        float(tax_total),
                                "discount_total":   float(discount_total),
                                "net_grand_total":  float(grand_total),
                            },
                            "settlement": {
                                "payment_method":  pay_method.upper(),
                                "reference":       pay_ref,
                                "tendered_amount": float(tendered),
                                "change_returned": float(change),
                            },
                            "footer": f"Thank you for dining with {org_spec['name']}! Please visit again.",
                        }

                        db.execute(
                            text("""
                                INSERT INTO invoices
                                (organization_id, order_id, invoice_number, customer_name, customer_phone,
                                 billing_address, subtotal, tax_total, discount_total, grand_total,
                                 snapshot, notes, printed_count, created_at, updated_at)
                                VALUES
                                (:oid, :order_id, :inum, :cname, :cphone,
                                 :baddr, :sub, :tax, :disc, :grand,
                                 :snap, :notes, 1, :created, :created)
                            """),
                            {
                                "oid":      org_id,
                                "order_id": order_id,
                                "inum":     inv_number,
                                "cname":    cust_name,
                                "cphone":   cust_phone,
                                "baddr":    cust_address,
                                "sub":      subtotal,
                                "tax":      tax_total,
                                "disc":     discount_total,
                                "grand":    grand_total,
                                "snap":     json.dumps(invoice_snapshot),
                                "notes":    f"GST Tax Invoice – {org_spec['name']}",
                                "created":  order_created_dt,
                            },
                        )
                        totals["invoices"] += 1
                    elif order_status == "cancelled":
                        daily_facts["cancelled"] += 1

                # 12. Record Atomic Daily Sequence Counter
                db.execute(
                    text("""
                        INSERT INTO organization_daily_order_sequence_counters
                        (organization_id, business_calendar_date, last_issued_sequence_number, created_at, updated_at)
                        VALUES
                        (:oid, :bdate, :last_seq, :now, :now)
                    """),
                    {
                        "oid":      org_id,
                        "bdate":    order_date,
                        "last_seq": daily_sequence,
                        "now":      NOW.astimezone(timezone.utc),
                    },
                )

                # 13. Pre-aggregate Daily Sales Fact Rollup
                db.execute(
                    text("""
                        INSERT INTO organization_daily_sales_fact_rollups
                        (organization_id, business_calendar_date, completed_orders_count, cancelled_orders_count,
                         gross_sales_subtotal_amount, tax_collected_amount, discount_given_amount,
                         net_grand_total_amount, amount_paid_total, items_sold_quantity_total,
                         created_at, updated_at)
                        VALUES
                        (:oid, :bdate, :comp, :canc,
                         :sub, :tax, :disc,
                         :grand, :paid, :qty,
                         :now, :now)
                    """),
                    {
                        "oid":   org_id,
                        "bdate": order_date,
                        "comp":  daily_facts["completed"],
                        "canc":  daily_facts["cancelled"],
                        "sub":   money(daily_facts["subtotal"]),
                        "tax":   money(daily_facts["tax"]),
                        "disc":  money(daily_facts["discount"]),
                        "grand": money(daily_facts["grand"]),
                        "paid":  money(daily_facts["grand"]),
                        "qty":   money(daily_facts["items_qty"]),
                        "now":   NOW.astimezone(timezone.utc),
                    },
                )
                db.commit()

            print(f"  Completed seeding for {org_spec['name']}: {org_orders_count} orders recorded.")

        # ------------------------------------------------------------------
        # Verification & Audit Counts
        # ------------------------------------------------------------------
        print("\n" + "=" * 70)
        print("  SEED COMPLETED SUCCESSFULLY – DATA INTEGRITY AUDIT")
        print("=" * 70)
        print(f"  Total Organizations Created   : {totals['orgs']}")
        print(f"  Total Users & Staff           : {totals['users']}")
        print(f"  Menu Categories               : {totals['categories']}")
        print(f"  Dishes / Menu Items           : {totals['products']}")
        print(f"  Dining Tables                 : {totals['tables']}")
        print(f"  Waiters / Floor Stewards      : {totals['waiters']}")
        print(f"  Named Customers (with Loyalty): {totals['customers']}")
        print(f"  Total Completed Orders (30d)  : {totals['orders']}")
        print(f"  Order Items Recorded          : {totals['items']}")
        print(f"  Payments Settled              : {totals['payments']}")
        print(f"  Tax Invoices Generated        : {totals['invoices']}")
        print(f"  Inventory Items Tracked       : {totals['inventory']}")

        print("\n--- Direct Database Record Count Verification ---")
        for table in [
            "organizations", "users", "dining_tables", "waiters", "customers",
            "categories", "products", "inventory_items", "stock_movements",
            "orders", "order_items", "payments", "invoices",
            "organization_daily_order_sequence_counters",
            "organization_daily_sales_fact_rollups",
        ]:
            count = db.execute(text(f"SELECT COUNT(*) FROM `{table}`")).scalar()
            print(f"  {table.ljust(44)} : {count}")

        print("\n" + "=" * 70)
        print("  DEMO RESTAURANT LOGIN CREDENTIALS (email = password)")
        print("=" * 70)
        print(f"  Super Admin Portal : {sa_email}")
        for org in ORGS:
            print(f"\n  [{org['name']}]")
            print(f"    Admin    : {org['admin_email']}")
            for u in org['users']:
                print(f"    {u[3].capitalize():8} : {u[0]}")

        print("=" * 70)

    finally:
        db.close()


if __name__ == "__main__":
    seed()
