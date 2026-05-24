-- develop の初期 schema migration が public.profiles / RLS / auth.users trigger を作成済み。
-- この migration は feature/login 由来の重複 create table を fresh reset で失敗させないため、
-- 認証基盤の追加 migration としては no-op にする。
--
-- 既存 DB にこの migration が適用済みの場合は Supabase の migration history により再実行されない。
-- fresh DB では 20260524000001_init_schema.sql が profiles を作成する。
select 1;
