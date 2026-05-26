-- Backfill dietary tags for Southeast Asian curated custom seafood ingredients
-- after the original additive seed migration inserted them without dietary_tags.

with seafood_tags(name_en, category, dietary_tags) as (
  values
    ('curated:banh-xeo:ingredient:10', '魚介類', array['fish', 'animal-product']::text[]),
    ('curated:green-curry:ingredient:08', '魚介類', array['fish', 'animal-product']::text[]),
    ('curated:laksa-lemak:ingredient:03', '甲殻類', array['shellfish', 'animal-product']::text[]),
    ('curated:amok-trey:ingredient:01', '魚介類', array['fish', 'animal-product']::text[]),
    ('curated:amok-trey:ingredient:08', '魚介類', array['fish', 'animal-product']::text[]),
    ('curated:som-tam:ingredient:06', '魚介類', array['fish', 'animal-product']::text[]),
    ('curated:larb-gai:ingredient:04', '魚介類', array['fish', 'animal-product']::text[]),
    ('curated:tom-yum-goong:ingredient:02', '甲殻類', array['shellfish', 'animal-product']::text[]),
    ('curated:tom-yum-goong:ingredient:09', '魚介類', array['fish', 'animal-product']::text[]),
    ('curated:com-tam:ingredient:05', '魚介類', array['fish', 'animal-product']::text[])
)
update public.ingredients i
set
  category = seafood_tags.category,
  dietary_tags = seafood_tags.dietary_tags,
  updated_at = now()
from seafood_tags
where i.name_en = seafood_tags.name_en;
