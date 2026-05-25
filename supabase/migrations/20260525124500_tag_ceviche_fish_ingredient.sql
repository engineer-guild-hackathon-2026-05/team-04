-- =============================================
-- Backfill dietary tags for curated ceviche white fish
-- =============================================

update public.ingredients
set
  category = '魚介類',
  dietary_tags = array['fish', 'animal-product']::text[]
where name_en = 'curated:ceviche:ingredient:01';
