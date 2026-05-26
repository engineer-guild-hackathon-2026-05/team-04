-- AI提案機能からDB書き込み経路を撤去するため、旧AIレシピ保存RPCを削除する。
-- レシピ・食材の信頼済みデータは検証前にAI機能から変更しない。
drop function if exists public.insert_ai_recipes_mvp(uuid, jsonb);
drop function if exists public.insert_ai_recipe_mvp(uuid, uuid, jsonb, jsonb, jsonb);
