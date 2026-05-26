import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync('src/app/api/me/profile/route.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260525151000_persist_non_ingredient_restrictions.sql', 'utf8');

assert.match(
  migration,
  /add column if not exists non_ingredient_restrictions text\[\] not null default '\{\}'::text\[\]/,
  'user_preferences に prep-* / diet-* 保存用の non_ingredient_restrictions を追加してください。',
);
assert.match(
  migration,
  /add column if not exists non_ingredient_restriction_reasons jsonb not null default '\{\}'::jsonb/,
  'user_preferences に非食材制限の reason map を保存してください。',
);
assert.match(
  route,
  /select\('preferred_dishes, preferred_cuisines, non_ingredient_restrictions, non_ingredient_restriction_reasons'\)/,
  'プロフィールGETは user_preferences から非食材制限も読む必要があります。',
);
assert.match(
  route,
  /const nonIngredientRestrictions = normalizeStringArray\(preferenceRow\.non_ingredient_restrictions\)/,
  'プロフィールGETは非食材制限配列を正規化してください。',
);
assert.match(
  route,
  /restrictedIngredients: combinedRestrictedIngredients/,
  'プロフィールGETは ing-* と prep-* / diet-* を統合して返してください。',
);
assert.match(
  route,
  /import \{[^}]*isDietaryRestrictionId[^}]*\} from '@\/lib\/dietaryRestrictions'/,
  'プロフィールPUTは diet-* の対応 ID を共有ルールで検証してください。',
);
assert.match(
  route,
  /import \{[^}]*isPreparationRestrictionId[^}]*\} from '@\/lib\/preparationRestrictions'/,
  'プロフィールPUTは prep-* の対応 ID を共有ルールで検証してください。',
);
assert.match(
  route,
  /function isSupportedNonIngredientRestrictionId[\s\S]*isDietaryRestrictionId\(code\)[\s\S]*isPreparationRestrictionId\(code\)/,
  'プロフィールPUTは非食材制限を diet-* / prep-* の対応 ID に限定してください。',
);
assert.match(
  route,
  /unknownNonIngredientRestrictionCodes[\s\S]*NextResponse\.json\([\s\S]*Unknown restricted ingredient codes\.[\s\S]*unknownCodes:[\s\S]*status:\s*400/,
  '未対応の非食材制限 ID は user_preferences に保存せず unknownCodes 付き 400 で拒否してください。',
);
assert.match(
  route,
  /non_ingredient_restrictions: requestedNonIngredientRestrictions/,
  'プロフィールPUTは検証済みの prep-* / diet-* だけを user_preferences に保存してください。',
);
assert.doesNotMatch(
  route,
  /non_ingredient_restrictions: requestedRestrictedIngredients\.filter\(\(code\) => !code\.startsWith\('ing-'\)\)/,
  'プロフィールPUTは未検証の非食材制限 ID をそのまま保存してはいけません。',
);
assert.match(
  route,
  /non_ingredient_restriction_reasons: Object\.fromEntries\([\s\S]*?inferRestrictionReason\(code\)/,
  'プロフィールPUTは非食材制限の reason も保存してください。',
);

console.log('profile non-ingredient restriction DB persistence regression checks passed');
