"""Add updated_at column to campaigns table

Revision ID: 001
Revises: 
Create Date: 2025-09-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add updated_at column to campaigns table with a default value of current_timestamp
    op.add_column('campaigns', sa.Column('updated_at', sa.DateTime(timezone=True), 
                                       server_default=sa.text('now()'), nullable=False))
    
    # Set up trigger to automatically update updated_at column when a row is updated
    op.execute("""
    CREATE OR REPLACE FUNCTION update_modified_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    """)
    
    op.execute("""
    CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
    """)


def downgrade():
    # Drop the trigger first
    op.execute("DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns")
    
    # Drop the function
    op.execute("DROP FUNCTION IF EXISTS update_modified_column()")
    
    # Drop the column
    op.drop_column('campaigns', 'updated_at')