-- Enable RLS on all public tables
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats              ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles
-- ============================================================
CREATE POLICY "profiles: owner select"
  ON profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles: owner insert"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================
-- chats
-- Authenticated users own chats via user_id.
-- Anonymous chats (session_id) are managed server-side via
-- service role key — session_id cannot be verified in RLS.
-- ============================================================
CREATE POLICY "chats: owner select"
  ON chats FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "chats: owner insert"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "chats: owner update"
  ON chats FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "chats: owner delete"
  ON chats FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- messages
-- Access granted when the parent chat belongs to the user.
-- ============================================================
CREATE POLICY "messages: owner select"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
        AND chats.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "messages: owner insert"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
        AND chats.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "messages: owner delete"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
        AND chats.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- anonymous_sessions
-- No direct client access. All writes go through
-- try_increment_anon_questions which is SECURITY DEFINER.
-- (zero policies = deny all for anon + authenticated roles)
-- ============================================================
ALTER FUNCTION try_increment_anon_questions(TEXT, INTEGER) SECURITY DEFINER;

-- ============================================================
-- documents
-- Access granted when the parent chat belongs to the user.
-- ============================================================
CREATE POLICY "documents: owner select"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = documents.chat_id
        AND chats.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "documents: owner insert"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = documents.chat_id
        AND chats.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "documents: owner delete"
  ON documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = documents.chat_id
        AND chats.user_id = (SELECT auth.uid())
    )
  );
