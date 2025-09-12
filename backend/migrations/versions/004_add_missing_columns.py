"""Add missing columns to campaigns and contacts tables

Revision ID: 004
Revises: 003
Create Date: 2025-09-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Add followup_gap_days column to campaigns table
    op.add_column('campaigns', 
                 sa.Column('followup_gap_days', sa.Integer(), 
                           server_default='2', 
                           nullable=True))
                           
    # Add designation column to contacts table
    op.add_column('contacts',
                 sa.Column('designation', sa.String(),
                           nullable=True))
    
    # Create an index on the designation column
    op.create_index(op.f('ix_contacts_designation'), 'contacts', ['designation'], unique=False)


def downgrade():
    # Drop the index first
    op.drop_index(op.f('ix_contacts_designation'), table_name='contacts')
    
    # Drop the columns
    op.drop_column('contacts', 'designation')
    op.drop_column('campaigns', 'followup_gap_days')