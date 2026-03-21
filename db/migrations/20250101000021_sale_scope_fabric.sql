-- Extend sale_scope enum for fabric_type scoped sales
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'sale_scope'
      AND e.enumlabel = 'fabric_type'
  ) THEN
    ALTER TYPE sale_scope ADD VALUE 'fabric_type';
  END IF;
END $$;
