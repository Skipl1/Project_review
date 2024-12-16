from flask import Flask, render_template, jsonify, request
import sqlite3
from apscheduler.schedulers.background import BackgroundScheduler
from scraper import scrape_perfumes

app = Flask(__name__, template_folder='.', static_folder='static')

def init_db():
    conn = sqlite3.connect('products.db')
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS products (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT NOT NULL,
                        price TEXT,
                        link TEXT,
                        rating TEXT,
                        notes TEXT,
                        volume TEXT,
                        brand TEXT,
                        image_url TEXT
                    )''')
    conn.commit()
    conn.close()

def get_products_with_pagination(query='', offset=0, limit=15, min_price=0, max_price=10000, min_rating=2, max_rating=5):
    conn = sqlite3.connect('products.db')
    cursor = conn.cursor()
    if query:
        cursor.execute(''' 
            SELECT * FROM products
            WHERE LOWER(title) LIKE ? 
            AND CAST(price AS REAL) BETWEEN ? AND ? 
            AND CAST(rating AS REAL) BETWEEN ? AND ? 
            LIMIT ? OFFSET ? 
        ''', (f'%{query.lower()}%', min_price, max_price, min_rating, max_rating, limit, offset))
    else:
        cursor.execute(''' 
            SELECT * FROM products
            WHERE CAST(price AS REAL) BETWEEN ? AND ? 
            AND CAST(rating AS REAL) BETWEEN ? AND ? 
            LIMIT ? OFFSET ? 
        ''', (min_price, max_price, min_rating, max_rating, limit, offset))
    rows = cursor.fetchall()
    conn.close()
    return [
        {"id": row[0], "title": row[1], "price": row[2], "link": row[3], "rating": row[4], "notes": row[5], "volume": row[6], "brand": row[7], "image_url": row[8]}
        for row in rows
    ]

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('query', '').strip().lower()
    offset = int(request.args.get('offset', 0))
    limit = int(request.args.get('limit', 15))
    min_price = float(request.args.get('minPrice', 0))
    max_price = float(request.args.get('maxPrice', 10000))
    min_rating = float(request.args.get('minRating', 2))
    max_rating = float(request.args.get('maxRating', 5))

    conn = sqlite3.connect('products.db')
    cursor = conn.cursor()
    if query:
        cursor.execute(''' 
            SELECT * FROM products
            WHERE LOWER(title) LIKE ? 
            AND CAST(price AS REAL) BETWEEN ? AND ? 
            AND CAST(rating AS REAL) BETWEEN ? AND ? 
            LIMIT ? OFFSET ? 
        ''', (f'%{query}%', min_price, max_price, min_rating, max_rating, limit, offset))
    else:
        cursor.execute(''' 
            SELECT * FROM products
            WHERE CAST(price AS REAL) BETWEEN ? AND ? 
            AND CAST(rating AS REAL) BETWEEN ? AND ? 
            LIMIT ? OFFSET ? 
        ''', (min_price, max_price, min_rating, max_rating, limit, offset))
    rows = cursor.fetchall()
    conn.close()

    return jsonify([
        {"id": row[0], "title": row[1], "price": row[2], "link": row[3], "rating": row[4], "notes": row[5], "volume": row[6], "brand": row[7], "image_url": row[8]}
        for row in rows
    ])

def update_database():
    print("Обновление базы данных...")
    scrape_perfumes()
    print("База данных обновлена.")

if __name__ == '__main__':
    init_db()
    scheduler = BackgroundScheduler()
    scheduler.add_job(update_database, 'interval', minutes=20)
    scheduler.start()

    try:
        app.run(debug=True)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()