-- Allow users to delete their own profile (account deletion MVP)

DROP POLICY IF EXISTS "Users delete own profile" ON profiles;
CREATE POLICY "Users delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);
