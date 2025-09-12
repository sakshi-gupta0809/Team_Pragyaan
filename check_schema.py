from backend.app.database import engine, SessionLocal
from sqlalchemy import inspect, text

inspector = inspect(engine)
columns = inspector.get_columns('contacts')
print('New columns in contacts table:')
for col in columns:
    print(f"{col['name']}: {col['type']}")