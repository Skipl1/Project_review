docker-compose down
docker-compose up --build -d
docker-compose exec app python -c 'from app import init_db; init_db()'
echo "Сервис успешно поднят!"
