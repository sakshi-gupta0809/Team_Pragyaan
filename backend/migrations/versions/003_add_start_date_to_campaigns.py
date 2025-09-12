"""Add start_date column to campaigns table

Revision ID: 003
Revises: 002
Create Date: 2025-09-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Add start_date column to campaigns table
    op.add_column('campaigns', 
                 sa.Column('start_date', postgresql.TIMESTAMP(timezone=True), 
                           nullable=True))


def downgrade():
    # Drop the column
    op.drop_column('campaigns', 'start_date')