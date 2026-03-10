-- Helper function for digit reduction (preserving master numbers 11, 22)
CREATE OR REPLACE FUNCTION reduce_to_digit(num int) RETURNS int AS $$
DECLARE
  result int := num;
BEGIN
  WHILE result > 9 AND result != 11 AND result != 22 LOOP
    result := (result / 10) + (result % 10);
    -- Handle 3+ digit numbers by re-reducing
    IF result > 22 THEN
      result := (result / 10) + (result % 10);
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill birthday_number
UPDATE profiles
SET birthday_number = reduce_to_digit(EXTRACT(DAY FROM birth_date)::int)
WHERE birth_date IS NOT NULL AND birthday_number IS NULL;

-- Backfill personal_year_number: reduce(birth_month + birth_day + current_year digits)
-- Match the JS logic: reduce(reduce(month) + reduce(day) + reduce(year))
UPDATE profiles
SET personal_year_number = reduce_to_digit(
  reduce_to_digit(EXTRACT(MONTH FROM birth_date)::int) +
  reduce_to_digit(EXTRACT(DAY FROM birth_date)::int) +
  reduce_to_digit(2026)
)
WHERE birth_date IS NOT NULL AND personal_year_number IS NULL;

-- Clean up helper function
DROP FUNCTION reduce_to_digit;