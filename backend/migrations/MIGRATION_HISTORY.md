# Database Migration History

## 2025-09-11: Add missing columns to campaigns table

### Issue:
The application was failing to fetch campaigns with the error:
```
Failed to fetch campaigns: {"detail":"Failed to fetch campaigns: (psycopg2.errors.UndefinedColumn) column campaigns.updated_at does not exist"}
```

After fixing the updated_at column, there was a subsequent error:
```
Failed to fetch campaigns: {"detail":"Failed to fetch campaigns: (psycopg2.errors.UndefinedColumn) column campaigns.status does not exist"}
```

### Resolution:
Several columns defined in the SQLAlchemy model were missing from the database schema. We added the following columns:

1. Added the `updated_at` column to the campaigns table:
```sql
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
```

2. Created a trigger function to automatically update the timestamp when a row is updated:
```sql
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

3. Created a trigger that uses this function:
```sql
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
```

4. Added the `status` column with a default value of 'draft':
```sql
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'draft' NOT NULL;
```

5. Added campaign metrics columns:
```sql
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS unsubscribe_count INTEGER DEFAULT 0 NOT NULL;
```

### Notes:
- Several columns were defined in the SQLAlchemy model but were missing in the actual database schema.
- For future schema changes, consider using a proper migration tool like Alembic to keep the database schema in sync with the models.
- It's important to validate database schema against models as part of the CI/CD pipeline or development process.