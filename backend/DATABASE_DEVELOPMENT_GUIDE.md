# Database Development Guide

This guide outlines the process for making changes to the database schema in this project. Following these procedures will help ensure that the database schema stays in sync with SQLAlchemy models and prevent errors like "column does not exist."

## Overview of Tools

- **Alembic**: A database migration tool used to keep database schema in sync with SQLAlchemy models
- **Schema Validation Tests**: Tests that verify the database schema matches the SQLAlchemy models
- **create_migration.py**: A helper script that generates migrations automatically

## Development Process for Database Changes

### 1. Update the SQLAlchemy Models

When you need to make a change to the database schema, **always start by updating the models**:

```python
# Example: Adding a new column to the Campaign model
class Campaign(Base):
    __tablename__ = "campaigns"
    
    # Existing fields...
    new_field = Column(String, nullable=True)
```

### 2. Generate a Migration

After updating the model, generate a migration using the provided script:

```bash
python create_migration.py "Add new_field to campaigns"
```

This will:
- Detect the differences between your models and the database
- Create a migration file in `migrations/versions/`
- Print the location of the migration file

### 3. Review the Migration

Always review the generated migration to ensure it's doing what you expect:

```python
# Example migration file
def upgrade():
    op.add_column('campaigns', sa.Column('new_field', sa.String(), nullable=True))

def downgrade():
    op.drop_column('campaigns', 'new_field')
```

### 4. Apply the Migration

Apply the migration to update the database schema:

```bash
# When running locally
alembic upgrade head

# When running in Docker
docker exec -it email_backend bash -c "cd /app && alembic upgrade head"
```

### 5. Run Schema Validation Tests

Verify that the database schema now matches the models:

```bash
# When running locally
python -m tests.test_schema_validation

# When running in Docker
docker exec -it email_backend bash -c "cd /app && python -m tests.test_schema_validation"
```

## CI/CD Integration

The schema validation test should be integrated into your CI/CD pipeline to catch schema mismatches early:

```yaml
# Example GitHub Actions workflow step
- name: Run Schema Validation Tests
  run: |
    docker-compose up -d
    docker exec email_backend bash -c "cd /app && python -m tests.test_schema_validation"
```

## Common Scenarios

### Adding a New Column

1. Add the column to the model
2. Generate a migration
3. Apply the migration
4. Run validation tests

### Changing a Column Type

1. Update the column type in the model
2. Generate a migration (may need manual editing for complex type changes)
3. Apply the migration
4. Run validation tests

### Removing a Column

1. Remove the column from the model
2. Generate a migration
3. Apply the migration (be careful, this will delete data!)
4. Run validation tests

## Troubleshooting

### Schema Out of Sync

If the schema validation test fails:

1. Check if there are unapplied migrations: `alembic current`
2. Generate a new migration to fix discrepancies
3. Apply the migration and re-run the validation test

### Migration Errors

If a migration fails to apply:

1. Check the error message for details
2. You may need to manually edit the migration file
3. For complex issues, consider writing a custom SQL script

## Best Practices

1. **Never modify the database schema directly** (e.g., using raw SQL) without creating a corresponding migration
2. **Small, incremental changes** are easier to manage than large, sweeping changes
3. **Run schema validation tests regularly**, especially after applying migrations
4. **Version control your migrations** along with your code
5. **Document complex migrations** with comments explaining the changes
6. **Back up your database** before applying migrations in production

By following this process, you'll maintain a consistent database schema that matches your SQLAlchemy models, preventing errors like "column does not exist" and ensuring a smooth development experience.