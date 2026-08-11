import sqlite3
import time
import math
import requests
from flask import Flask, jsonify, render_template, request, send_from_directory

app = Flask(__name__, static_folder='static', static_url_path='')

# Configuration ESI & Regional (10000002 = The Forge / Jita 4-4)
ESI_BASE_URL = "https://esi.evetech.net/latest"
DEFAULT_REGION_ID = 10000002
DEFAULT_STATION_ID = 60003760  # Jita IV - Moon 4 - Caldari Navy Assembly Plant

# Database Init
def init_db():
    conn = sqlite3.connect('cache.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS market_cache 
                 (key TEXT PRIMARY KEY, data TEXT, timestamp REAL)''')
    c.execute('''CREATE TABLE IF NOT EXISTS watchlist (type_id INTEGER PRIMARY KEY)''')
    c.execute('''CREATE TABLE IF NOT EXISTS portfolio 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, type_id INTEGER, quantity INTEGER, buy_price REAL, timestamp REAL)''')
    conn.commit()
    conn.close()

init_db()

# Reference Market Items (Top High-Volume / Active Items for Instant Demo & Scanning)
HUB_ITEMS = {
    34: "Tritanium", 35: "Pyerite", 36: "Mexallon", 37: "Isogen", 38: "Nocxium",
    39: "Zydrine", 40: "Megacyte", 11399: "Morphite", 44: "Enriched Uranium",
    29668: "Prowler", 11987: "Curse", 28606: "Obelisk", 16274: "Helium Isotopes",
    17888: "Hydrogen Isotopes", 17889: "Ozone", 16272: "Heavy Water", 2603: "Nanite Repair Paste",
    3689: "Mechanical Parts", 9832: "Coolant", 9838: "Superior Power Core", 40519: "Skill Injector"
}

def get_market_orders(region_id=DEFAULT_REGION_ID, type_id=None):
    url = f"{ESI_BASE_URL}/markets/{region_id}/orders/?order_type=all"
    if type_id:
        url += f"&type_id={type_id}"
    
    try:
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"ESI Fetch Error: {e}")
    return []

def get_market_history(region_id, type_id):
    url = f"{ESI_BASE_URL}/markets/{region_id}/history/?type_id={type_id}"
    try:
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"History Fetch Error: {e}")
    return []

def calculate_metrics(orders, history, broker_fee_pct=0.03, sales_tax_pct=0.036):
    buy_orders = [o for o in orders if o.get('is_buy_order')]
    sell_orders = [o for o in orders if not o.get('is_buy_order')]

    if not buy_orders or not sell_orders:
        return None

    best_buy = max(o['price'] for o in buy_orders)
    best_sell = min(o['price'] for o in sell_orders)

    if best_buy >= best_sell or best_buy <= 0:
        return None

    spread = best_sell - best_buy
    spread_pct = (spread / best_buy) * 100

    # Financial Net Profit calculation
    # Net Sell = Best Sell * (1 - Sales Tax)
    # Net Buy = Best Buy * (1 + Broker Fee)
    net_sell = best_sell * (1 - sales_tax_pct)
    net_buy = best_buy * (1 + broker_fee_pct)
    net_profit_per_unit = net_sell - net_buy
    roi_pct = (net_profit_per_unit / net_buy) * 100 if net_buy > 0 else 0

    # History Data Analysis
    daily_volume = 0
    volatility = 0.1
    if history:
        recent_30d = history[-30:] if len(history) >= 30 else history
        total_vol = sum(h['volume'] for h in recent_30d)
        daily_volume = total_vol / max(len(recent_30d), 1)
        
        prices = [h['average'] for h in recent_30d]
        if len(prices) > 1:
            mean_p = sum(prices) / len(prices)
            variance = sum((x - mean_p) ** 2 for x in prices) / len(prices)
            volatility = (math.sqrt(variance) / mean_p) if mean_p > 0 else 0.1

    # Liquidity Engine Calculations
    available_sell_vol = sum(o['volume_remain'] for o in sell_orders)
    available_buy_vol = sum(o['volume_remain'] for o in buy_orders)
    
    # Score 0-100 base on daily turnover ISK and transaction speed
    daily_isk_turnover = daily_volume * best_sell
    liquidity_score = min(100, max(0, int(math.log10(daily_isk_turnover + 1) * 10))) if daily_isk_turnover > 0 else 5

    # Exit Time Estimation (Days) for 100M ISK position
    standard_position_qty = (100_000_000 / best_sell) if best_sell > 0 else 1
    est_liquidation_days = (standard_position_qty / daily_volume) if daily_volume > 0 else 999.0

    # Risk Score Calculation (0-100)
    risk_score = min(100, int((volatility * 100 * 0.5) + (100 - liquidity_score) * 0.5))

    # Global Opportunity Score (0-100)
    # Penalizes high margin if liquidity is low
    opportunity_score = int(
        (min(roi_pct, 50) * 0.8) +
        (liquidity_score * 0.5) -
        (risk_score * 0.3)
    )
    opportunity_score = min(100, max(0, opportunity_score))

    return {
        'best_buy': best_buy,
        'best_sell': best_sell,
        'spread': spread,
        'spread_pct': round(spread_pct, 2),
        'net_profit_per_unit': round(net_profit_per_unit, 2),
        'roi_pct': round(roi_pct, 2),
        'daily_volume': int(daily_volume),
        'liquidity_score': liquidity_score,
        'risk_score': risk_score,
        'opportunity_score': opportunity_score,
        'est_liquidation_days': round(est_liquidation_days, 1),
        'available_sell_vol': available_sell_vol,
        'available_buy_vol': available_buy_vol,
        'volatility': round(volatility, 3)
    }

# ROUTES API

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/opportunities', methods=['GET'])
def get_opportunities():
    results = []
    for type_id, name in HUB_ITEMS.items():
        orders = get_market_orders(DEFAULT_REGION_ID, type_id)
        history = get_market_history(DEFAULT_REGION_ID, type_id)
        metrics = calculate_metrics(orders, history)
        if metrics:
            metrics['type_id'] = type_id
            metrics['name'] = name
            results.append(metrics)
    
    # Sort by Opportunity Score descending
    results.sort(key=lambda x: x['opportunity_score'], reverse=True)
    return jsonify(results)

@app.route('/api/item/<int:type_id>', methods=['GET'])
def get_item_detail(type_id):
    name = HUB_ITEMS.get(type_id, f"Item #{type_id}")
    orders = get_market_orders(DEFAULT_REGION_ID, type_id)
    history = get_market_history(DEFAULT_REGION_ID, type_id)
    metrics = calculate_metrics(orders, history)

    buy_orders = sorted([o for o in orders if o.get('is_buy_order')], key=lambda x: x['price'], reverse=True)[:10]
    sell_orders = sorted([o for o in orders if not o.get('is_buy_order')], key=lambda x: x['price'])[:10]

    return jsonify({
        'type_id': type_id,
        'name': name,
        'metrics': metrics,
        'buy_orders': buy_orders,
        'sell_orders': sell_orders,
        'history': history[-90:] if history else []
    })

@app.route('/api/simulate', methods=['POST'])
def simulate_position():
    data = request.json or {}
    capital = float(data.get('capital', 500_000_000))
    
    recommendations = []
    for type_id, name in HUB_ITEMS.items():
        orders = get_market_orders(DEFAULT_REGION_ID, type_id)
        history = get_market_history(DEFAULT_REGION_ID, type_id)
        metrics = calculate_metrics(orders, history)
        
        if metrics and metrics['best_buy'] > 0 and metrics['roi_pct'] > 0:
            units = math.floor(capital / (metrics['best_buy'] * 1.03))
            if units > 0:
                total_cost = units * metrics['best_buy'] * 1.03
                est_profit = units * metrics['net_profit_per_unit']
                recommendations.append({
                    'type_id': type_id,
                    'name': name,
                    'units': units,
                    'total_cost': round(total_cost, 2),
                    'est_profit': round(est_profit, 2),
                    'roi_pct': metrics['roi_pct'],
                    'liquidity_score': metrics['liquidity_score'],
                    'est_days': metrics['est_liquidation_days']
                })

    recommendations.sort(key=lambda x: (x['liquidity_score'] * 0.6 + x['roi_pct'] * 0.4), reverse=True)
    return jsonify(recommendations[:5])

if __name__ == '__main__':
    print("\n" + "="*50)
    print(" EVE ONLINE TRADING TERMINAL - ACTIVE ")
    print(" Open Browser: http://127.0.0.1:5000 ")
    print("="*50 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=True)
