import pytest
import sqlalchemy as sa
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, SYNC_DATABASE_URL
from app.models import Campaign, Contact, EmailLog, EmailTemplate, Schedule, FollowUp, User


def test_database_schema_matches_models():
    """
    Test that ensures the actual database schema matches the SQLAlchemy models.
    This helps catch situations where model changes haven't been migrated to the database.
    """
    # Connect to the database
    engine = create_engine(SYNC_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Get the inspector to examine the database schema
    inspector = inspect(engine)
    
    # Check all tables defined in models exist in the database
    model_tables = Base.metadata.tables.keys()
    db_tables = inspector.get_table_names()
    
    # Make sure all model tables exist in the database
    for table_name in model_tables:
        assert table_name in db_tables, f"Table '{table_name}' defined in models but not found in database"
    
    # For each table, check all columns defined in models exist in the database
    for table_name in model_tables:
        # Get model columns
        model_columns = {c.name: c for c in Base.metadata.tables[table_name].columns}
        
        # Get database columns
        db_columns = {c['name']: c for c in inspector.get_columns(table_name)}
        
        # Check all model columns exist in the database
        for column_name in model_columns:
            assert column_name in db_columns, f"Column '{column_name}' of table '{table_name}' defined in models but not found in database"
        
        # Optionally, check column types - this is a simplified check as type comparison can be complex
        for column_name, model_column in model_columns.items():
            db_column = db_columns[column_name]
            
            # Get the type name from the model column
            model_type = model_column.type.__class__.__name__
            # Get the type name from the database column
            db_type = db_column['type'].__class__.__name__
            
            # Print for debugging
            print(f"Table: {table_name}, Column: {column_name}, Model type: {model_type}, DB type: {db_type}")
            
            # Assert that types are compatible (simplified)
            # In a real-world scenario, you might need more sophisticated type compatibility checks
            if model_type == 'String' and 'VARCHAR' not in str(db_type).upper():
                pytest.fail(f"Column type mismatch for {table_name}.{column_name}: model={model_type}, db={db_type}")
            elif model_type == 'Integer' and 'INT' not in str(db_type).upper():
                pytest.fail(f"Column type mismatch for {table_name}.{column_name}: model={model_type}, db={db_type}")
            elif model_type == 'DateTime' and 'TIME' not in str(db_type).upper():
                pytest.fail(f"Column type mismatch for {table_name}.{column_name}: model={model_type}, db={db_type}")
            # Add more type checks as needed

if __name__ == "__main__":
    # Run the test directly when this script is executed
    test_database_schema_matches_models()
    print("Schema validation test passed! The database schema matches the SQLAlchemy models.")