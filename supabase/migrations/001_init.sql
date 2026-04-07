-- Profiles mirror Supabase auth.users
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chats support both authenticated (user_id) and anonymous (session_id) users
CREATE TABLE chats (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  title      TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chats_user_id    ON chats(user_id);
CREATE INDEX idx_chats_session_id ON chats(session_id);
CREATE INDEX idx_chats_updated_at ON chats(updated_at DESC);

-- Messages with JSONB attachments (image URLs, document file_ids)
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_chat_id    ON messages(chat_id);
CREATE INDEX idx_messages_created_at ON messages(chat_id, created_at);

-- Anonymous sessions for free question limit tracking
CREATE TABLE anonymous_sessions (
  id             TEXT PRIMARY KEY,
  questions_used INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents with extracted text content for context injection
CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id      UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  filename     TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   INTEGER NOT NULL,
  text_content TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_chat_id ON documents(chat_id);

-- Atomically increments the anonymous question counter only when under the
-- limit. Returns { allowed, questions_used } so the caller never needs a
-- separate read-then-write, which would race under concurrent requests.
CREATE OR REPLACE FUNCTION try_increment_anon_questions(
  p_session_id TEXT,
  p_limit      INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_count INTEGER;
  v_current   INTEGER;
BEGIN
  INSERT INTO anonymous_sessions (id, questions_used)
  VALUES (p_session_id, 0)
  ON CONFLICT (id) DO NOTHING;

  WITH updated AS (
    UPDATE anonymous_sessions
       SET questions_used = questions_used + 1,
           last_seen_at   = now()
     WHERE id             = p_session_id
       AND questions_used < p_limit
     RETURNING questions_used
  )
  SELECT questions_used INTO v_new_count FROM updated;

  IF v_new_count IS NULL THEN
    SELECT questions_used INTO v_current
      FROM anonymous_sessions
     WHERE id = p_session_id;

    RETURN jsonb_build_object('allowed', false, 'questions_used', v_current);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'questions_used', v_new_count);
END;
$$;
