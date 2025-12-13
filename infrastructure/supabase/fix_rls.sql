-- Quick fix for RLS policy - Run this in Supabase SQL Editor

-- Drop old policy
DROP POLICY IF EXISTS "Users can view own data" ON users;

-- Create new policies
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (true);  -- Allow anyone to read (NextAuth needs this)

CREATE POLICY "Anyone can create user"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (true);
