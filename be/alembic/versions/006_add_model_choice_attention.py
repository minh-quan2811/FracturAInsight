"""Add attention_map to fracture_detections, add linear/segmental fracture types

Revision ID: 006_add_model_choice_attention
Revises: 005_add_session_summaries
Create Date: 2026-10-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = '006_add_model_choice_attention'
down_revision = '005_add_session_summaries'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'fracture_detections',
        sa.Column('attention_map', JSONB(), nullable=True),
    )

    # ADD VALUE can't run inside a transaction on older Postgres.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE fracture_type ADD VALUE IF NOT EXISTS 'linear'")
        op.execute("ALTER TYPE fracture_type ADD VALUE IF NOT EXISTS 'segmental'")


def downgrade() -> None:
    op.drop_column('fracture_detections', 'attention_map')
    # Postgres can't drop enum values, so 'linear' and 'segmental' stay.