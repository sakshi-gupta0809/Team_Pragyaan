"""Add scenario column to campaigns table

Revision ID: 002
Revises: 001
Create Date: 2025-09-11

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Add scenario column to campaigns table with a default value of 'cold_outreach'
    op.add_column('campaigns', 
                  sa.Column('scenario', sa.String(), 
                            server_default=sa.text("'cold_outreach'"), 
                            nullable=False))
    
    # Create an index on the scenario column
    op.create_index(op.f('ix_campaigns_scenario'), 'campaigns', ['scenario'], unique=False)


def downgrade():
    # Drop the index first
    op.drop_index(op.f('ix_campaigns_scenario'), table_name='campaigns')
    
    # Drop the column
    op.drop_column('campaigns', 'scenario')