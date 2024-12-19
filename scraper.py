import psycopg2
from psycopg2 import sql
import requests
from bs4 import BeautifulSoup
import re

base_url = "https://dark-purple.ru"
main_url = f"{base_url}/dp-parfyumeriya"

PG_HOST = 'postgres'
PG_USER = 'root'
PG_PASSWORD = 'root_password'
PG_DB = 'products_db'

def get_db_connection():
    return psycopg2.connect(
        host=PG_HOST,
        user=PG_USER,
        password=PG_PASSWORD,
        dbname=PG_DB
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
    cursor.close()
    conn.close()

def is_product_exists(link):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM products WHERE link = %s", (link,))
    exists = cursor.fetchone() is not None
    cursor.close()
    conn.close()
    return exists

def update_product_in_db(product):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''UPDATE products 
                      SET title = %s, price = %s, rating = %s, notes = %s, volume = %s, brand = %s, image_url = %s
                      WHERE link = %s''', 
                   (product['title'], product['price'], product['rating'], product['notes'],
                    product['volume'], product['brand'], product['image_url'], product['link']))
    conn.commit()
    cursor.close()
    conn.close()

def save_product_to_db(product):
    print(f"Сохраняем продукт: {product}")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''INSERT INTO products (title, price, link, rating, notes, volume, brand, image_url)
                      VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''',
                   (product['title'], product['price'], product['link'], product['rating'],
                    product['notes'], product['volume'], product['brand'], product['image_url']))
    conn.commit()
    cursor.close()
    conn.close()

def parse_number(number_str):
    try:
        cleaned_str = re.sub(r'[^0-9.,]', '', number_str.replace(' ', ''))
        if cleaned_str:
            cleaned_str = cleaned_str.replace(',', '.')
            return float(cleaned_str)
        return None
    except ValueError:
        return None

def parse_product_details(product_url):
    details = {
        "rating": None,
        "notes": "Неизвестно",
        "volume": None,
        "brand": "Неизвестно",
        "image_url": "Неизвестно"
    }
    try:
        response = requests.get(product_url)
        if response.status_code != 200:
            print(f"Ошибка загрузки страницы товара: {product_url}")
            return details

        soup = BeautifulSoup(response.content, 'html.parser')

        rating_elem = soup.find('div', class_='rating_text')
        details["rating"] = parse_number(rating_elem.text.strip()) if rating_elem else None

        notes_block = soup.find('div', class_='attributes_note')
        if notes_block:
            notes_elements = notes_block.find_all('span', class_='attribute-value')
            notes = " ".join([note.text.strip() for note in notes_elements])
            details["notes"] = notes if notes else "Неизвестно"

        volume_elem = soup.find('span', class_='attribute-name')
        if volume_elem:
            volume_value = volume_elem.find_next('span', class_='attribute-value').text.strip()
            details["volume"] = parse_number(volume_value)

        brand_elem = soup.find('span', class_='attribute-name 99')
        if brand_elem:
            brand_value = brand_elem.find_next('span', class_='attribute-value').text.strip()
            details["brand"] = brand_value

        image_elem = soup.find('a', class_='thumbnail')
        if image_elem and image_elem.find('img'):
            image_url = image_elem.find('img')['src']
            details["image_url"] = image_url if image_url else "Неизвестно"

    except Exception as e:
        print(f"Ошибка при обработке детальной страницы: {product_url} - {e}")

    return details

def scrape_perfumes():
    for page in range(1, 39):
        page_url = f"{main_url}?page={page}"
        print(f"Обрабатывается страница: {page_url}")

        response = requests.get(page_url)
        if response.status_code != 200:
            print(f"Ошибка: Не удалось загрузить страницу, статус код: {response.status_code}")
            continue

        soup = BeautifulSoup(response.content, 'html.parser')
        product_elements = soup.find_all('div', class_='price_item_description')

        if not product_elements:
            print(f"Не удалось найти элементы с товарами на странице {page}")
            continue

        for product in product_elements:
            try:
                title_elem = product.find('a')
                title = title_elem.text.strip() if title_elem else 'Неизвестно'
                price_elem = product.find('span', class_='price-new')
                price = parse_number(price_elem.text.strip()) if price_elem else None

                link_elem = product.find('a', href=True)
                link = f"{link_elem['href']}" if link_elem else 'Неизвестно'

                if title != 'Неизвестно' and link != 'Неизвестно':
                    details = parse_product_details(link)
                    product_data = {
                        'title': title,
                        'price': price,
                        'link': link,
                        **details
                    }
                    if is_product_exists(link):
                        update_product_in_db(product_data)
                    else:
                        save_product_to_db(product_data)

            except Exception as e:
                print(f"Ошибка при обработке продукта: {e}")

# if __name__ == '__main__':
#     init_db()
#     scrape_perfumes()
#     print("Скрапинг завершен и данные сохранены в базу данных.")