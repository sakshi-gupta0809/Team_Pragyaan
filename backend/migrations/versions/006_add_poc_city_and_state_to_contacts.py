"""Add POC City and POC State columns to contacts

Revision ID: 006
Revises: 005_add_profile_fields
Create Date: 2025-09-15 01:36:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005_add_profile_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Add poc_city and poc_state columns to contacts table
    op.add_column('contacts', sa.Column('poc_city', sa.String(), nullable=True))
    op.add_column('contacts', sa.Column('poc_state', sa.String(), nullable=True))
    
    # Copy data from extra_data JSON to the new columns
    connection = op.get_bind()
    
    # This is a database-safe SQL statement to update the new columns from JSON data
    # The syntax varies by database engine, so we're using a generic approach that works with PostgreSQL
    connection.execute("""
    UPDATE contacts 
    SET 
        poc_city = CASE 
            WHEN extra_data->>'city' IS NOT NULL THEN extra_data->>'city'
            WHEN extra_data->>'POC City' IS NOT NULL THEN extra_data->>'POC City'
            ELSE NULL
        END,
        poc_state = CASE 
            WHEN extra_data->>'state' IS NOT NULL THEN extra_data->>'state'
            WHEN extra_data->>'POC State' IS NOT NULL THEN extra_data->>'POC State'
            ELSE NULL
        END
    WHERE extra_data IS NOT NULL
    """)


def downgrade():
    # Remove the new columns
    op.drop_column('contacts', 'poc_city')
    op.drop_column('contacts', 'poc_state')