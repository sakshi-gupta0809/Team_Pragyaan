#!/usr/bin/env python3
"""
Script to create a new Alembic migration with auto-generation
based on the difference between models and the current database schema.

Usage:
    python create_migration.py "Add updated_at column to campaigns"
"""

import sys
import os
import datetime
import subprocess
from pathlib import Path

def create_migration(message):
    """Create a new migration with the given message."""
    if not message:
        print("Error: Migration message is required.")
        print("Usage: python create_migration.py \"Your migration message\"")
        sys.exit(1)
    
    # Ensure we're in the backend directory
    backend_dir = Path(__file__).resolve().parent
    os.chdir(backend_dir)
    
    # Create migrations directory if it doesn't exist
    migrations_dir = backend_dir / "migrations" / "versions"
    migrations_dir.mkdir(parents=True, exist_ok=True)
    
    # Format the current date and time for the migration filename
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    try:
        # Run alembic command to generate migration
        cmd = ["alembic", "revision", "--autogenerate", "-m", message]
        result = subprocess.run(
            cmd, 
            check=True, 
            capture_output=True, 
            text=True
        )
        
        print(result.stdout)
        print("Migration created successfully!")
        
        # Look for the migration file to report its path
        migration_files = list(migrations_dir.glob(f"*_{message.lower().replace(' ', '_')}.py"))
        if migration_files:
            print(f"Migration file created at: {migration_files[0]}")
        
        # Suggest running the migration
        print("\nTo apply the migration, run:")
        print("    alembic upgrade head")
        
    except subprocess.CalledProcessError as e:
        print(f"Error creating migration: {e}")
        print("Command output:")
        print(e.stdout)
        print("Error output:")
        print(e.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # Get the migration message from command line arguments
    message = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else ""
    create_migration(message)