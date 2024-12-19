from flask import Flask, render_template, jsonify, request
import psycopg2
import os
from apscheduler.schedulers.background import BackgroundScheduler
from scraper import scrape_perfumes

app = Flask(__name__, template_folder='.', static_folder='static')

PG_HOST = os.getenv('PG_HOST', 'postgres')
PG_USER = os.getenv('PG_USER', 'root')
PG_PASSWORD = os.getenv('PG_PASSWORD', 'root_password')
PG_DB = os.getenv('PG_DB', 'products_db')

def get_db_connection():
    return psycopg2.connect(
        host=PG_HOST,
        user=PG_USER,
        password=PG_PASSWORD,
        database=PG_DB
    )

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            price NUMERIC(10, 2),
            link TEXT UNIQUE,
            rating NUMERIC(3, 2),
            notes TEXT,
            volume NUMERIC(10, 2),
            brand VARCHAR(255),
            image_url TEXT
        )
    ''')
    conn.commit()

    cursor.execute('SELECT COUNT(*) FROM products')
    count = cursor.fetchone()[0]

    if count == 0:
        print("Таблица пуста. Запуск скрапера для заполнения базы данных...")
        scrape_perfumes()
        print("Скрапинг завершен. База данных заполнена.")
    else:
        print(f"В таблице уже есть данные ({count} записей). Скрапинг не требуется.")

    cursor.close()
    conn.close()

def get_products_with_pagination(query='', offset=0, limit=15, min_price=0, max_price=10000, min_rating=2, max_rating=5, selected_notes=[]):
    conn = get_db_connection()
    cursor = conn.cursor()

    query_string = '''
        SELECT * FROM products
        WHERE price BETWEEN %s AND %s
        AND rating BETWEEN %s AND %s
    '''
    params = [min_price, max_price, min_rating, max_rating]

    if query:
        query_string += " AND LOWER(title) LIKE %s"
        params.append(f'%{query.lower()}%')

    if selected_notes:
        notes_conditions = " OR ".join(["notes ILIKE %s"] * len(selected_notes))
        query_string += f" AND ({notes_conditions})"
        params.extend([f'%{note}%' for note in selected_notes])

    query_string += " ORDER BY title ASC"
    query_string += " LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    cursor.execute(query_string, params)
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": row[0],
            "title": row[1],
            "price": row[2],
            "link": row[3],
            "rating": row[4],
            "notes": row[5],
            "volume": row[6],
            "brand": row[7],
            "image_url": row[8],
        }
        for row in rows
    ]

@app.route('/api/get_notes')
def get_notes():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT notes FROM products')
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    all_notes = set()
    for row in rows:
        if row[0]:
            notes = row[0].split(',')
            all_notes.update(note.strip() for note in notes)

    sorted_notes = sorted(list(all_notes))
    return jsonify(sorted_notes)

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

    selected_notes = request.args.getlist('notes[]')

    products = get_products_with_pagination(
        query=query,
        offset=offset,
        limit=limit,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        max_rating=max_rating,
        selected_notes=selected_notes
    )
    return jsonify(products)

def update_database():
    print("Обновление базы данных...")
    scrape_perfumes()
    print("База данных обновлена.")

if __name__ == '__main__':
    init_db()
    scheduler = BackgroundScheduler()
    scheduler.add_job(update_database, 'interval', minutes=30)
    scheduler.start()

    try:
        app.run(host='0.0.0.0', port=5000, debug=True)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()