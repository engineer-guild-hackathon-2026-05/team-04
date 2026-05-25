-- =============================================
-- Add Southeast Asian curated rice-forward dishes
-- =============================================

alter table public.recipe_ingredients
  add column if not exists display_name_ja text;

create temporary table _southeast_asian_dish_seed on commit drop as
select *
from jsonb_to_recordset($southeast_asian_dishes$[{"slug":"banh-xeo","wiki_page":"Bánh xèo","source_ref":"curated:banh-xeo","title":"バインセオ","description":"米粉、ターメリック、ココナッツミルクで作る薄い生地を香ばしく焼き、豚肉、えび、もやしを包んで葉野菜とハーブで食べるベトナムの米粉クレープです。","cuisine":"ベトナム","flag":"🇻🇳","cook_time_min":60,"servings":4,"is_vegan":false,"is_gluten_free":true,"tags":["ベトナム料理","米粉","屋台料理","えび","グルテンフリー"],"ingredients":[{"name_ja":"米粉","name_en":"rice flour","quantity":"200g","master_name_en":null,"is_optional":false},{"name_ja":"ターメリック","name_en":"turmeric","quantity":"小さじ1","master_name_en":null,"is_optional":false},{"name_ja":"ココナッツミルク","name_en":"coconut milk","quantity":"200ml","master_name_en":null,"is_optional":false},{"name_ja":"水","name_en":"water","quantity":"200ml","master_name_en":null,"is_optional":false},{"name_ja":"豚薄切り肉","name_en":"pork belly","quantity":"180g","master_name_en":"pork","is_optional":false},{"name_ja":"えび","name_en":"shrimp","quantity":"160g","master_name_en":"shrimp","is_optional":false},{"name_ja":"もやし","name_en":"bean sprouts","quantity":"200g","master_name_en":null,"is_optional":false},{"name_ja":"青ねぎ","name_en":"scallions","quantity":"2本","master_name_en":null,"is_optional":false},{"name_ja":"レタスと香草","name_en":"lettuce and herbs","quantity":"適量","master_name_en":null,"is_optional":false},{"name_ja":"ヌクチャム","name_en":"nuoc cham","quantity":"適量","master_name_en":null,"is_optional":false}],"steps":[{"order":1,"text":"米粉、ターメリック、塩、ココナッツミルク、水を混ぜ、さらりとした生地にして30分ほど休ませます。"},{"order":2,"text":"豚肉とえびは軽く下味をつけ、もやしと青ねぎ、包むためのレタスや香草を洗って水気を切ります。"},{"order":3,"text":"フライパンを強めに熱して油をなじませ、豚肉とえびを短時間炒めて香ばしさを出します。"},{"order":4,"text":"生地を薄く流し入れ、鍋を回して縁まで広げ、ふたをして底がぱりっとするまで焼きます。"},{"order":5,"text":"もやしをのせて軽く蒸し、片側を折りたたんで、外側はクリスピーで中はみずみずしい状態に仕上げます。"},{"order":6,"text":"食べやすく割り、レタスと香草で包み、魚醤ベースのヌクチャムにつけて熱いうちに食べます。"}],"source_urls":["https://go2-vietnam.com/en/food/banh-xeo/","https://en.wikipedia.org/wiki/B%C3%A1nh_x%C3%A8o"],"image_url":"/recipe-images/banh-xeo.webp","photo_source_url":"https://en.wikipedia.org/wiki/B%C3%A1nh_x%C3%A8o","origin_title":"バインセオの由来","culture_title":"ベトナムの食文化とバインセオ","origin_body":"バインセオは、熱い鍋に生地を流したときの「セオ」という音に名を持つとされるベトナムの米粉料理です。南部では大きく薄いクレープ状、中央部では小ぶりに焼くなど地域差があり、米、ココナッツ、魚醤、香草の組み合わせが土地ごとの味を作ります。\n\n米粉とターメリックの生地を油でぱりっと焼き、えびや豚肉、もやしを包む構成は、屋台の即興性と家庭料理の共有性を併せ持っています。葉野菜で包んで食べるため、揚げ焼きの香ばしさを生野菜とハーブが受け止めます。\n\nベトナムとクメール圏の食文化の接点も語られる料理で、国境や地域を越えて似た米粉生地の料理が見られます。単なるクレープではなく、米作、香草、魚醤文化が重なる東南アジアらしい一皿です。","culture_body":"ベトナム料理では、主食の米を粒、麺、粉の形で使い分けます。バインセオは米粉を使うため小麦を避けやすく、レタスやハーブで包む食べ方は、油を使う料理でも軽く感じさせる工夫になっています。\n\n伝統的な具には豚肉やえび、魚醤だれが使われるためヴィーガンではなく、甲殻類や豚肉制限には注意が必要です。一方で生地自体は米粉主体なので、調味料を確認すればグルテンフリーの選択肢として扱いやすい料理です。\n\n家族や友人で焼きたてを囲み、各自が葉で包んで食べる形式は共同性を生みます。仏教由来の菜食習慣に合わせる場合は、えびや豚肉をきのこや豆腐に替え、魚醤を植物性のたれに置き換えることができます。"},{"slug":"green-curry","wiki_page":"Green curry","source_ref":"curated:green-curry","title":"ゲーンキアオワーン・ガイ","description":"青唐辛子とハーブのグリーンカレーペーストをココナッツミルクで煮のばし、鶏肉、なす、バジルを合わせるタイの香り高いカレーです。","cuisine":"タイ","flag":"🇹🇭","cook_time_min":45,"servings":4,"is_vegan":false,"is_gluten_free":true,"tags":["タイ料理","カレー","ココナッツ","鶏肉","グルテンフリー"],"ingredients":[{"name_ja":"鶏もも肉","name_en":"chicken thigh","quantity":"350g","master_name_en":"chicken","is_optional":false},{"name_ja":"グリーンカレーペースト","name_en":"green curry paste","quantity":"大さじ3","master_name_en":null,"is_optional":false},{"name_ja":"ココナッツミルク","name_en":"coconut milk","quantity":"500ml","master_name_en":null,"is_optional":false},{"name_ja":"タイなす","name_en":"thai eggplant","quantity":"6個","master_name_en":null,"is_optional":false},{"name_ja":"たけのこ","name_en":"bamboo shoots","quantity":"100g","master_name_en":null,"is_optional":true},{"name_ja":"こぶみかんの葉","name_en":"kaffir lime leaves","quantity":"4枚","master_name_en":null,"is_optional":false},{"name_ja":"タイバジル","name_en":"thai basil","quantity":"1つかみ","master_name_en":null,"is_optional":false},{"name_ja":"魚醤","name_en":"fish sauce","quantity":"大さじ2","master_name_en":null,"is_optional":false},{"name_ja":"パームシュガー","name_en":"palm sugar","quantity":"小さじ2","master_name_en":null,"is_optional":false},{"name_ja":"ジャスミンライス","name_en":"jasmine rice","quantity":"適量","master_name_en":null,"is_optional":false}],"steps":[{"order":1,"text":"鍋に濃いココナッツミルクの上澄みを入れて温め、油が少し分離するまで煮詰めます。"},{"order":2,"text":"グリーンカレーペーストを加え、青唐辛子、レモングラス、ガランガルなどの香りが立つまで焦がさず炒めます。"},{"order":3,"text":"鶏肉を加えて表面に火を通し、残りのココナッツミルクとこぶみかんの葉を入れて煮ます。"},{"order":4,"text":"タイなすとたけのこを加え、なすが柔らかくなりすぎない程度に火を通します。"},{"order":5,"text":"魚醤とパームシュガーで塩味と甘味を整え、最後にタイバジルを加えて香りを保ちます。"},{"order":6,"text":"ジャスミンライスにかけ、カレーの香りと米の甘さを合わせて、熱い状態で提供します。"}],"source_urls":["https://www.templeofthai.com/recipes/thai_green_curry.php","https://www.nationalgeographic.com/travel/article/thai-green-curry-revealing-spicy-secrets-of-a-culinary-classic","https://en.wikipedia.org/wiki/Green_curry"],"image_url":"/recipe-images/green-curry.webp","photo_source_url":"https://en.wikipedia.org/wiki/Green_curry","origin_title":"ゲーンキアオワーン・ガイの由来","culture_title":"タイの食文化とゲーンキアオワーン・ガイ","origin_body":"ゲーンキアオワーンは、青唐辛子を中心にしたペーストとココナッツミルクを使う比較的新しいタイカレーとして語られます。名前は「甘い緑のカレー」と訳されることがありますが、甘いだけでなく、青唐辛子とハーブの香りをココナッツが包む料理です。\n\nペーストには青唐辛子、レモングラス、ガランガル、こぶみかんの皮、にんにく、香辛料などが入り、魚醤やパームシュガーで味を整えます。鶏肉を使う形は家庭でも作りやすく、米と合わせることで主菜になります。\n\nタイのカレーはインドの粉末カレーとは異なり、生のハーブをすりつぶしたペーストが味の核です。熱帯の香味植物、ココナッツ、魚醤文化が結びついた、タイ中部以降の食文化を象徴する料理です。","culture_body":"タイの食卓では、汁気のある料理をご飯と一緒に食べ、辛味、甘味、塩味、香りを米で受け止めます。ゲーンキアオワーンはココナッツの豊かさと青唐辛子の刺激が同居し、家庭料理からレストランまで広く登場します。\n\n標準形は鶏肉と魚醤を使うためヴィーガンではありません。小麦を必須としないためグルテンフリーにしやすい一方、市販ペーストにはえびペーストや小麦由来調味料が入る場合があるため確認が必要です。\n\n仏教の菜食日に合わせる場合は、鶏肉を豆腐や野菜に替え、えびペーストを含まないペーストと植物性調味料を使います。香りの軸を保てば、宗教・アレルギー・菜食条件に合わせて調整しやすい料理です。"},{"slug":"laksa-lemak","wiki_page":"Laksa","source_ref":"curated:laksa-lemak","title":"ラクサ・ルマック","description":"ココナッツミルクと香辛料、えびの旨味を合わせた濃厚なスープに、太い米麺、えび、もやし、ラクサリーフを入れるニョニャ系の麺料理です。","cuisine":"シンガポール","flag":"🇸🇬","cook_time_min":75,"servings":4,"is_vegan":false,"is_gluten_free":true,"tags":["プラナカン料理","米麺","ココナッツ","えび","グルテンフリー"],"ingredients":[{"name_ja":"太い米麺またはビーフン","name_en":"thick rice noodles","quantity":"400g","master_name_en":null,"is_optional":false},{"name_ja":"えび","name_en":"prawns","quantity":"250g","master_name_en":"shrimp","is_optional":false},{"name_ja":"干しえび","name_en":"dried shrimp","quantity":"大さじ2","master_name_en":null,"is_optional":false},{"name_ja":"ココナッツミルク","name_en":"coconut milk","quantity":"500ml","master_name_en":null,"is_optional":false},{"name_ja":"レモングラス","name_en":"lemongrass","quantity":"2本","master_name_en":null,"is_optional":false},{"name_ja":"ガランガル","name_en":"galangal","quantity":"20g","master_name_en":null,"is_optional":false},{"name_ja":"唐辛子","name_en":"chili","quantity":"3本","master_name_en":null,"is_optional":false},{"name_ja":"もやし","name_en":"bean sprouts","quantity":"150g","master_name_en":null,"is_optional":false},{"name_ja":"厚揚げ","name_en":"fried tofu puffs","quantity":"8個","master_name_en":"soybean","is_optional":false},{"name_ja":"ラクサリーフ","name_en":"laksa leaves","quantity":"適量","master_name_en":null,"is_optional":false},{"name_ja":"ゆで卵","name_en":"boiled eggs","quantity":"2個","master_name_en":"egg","is_optional":true}],"steps":[{"order":1,"text":"干しえびを戻し、唐辛子、レモングラス、ガランガル、にんにく、シャロットと一緒にすりつぶして香味ペーストを作ります。"},{"order":2,"text":"鍋でペーストを油で炒め、香りが立ち油が赤く色づくまで水分を飛ばします。"},{"order":3,"text":"えびの殻で取っただしとココナッツミルクを加え、弱火で煮て辛味と甘味をなじませます。"},{"order":4,"text":"厚揚げを入れてスープを吸わせ、えびを加えて火が通ったら魚醤または塩で味を整えます。"},{"order":5,"text":"米麺ともやしを湯通しして器に入れ、熱いスープと具を注ぎます。"},{"order":6,"text":"刻んだラクサリーフ、好みでゆで卵を添え、ココナッツの濃厚さと米麺の軽さを合わせて食べます。"}],"source_urls":["https://www.roots.gov.sg/ich-landing/ich/laksa","https://www.nationalgeographic.com/travel/article/deconstructing-laksa-fusion-dish-malaysia-singapore","https://en.wikipedia.org/wiki/Laksa"],"image_url":"/recipe-images/laksa-lemak.webp","photo_source_url":"https://en.wikipedia.org/wiki/Laksa","origin_title":"ラクサ・ルマックの由来","culture_title":"シンガポールの食文化とラクサ・ルマック","origin_body":"ラクサはマレーシア、シンガポール、インドネシアに広がる麺料理群で、ココナッツを使うラクサ・ルマックと、酸味の強いアッサム系などに大きく分かれます。シンガポールやマラッカのプラナカン文化では、中国系移民の麺文化とマレー世界の香辛料、ココナッツ、えびの旨味が結びつきました。\n\nラクサ・ルマックは濃厚なココナッツスープに米麺を合わせるため、主食とスープが一体化しています。えび、干しえび、厚揚げ、ラクサリーフなどが加わり、香りと食感が層を作ります。\n\n店や地域によって麺の太さ、スープの濃度、辛味、具材が異なり、単一の正解よりも地域ごとの記憶が重視されます。都市国家シンガポールの多文化性を示す料理としても紹介される一皿です。","culture_body":"シンガポールの食文化では、ホーカーセンターに多民族の料理が集まり、同じ空間で異なる宗教・言語・食習慣が共存します。ラクサはプラナカン料理の象徴として、家庭の手仕事と屋台の効率性の両方を持っています。\n\n標準形はえびや干しえび、卵、厚揚げを含むため、甲殻類・卵・大豆に注意が必要で、ヴィーガンではありません。一方で米麺を使う構成にすればグルテンフリーにしやすく、小麦麺を混ぜないことと調味料の確認が重要です。\n\nイスラム教徒向けには豚由来食材を避けた店が多く、地域によってハラール対応のラクサも見られます。香辛料とココナッツを軸にすれば、魚介、鶏肉、豆腐など食制限に応じた調整が可能です。"},{"slug":"amok-trey","wiki_page":"Fish amok","source_ref":"curated:amok-trey","title":"アモック・トレイ","description":"白身魚をクルーンと呼ばれるハーブペースト、ココナッツミルク、卵で和え、バナナの葉で蒸してふんわり固めるカンボジアの魚カレーです。","cuisine":"カンボジア","flag":"🇰🇭","cook_time_min":60,"servings":4,"is_vegan":false,"is_gluten_free":true,"tags":["カンボジア料理","魚料理","ココナッツ","蒸し料理","グルテンフリー"],"ingredients":[{"name_ja":"白身魚","name_en":"white fish","quantity":"500g","master_name_en":null,"is_optional":false},{"name_ja":"ココナッツミルク","name_en":"coconut milk","quantity":"300ml","master_name_en":null,"is_optional":false},{"name_ja":"卵","name_en":"egg","quantity":"1個","master_name_en":"egg","is_optional":false},{"name_ja":"レモングラス","name_en":"lemongrass","quantity":"2本","master_name_en":null,"is_optional":false},{"name_ja":"ガランガル","name_en":"galangal","quantity":"15g","master_name_en":null,"is_optional":false},{"name_ja":"ターメリック","name_en":"turmeric","quantity":"小さじ1","master_name_en":null,"is_optional":false},{"name_ja":"こぶみかんの葉","name_en":"kaffir lime leaves","quantity":"4枚","master_name_en":null,"is_optional":false},{"name_ja":"魚醤","name_en":"fish sauce","quantity":"大さじ1","master_name_en":null,"is_optional":false},{"name_ja":"パームシュガー","name_en":"palm sugar","quantity":"小さじ2","master_name_en":null,"is_optional":false},{"name_ja":"バナナの葉","name_en":"banana leaves","quantity":"適量","master_name_en":null,"is_optional":true},{"name_ja":"ジャスミンライス","name_en":"jasmine rice","quantity":"適量","master_name_en":null,"is_optional":false}],"steps":[{"order":1,"text":"レモングラス、ガランガル、ターメリック、こぶみかんの葉、にんにくを細かく刻み、すり鉢で香りの強いクルーンを作ります。"},{"order":2,"text":"白身魚を一口大に切り、クルーン、魚醤、パームシュガー、ココナッツミルクの一部で軽く和えます。"},{"order":3,"text":"卵を加えて混ぜ、蒸したときにやわらかい茶碗蒸し状に固まる濃度に整えます。"},{"order":4,"text":"バナナの葉を火で軽くあぶって柔らかくし、器状に折るか耐熱皿に敷いて魚の混合物を入れます。"},{"order":5,"text":"蒸し器で中心に火が通るまで蒸し、表面に残りのココナッツミルクをかけてさらに短く蒸します。"},{"order":6,"text":"赤唐辛子やこぶみかんの葉を飾り、温かいジャスミンライスと一緒に、香りを崩さず提供します。"}],"source_urls":["https://www.cambodiaembassyuk.org/fish-amok-recipe/","https://www.tasteatlas.com/amok-trey","https://en.wikipedia.org/wiki/Fish_amok"],"image_url":"/recipe-images/amok-trey.webp","photo_source_url":"https://en.wikipedia.org/wiki/Fish_amok","origin_title":"アモック・トレイの由来","culture_title":"カンボジアの食文化とアモック・トレイ","origin_body":"アモック・トレイはカンボジアを代表する魚料理で、淡水魚、ココナッツ、香味ペーストをバナナの葉で蒸す料理として知られます。トンレサップ湖やメコン川の魚資源、クメール料理のハーブ使い、蒸し料理の技法が重なった一皿です。\n\nクルーンと呼ばれるペーストにはレモングラス、ガランガル、ターメリック、こぶみかんの葉などが入り、唐辛子の辛味より香りと丸みが重視されます。卵で軽く固めるため、カレーでありながらムースや茶碗蒸しに近い食感を持つことがあります。\n\n宮廷料理との関係が語られる一方、現在では観光地から家庭まで広く食べられます。バナナの葉やココナッツの使い方は、熱帯の自然素材を調理と器の両方に活かす東南アジアらしい知恵を示します。","culture_body":"カンボジアの食文化では、米と魚が食卓の中心です。淡水魚を発酵、干物、スープ、蒸し物に使い分ける文化があり、アモック・トレイはその中でも香り高く祝祭性のある料理として扱われます。\n\n魚と卵を使うためヴィーガンではありませんが、小麦を使わず、米と一緒に食べる構成なのでグルテンフリーにしやすい料理です。魚介アレルギーや卵アレルギーには注意が必要です。\n\n仏教の影響が強い社会では、寺院や家庭の行事に米料理や魚料理が関わります。観光向けには鶏肉や豆腐版もありますが、伝統的な味の軸は淡水魚、クルーン、ココナッツ、蒸し加減にあります。"},{"slug":"som-tam","wiki_page":"Green papaya salad","source_ref":"curated:som-tam","title":"ソムタム","description":"青パパイヤを細く削り、唐辛子、にんにく、ライム、魚醤、パームシュガー、トマト、いんげん、ピーナッツと叩き合わせるタイ東北部系のサラダです。","cuisine":"タイ","flag":"🇹🇭","cook_time_min":20,"servings":2,"is_vegan":false,"is_gluten_free":true,"tags":["イーサーン料理","サラダ","青パパイヤ","辛味","グルテンフリー"],"ingredients":[{"name_ja":"青パパイヤ","name_en":"green papaya","quantity":"300g","master_name_en":null,"is_optional":false},{"name_ja":"にんにく","name_en":"garlic","quantity":"1片","master_name_en":null,"is_optional":false},{"name_ja":"唐辛子","name_en":"thai chilies","quantity":"2本","master_name_en":null,"is_optional":false},{"name_ja":"いんげん","name_en":"long beans","quantity":"4本","master_name_en":null,"is_optional":false},{"name_ja":"ミニトマト","name_en":"cherry tomatoes","quantity":"6個","master_name_en":null,"is_optional":false},{"name_ja":"魚醤","name_en":"fish sauce","quantity":"大さじ1と1/2","master_name_en":null,"is_optional":false},{"name_ja":"ライム果汁","name_en":"lime juice","quantity":"大さじ2","master_name_en":null,"is_optional":false},{"name_ja":"パームシュガー","name_en":"palm sugar","quantity":"大さじ1","master_name_en":null,"is_optional":false},{"name_ja":"干しえび","name_en":"dried shrimp","quantity":"大さじ1","master_name_en":"shrimp","is_optional":false},{"name_ja":"ローストピーナッツ","name_en":"roasted peanuts","quantity":"大さじ2","master_name_en":"peanut","is_optional":false}],"steps":[{"order":1,"text":"青パパイヤの皮をむき、種を除いて細いせん切りにし、冷水にさらして歯ざわりを保ちます。"},{"order":2,"text":"臼ににんにくと唐辛子を入れ、香りが出るまで軽く叩いて辛味を引き出します。"},{"order":3,"text":"いんげん、ミニトマト、干しえびを加え、形を残しながら軽くつぶして旨味を出します。"},{"order":4,"text":"魚醤、ライム果汁、パームシュガーを加え、甘酸っぱく塩辛いドレッシングを臼の中で溶かします。"},{"order":5,"text":"青パパイヤを加え、折れすぎないよう上下を返しながら叩き、味を全体に行き渡らせます。"},{"order":6,"text":"皿に盛ってピーナッツを散らし、もち米や焼き鳥と合わせる場合は辛味を見ながらすぐ食べます。"}],"source_urls":["https://www.thaifoodguide.com/recipes/som-tam","https://www.templeofthai.com/recipes/papaya_salad.php","https://en.wikipedia.org/wiki/Green_papaya_salad"],"image_url":"/recipe-images/som-tam.webp","photo_source_url":"https://en.wikipedia.org/wiki/Green_papaya_salad","origin_title":"ソムタムの由来","culture_title":"タイの食文化とソムタム","origin_body":"ソムタムは「酸っぱいものを叩く」という意味に結びつく名を持つ青パパイヤのサラダで、ラオスやタイ東北部イーサーンの食文化と深く関係します。臼と杵で材料を叩き、辛味、酸味、塩味、甘味を一体化させる調理法が特徴です。\n\nイーサーンからバンコクなど都市部へ働きに出た人々とともに広まり、現在ではタイ全土の屋台や食堂で見られる料理になりました。青パパイヤの歯ごたえと魚醤、ライム、唐辛子の強い味が、暑い気候の食欲を支えます。\n\n地域によって発酵魚を使うラオス風、干しえびとピーナッツを使う中央タイ風など差があります。単なるサラダではなく、もち米や肉料理と一緒に食べることで一食を構成する料理です。","culture_body":"タイ東北部とラオスの食文化では、もち米を手で丸め、辛いサラダや焼き物を一緒に食べる習慣があります。ソムタムは臼で叩く音や香りも含めて、屋台文化を象徴する料理です。\n\n標準形は魚醤、干しえび、ピーナッツを使うためヴィーガンではなく、甲殻類・落花生に注意が必要です。一方で小麦を使わず、米や野菜と合わせるためグルテンフリーにしやすい料理です。\n\n菜食や宗教上の制限に合わせる場合は、魚醤と干しえびを植物性調味料に替えられます。ただしソムタムらしさは酸味、辛味、甘味、塩味の均衡と青パパイヤの食感にあるため、その軸を保つことが大切です。"},{"slug":"mango-sticky-rice","wiki_page":"Mango sticky rice","source_ref":"curated:mango-sticky-rice","title":"カオニャオ・マムアン","description":"蒸したもち米に甘いココナッツミルクを吸わせ、完熟マンゴーと塩気のあるココナッツソースを添えるタイの代表的なデザートです。","cuisine":"タイ","flag":"🇹🇭","cook_time_min":50,"servings":4,"is_vegan":true,"is_gluten_free":true,"tags":["タイ料理","デザート","もち米","マンゴー","植物性","グルテンフリー"],"ingredients":[{"name_ja":"タイもち米","name_en":"thai sticky rice","quantity":"300g","master_name_en":null,"is_optional":false},{"name_ja":"ココナッツミルク","name_en":"coconut milk","quantity":"300ml","master_name_en":null,"is_optional":false},{"name_ja":"砂糖","name_en":"sugar","quantity":"80g","master_name_en":null,"is_optional":false},{"name_ja":"塩","name_en":"salt","quantity":"小さじ1/2","master_name_en":null,"is_optional":false},{"name_ja":"完熟マンゴー","name_en":"ripe mangoes","quantity":"2個","master_name_en":null,"is_optional":false},{"name_ja":"ムング豆またはごま","name_en":"crispy mung beans or sesame","quantity":"大さじ2","master_name_en":"sesame","is_optional":true},{"name_ja":"米粉または片栗粉","name_en":"rice flour or starch","quantity":"小さじ1","master_name_en":null,"is_optional":true}],"steps":[{"order":1,"text":"もち米を洗って数時間から一晩浸水し、芯まで水を含ませてから蒸し器に広げます。"},{"order":2,"text":"もち米を蒸し、粒が透明感を持ち、指でつぶせる柔らかさになるまで火を通します。"},{"order":3,"text":"ココナッツミルク、砂糖、塩を温めて溶かし、沸騰させすぎず甘じょっぱい液を作ります。"},{"order":4,"text":"蒸したもち米にココナッツ液の大部分を混ぜ、ふたをして米にゆっくり吸わせます。"},{"order":5,"text":"残りのココナッツ液に少量の米粉または片栗粉を加えて軽くとろみをつけ、かけるソースにします。"},{"order":6,"text":"マンゴーを切り、もち米と並べて盛り、ソースと香ばしいトッピングをかけて温度差が出ないうちに提供します。"}],"source_urls":["https://www.thaifoodguide.com/recipes/mango-sticky-rice","https://www.templeofthai.com/recipes/striceman.php","https://en.wikipedia.org/wiki/Mango_sticky_rice"],"image_url":"/recipe-images/mango-sticky-rice.webp","photo_source_url":"https://en.wikipedia.org/wiki/Mango_sticky_rice","origin_title":"カオニャオ・マムアンの由来","culture_title":"タイの食文化とカオニャオ・マムアン","origin_body":"カオニャオ・マムアンは、もち米とマンゴー、ココナッツミルクを組み合わせるタイの代表的なデザートです。マンゴーが豊富になる暑季に特に親しまれ、屋台や市場、家庭で季節の果物を楽しむ料理として広まりました。\n\nもち米を蒸してから甘いココナッツミルクを吸わせることで、米が単なる主食ではなく菓子になります。塩を少し効かせたココナッツソースがマンゴーの甘さを引き締め、米、果物、ココナッツという熱帯の素材を一皿にまとめます。\n\n東南アジアではもち米を主食や菓子に使う地域が多く、タイでも北部・東北部の食文化と深く関係します。観光客にも知られるデザートですが、季節感と米文化を伝える家庭的な料理でもあります。","culture_body":"タイの食文化では、米は食事だけでなく菓子にも使われます。もち米の粘りを手やスプーンで楽しみ、ココナッツと果物の香りを合わせるデザートは、熱帯の気候と市場文化に根ざしています。\n\n標準的な材料はもち米、ココナッツ、砂糖、マンゴーで、乳・卵・小麦を使わないため、ヴィーガンかつグルテンフリーにしやすい料理です。ただしトッピングにごまを使う場合は、ごまアレルギーに注意が必要です。\n\n仏教国のタイでは寺院行事や家庭の供物にも甘い米菓が関わることがあります。カオニャオ・マムアンは華やかな見た目を持ちながら、米を大切にする日常の価値観を表すデザートです。"},{"slug":"larb-gai","wiki_page":"Larb","source_ref":"curated:larb-gai","title":"ラープ・ガイ","description":"鶏ひき肉を炒め、ライム、魚醤、唐辛子、香草、炒り米粉で和えるラオス・タイ東北部系の温かい肉サラダです。","cuisine":"ラオス","flag":"🇱🇦","cook_time_min":30,"servings":3,"is_vegan":false,"is_gluten_free":true,"tags":["ラオス料理","イーサーン料理","鶏肉","香草","グルテンフリー"],"ingredients":[{"name_ja":"鶏ひき肉","name_en":"ground chicken","quantity":"350g","master_name_en":"chicken","is_optional":false},{"name_ja":"もち米または米","name_en":"sticky rice for toasted powder","quantity":"大さじ3","master_name_en":null,"is_optional":false},{"name_ja":"ライム果汁","name_en":"lime juice","quantity":"大さじ3","master_name_en":null,"is_optional":false},{"name_ja":"魚醤","name_en":"fish sauce","quantity":"大さじ2","master_name_en":null,"is_optional":false},{"name_ja":"唐辛子粉","name_en":"chili flakes","quantity":"小さじ1","master_name_en":null,"is_optional":false},{"name_ja":"シャロット","name_en":"shallots","quantity":"2個","master_name_en":null,"is_optional":false},{"name_ja":"ミント","name_en":"mint","quantity":"1つかみ","master_name_en":null,"is_optional":false},{"name_ja":"パクチー","name_en":"cilantro","quantity":"1つかみ","master_name_en":null,"is_optional":false},{"name_ja":"青ねぎ","name_en":"scallions","quantity":"2本","master_name_en":null,"is_optional":false},{"name_ja":"キャベツまたはレタス","name_en":"cabbage or lettuce","quantity":"適量","master_name_en":null,"is_optional":false},{"name_ja":"もち米ご飯","name_en":"sticky rice","quantity":"適量","master_name_en":null,"is_optional":false}],"steps":[{"order":1,"text":"生のもち米または米を乾いたフライパンで茶色く香ばしくなるまで炒り、冷ましてから粗くすりつぶします。"},{"order":2,"text":"鶏ひき肉を少量の水または油でほぐしながら火を通し、肉汁を残してしっとり仕上げます。"},{"order":3,"text":"火を止め、魚醤、ライム果汁、唐辛子粉を加えて、温かい肉に酸味と塩味を吸わせます。"},{"order":4,"text":"薄切りのシャロット、青ねぎ、ミント、パクチーを加え、香草がしおれすぎないよう軽く混ぜます。"},{"order":5,"text":"炒り米粉を加えて全体にまとわせ、香ばしさと軽いとろみで肉汁を受け止めます。"},{"order":6,"text":"キャベツやレタス、もち米ご飯を添え、手で丸めたもち米や葉で少しずつすくって食べます。"}],"source_urls":["https://www.tasteatlas.com/larb-thailand","https://www.bonappetit.com/recipe/larb-gai-chicken-larb","https://en.wikipedia.org/wiki/Larb"],"image_url":"/recipe-images/larb-gai.webp","photo_source_url":"https://en.wikipedia.org/wiki/Larb","origin_title":"ラープ・ガイの由来","culture_title":"ラオスの食文化とラープ・ガイ","origin_body":"ラープはラオス料理を代表する肉または魚のサラダで、タイ東北部イーサーンにも広がっています。細かくした肉にライム、魚醤、唐辛子、香草、炒り米粉を合わせる料理で、米と肉と香草の関係が非常に強い一皿です。\n\nラープ・ガイは鶏肉を使う比較的作りやすい形で、肉を生で食べる地域的な変化もありますが、家庭では火を通して安全に作ることが多くなっています。炒り米粉は単なる香りづけではなく、肉汁を受け止めて全体をまとめる重要な材料です。\n\n「ラープ」という名は幸運を連想させる言葉とも結びつけられ、祝いの席で語られることもあります。もち米と一緒に食べる形式は、ラオスとイーサーンの主食文化を強く表しています。","culture_body":"ラオスではもち米が日常の主食で、手で丸めて汁物やサラダをすくう食べ方が広く見られます。ラープは皿の上のサラダであると同時に、もち米と香草、野菜を合わせて完成する共同の食事です。\n\n鶏肉と魚醤を使うためヴィーガンではありませんが、小麦を使わず、香りづけも炒り米粉で行うためグルテンフリーにしやすい料理です。鶏肉アレルギーや魚醤の魚由来成分には注意が必要です。\n\n仏教行事や家族の集まりでは、肉料理ともち米が人を結びつける役割を持ちます。菜食にする場合はきのこや豆腐を使い、魚醤を植物性調味料に替えつつ、炒り米粉と香草の軸を保つとラープらしさが残ります。"},{"slug":"tom-yum-goong","wiki_page":"Tom yum","source_ref":"curated:tom-yum-goong","title":"トムヤムクン","description":"レモングラス、ガランガル、こぶみかんの葉で香りを出した酸っぱく辛いスープに、えび、きのこ、ライム、魚醤を合わせるタイを代表する汁物です。","cuisine":"タイ","flag":"🇹🇭","cook_time_min":35,"servings":4,"is_vegan":false,"is_gluten_free":true,"tags":["タイ料理","スープ","えび","酸味","グルテンフリー"],"ingredients":[{"name_ja":"えび","name_en":"shrimp","quantity":"300g","master_name_en":"shrimp","is_optional":false},{"name_ja":"えびの殻またはだし","name_en":"shrimp shells or stock","quantity":"800ml分","master_name_en":null,"is_optional":false},{"name_ja":"レモングラス","name_en":"lemongrass","quantity":"2本","master_name_en":null,"is_optional":false},{"name_ja":"ガランガル","name_en":"galangal","quantity":"20g","master_name_en":null,"is_optional":false},{"name_ja":"こぶみかんの葉","name_en":"kaffir lime leaves","quantity":"5枚","master_name_en":null,"is_optional":false},{"name_ja":"ふくろたけまたはしめじ","name_en":"straw mushrooms","quantity":"150g","master_name_en":null,"is_optional":false},{"name_ja":"唐辛子","name_en":"thai chilies","quantity":"3本","master_name_en":null,"is_optional":false},{"name_ja":"ナムプリックパオ","name_en":"thai chili paste","quantity":"大さじ1","master_name_en":null,"is_optional":true},{"name_ja":"魚醤","name_en":"fish sauce","quantity":"大さじ2","master_name_en":null,"is_optional":false},{"name_ja":"ライム果汁","name_en":"lime juice","quantity":"大さじ3","master_name_en":null,"is_optional":false},{"name_ja":"パクチー","name_en":"cilantro","quantity":"適量","master_name_en":null,"is_optional":false}],"steps":[{"order":1,"text":"えびの殻を軽く炒めて水を注ぎ、短時間煮出して甘みのあるだしを取り、殻を濾します。"},{"order":2,"text":"レモングラスを叩いて斜め切りにし、ガランガル、こぶみかんの葉と一緒にだしへ加えて香りを移します。"},{"order":3,"text":"きのこと唐辛子を入れて煮立て、ナムプリックパオを使う場合はここで溶かして辛味とこくを加えます。"},{"order":4,"text":"えびを加え、硬くならないよう色が変わって丸まる程度まで短時間で火を通します。"},{"order":5,"text":"火を止めてから魚醤とライム果汁を加え、酸味の香りが飛ばないよう最後に味を決めます。"},{"order":6,"text":"器に盛ってパクチーを散らし、香味野菜は食べずに香りとして楽しみ、熱いうちにご飯と合わせます。"}],"source_urls":["https://go2-thailand.com/food/tom-yum-goong/","https://en.wikipedia.org/wiki/Tom_yum","https://en.wikipedia.org/wiki/Tom_yum_kung"],"image_url":"/recipe-images/tom-yum-goong.webp","photo_source_url":"https://en.wikipedia.org/wiki/Tom_yum","origin_title":"トムヤムクンの由来","culture_title":"タイの食文化とトムヤムクン","origin_body":"トムヤムは酸味と辛味を持つタイのスープを指し、クンはえびを意味します。中央タイの川や運河の暮らし、淡水・海水のえび、熱帯の香味植物が結びつき、暑い気候でも食欲を刺激する汁物として広まりました。\n\nレモングラス、ガランガル、こぶみかんの葉は食べる具というより香りをスープに移す材料です。魚醤の塩味、ライムの酸味、唐辛子の辛味が一体となり、短時間で作れる一方で香りの出し方が味を大きく左右します。\n\n現在のトムヤムクンはタイ料理を代表する国際的な料理で、透明なナムサイ型やチリペースト・ミルクを加える濃厚な型など差があります。屋台、家庭、レストランで形を変えながら、タイ料理の味の均衡を示すスープとして定着しています。","culture_body":"タイの食卓では、スープは単独で飲むだけでなく、ご飯や複数のおかずと一緒に味の対比を作る役割を持ちます。トムヤムクンは酸味と辛味が強く、油っぽい料理や米の甘さを引き締める存在です。\n\nえびと魚醤を使うためヴィーガンではなく、甲殻類アレルギーに注意が必要です。一方で小麦を使わず、米飯と合わせる構成なのでグルテンフリーにしやすい料理です。市販のチリペーストを使う場合は大豆・小麦・えび成分を確認します。\n\n仏教徒が多いタイでも日常の食卓には魚醤や魚介が広く使われます。菜食にする場合はきのこだし、塩、ライム、ハーブで香りの軸を保ち、えびをきのこや豆腐へ替える調整ができます。"},{"slug":"gado-gado","wiki_page":"Gado-gado","source_ref":"curated:gado-gado","title":"ガドガド","description":"ゆで野菜、じゃがいも、厚揚げ、テンペ、ゆで卵、ロントンに甘辛いピーナッツソースをかけるインドネシアの具だくさんサラダです。","cuisine":"インドネシア","flag":"🇮🇩","cook_time_min":45,"servings":4,"is_vegan":false,"is_gluten_free":true,"tags":["インドネシア料理","野菜料理","ピーナッツ","米餅","グルテンフリー"],"ingredients":[{"name_ja":"じゃがいも","name_en":"potatoes","quantity":"2個","master_name_en":null,"is_optional":false},{"name_ja":"いんげん","name_en":"green beans","quantity":"120g","master_name_en":null,"is_optional":false},{"name_ja":"キャベツ","name_en":"cabbage","quantity":"150g","master_name_en":null,"is_optional":false},{"name_ja":"もやし","name_en":"bean sprouts","quantity":"150g","master_name_en":null,"is_optional":false},{"name_ja":"厚揚げ","name_en":"fried tofu","quantity":"1丁","master_name_en":"soybean","is_optional":false},{"name_ja":"テンペ","name_en":"tempeh","quantity":"150g","master_name_en":null,"is_optional":false},{"name_ja":"ゆで卵","name_en":"boiled eggs","quantity":"2個","master_name_en":"egg","is_optional":false},{"name_ja":"ロントン（米の固め蒸し）","name_en":"lontong rice cake","quantity":"適量","master_name_en":null,"is_optional":false},{"name_ja":"ピーナッツ","name_en":"peanuts","quantity":"120g","master_name_en":"peanut","is_optional":false},{"name_ja":"タマリンド水","name_en":"tamarind water","quantity":"大さじ2","master_name_en":null,"is_optional":false},{"name_ja":"唐辛子とにんにく","name_en":"chili and garlic","quantity":"適量","master_name_en":null,"is_optional":false}],"steps":[{"order":1,"text":"じゃがいも、いんげん、キャベツ、もやしをそれぞれ食感が残るようにゆで、冷まして水気を切ります。"},{"order":2,"text":"厚揚げとテンペを食べやすく切り、表面が香ばしくなるまで焼くか揚げます。"},{"order":3,"text":"ピーナッツを炒ってからすりつぶし、にんにく、唐辛子、タマリンド水、砂糖、塩で濃いソースを作ります。"},{"order":4,"text":"ソースが固い場合は湯を少しずつ加え、野菜に絡むが流れすぎない濃度に調整します。"},{"order":5,"text":"皿に野菜、厚揚げ、テンペ、ロントン、ゆで卵を盛り、食べる直前にピーナッツソースをかけます。"},{"order":6,"text":"全体を軽く混ぜ、米のロントンと野菜、豆製品をソースでつなぎ、常温に近い状態で提供します。"}],"source_urls":["https://en.wikipedia.org/wiki/Gado-gado","https://www.tasteatlas.com/gado-gado","https://borneoorangutansurvival.org/wp-content/uploads/2023/07/BOS-Recipes-Gado-Gado_v1.pdf"],"image_url":"/recipe-images/gado-gado.webp","photo_source_url":"https://en.wikipedia.org/wiki/Gado-gado","origin_title":"ガドガドの由来","culture_title":"インドネシアの食文化とガドガド","origin_body":"ガドガドはインドネシア語で「混ぜ合わせ」を連想させる名を持つ、野菜とピーナッツソースの料理です。ジャワやベタウィの食文化と関係して語られ、ゆで野菜、豆製品、卵、米のロントンを一皿にまとめる実用的な料理として広まりました。\n\nソースの中心はピーナッツで、唐辛子、にんにく、タマリンド、甘味を加えて濃厚に仕上げます。生野菜だけでなく、ゆで野菜や揚げ豆腐を組み合わせるため、サラダでありながら主食に近い満足感があります。\n\nインドネシアにはピーナッツソースを使う料理が多く、サテ、プチェル、カレドックなどと並んで、ガドガドは都市の屋台や家庭で親しまれています。米、豆、野菜を柔軟に組み合わせる群島の食文化をよく示す一皿です。","culture_body":"インドネシアはイスラム教徒が多い国ですが、地域ごとに宗教と食文化が多様です。ガドガドは豚肉を使わず、野菜と豆製品を中心にできるため、多くの食卓に合わせやすい料理です。\n\n標準形は卵とピーナッツ、大豆製品を含むため、ヴィーガンではなく、卵・落花生・大豆アレルギーに注意が必要です。主食は米のロントンで、小麦を使わないため、ケチャップマニスなど小麦を含む調味料を避ければグルテンフリーにしやすい料理です。\n\n菜食にする場合は卵を抜くだけで構成しやすく、テンペや豆腐でたんぱく質を補えます。農産物、豆発酵食品、米を一緒に食べる点に、インドネシアの日常的な栄養バランスが表れています。"},{"slug":"com-tam","wiki_page":"Cơm tấm","source_ref":"curated:com-tam","title":"コムタム・スオン","description":"割れ米を炊いたご飯に、レモングラス風味の焼き豚、魚醤だれ、なます、目玉焼きや卵蒸しを添えるベトナム南部の米料理です。","cuisine":"ベトナム","flag":"🇻🇳","cook_time_min":70,"servings":4,"is_vegan":false,"is_gluten_free":true,"tags":["ベトナム料理","米料理","豚肉","屋台料理","グルテンフリー"],"ingredients":[{"name_ja":"割れ米またはジャスミンライス","name_en":"broken rice","quantity":"2合","master_name_en":null,"is_optional":false},{"name_ja":"豚肩ロースまたは豚ロース","name_en":"pork chop","quantity":"500g","master_name_en":"pork","is_optional":false},{"name_ja":"レモングラス","name_en":"lemongrass","quantity":"2本","master_name_en":null,"is_optional":false},{"name_ja":"にんにく","name_en":"garlic","quantity":"2片","master_name_en":null,"is_optional":false},{"name_ja":"魚醤","name_en":"fish sauce","quantity":"大さじ3","master_name_en":null,"is_optional":false},{"name_ja":"砂糖","name_en":"sugar","quantity":"大さじ2","master_name_en":null,"is_optional":false},{"name_ja":"卵","name_en":"egg","quantity":"2個","master_name_en":"egg","is_optional":true},{"name_ja":"きゅうり","name_en":"cucumber","quantity":"1本","master_name_en":null,"is_optional":false},{"name_ja":"大根とにんじんのなます","name_en":"pickled daikon and carrot","quantity":"適量","master_name_en":null,"is_optional":false},{"name_ja":"ねぎ油","name_en":"scallion oil","quantity":"大さじ2","master_name_en":null,"is_optional":false}],"steps":[{"order":1,"text":"割れ米を洗って通常よりやや少なめの水で炊き、粒がほぐれやすい軽いご飯にします。"},{"order":2,"text":"豚肉を薄めに切り、刻んだレモングラス、にんにく、魚醤、砂糖、油で30分以上漬け込みます。"},{"order":3,"text":"炭火または強火のグリルで豚肉を焼き、表面に甘辛い焼き色をつけながら中まで火を通します。"},{"order":4,"text":"魚醤、砂糖、ライムまたは酢、水、唐辛子を合わせ、甘酸っぱいヌクチャムを作ります。"},{"order":5,"text":"きゅうり、なます、好みで目玉焼きまたは卵蒸しを用意し、ねぎ油を温かいご飯に少量かけます。"},{"order":6,"text":"皿にご飯と焼き豚、副菜を盛り、ヌクチャムを少しずつかけて米に染ませながら食べます。"}],"source_urls":["https://www.vietnamonline.com/entry/com-tam-broken-rice.html","https://www.vietnamtourism.org.vn/sai-gon-street-food-broken-rice-com-tam.html","https://en.wikipedia.org/wiki/C%C6%A1m_t%E1%BA%A5m"],"image_url":"/recipe-images/com-tam.webp","photo_source_url":"https://en.wikipedia.org/wiki/C%C6%A1m_t%E1%BA%A5m","origin_title":"コムタム・スオンの由来","culture_title":"ベトナムの食文化とコムタム・スオン","origin_body":"コムタムは「割れ米」を意味し、精米や運搬の過程で砕けた米粒を活用した南部ベトナムの料理です。もともとは安価な米をおいしく食べる実用的な食事でしたが、サイゴンの屋台文化の中で焼き豚や卵、副菜を添える豊かな一皿に発展しました。\n\n代表的なコムタム・スオンでは、レモングラスや魚醤で下味をつけた豚肉を香ばしく焼き、割れ米の軽い食感に合わせます。ヌクチャム、なます、きゅうり、ねぎ油が加わり、甘味、塩味、酸味、香りが米の上でまとまります。\n\nフランス、中国、南部ベトナムの都市文化の影響を受け、フォークとスプーンで食べる盛り付けも特徴です。質素な米の副産物が、現在では専門店や屋台で人気の料理になった例です。","culture_body":"ベトナム南部の食文化では、米を中心に、魚醤、香草、甘酸っぱいたれ、焼き物を組み合わせます。コムタムは一皿で主食、肉、副菜、たれが揃い、朝食から昼食まで忙しい都市生活に適しています。\n\n豚肉と魚醤、場合によって卵を使うためヴィーガンではありません。豚肉を避ける宗教には適しませんが、小麦を使わない米料理であり、醤油を使わない魚醤ベースのたれならグルテンフリーにしやすい料理です。\n\n菜食対応にする場合は、焼き豚を豆腐やきのこに替え、魚醤だれを植物性の甘酢だれにします。割れ米を無駄なく活かす発想は、米を大切にするベトナムの暮らしと結びついています。"}]$southeast_asian_dishes$::jsonb) as d(
  slug text,
  wiki_page text,
  source_ref text,
  title text,
  description text,
  cuisine text,
  flag text,
  image_url text,
  photo_source_url text,
  cook_time_min int,
  servings int,
  is_vegan boolean,
  is_gluten_free boolean,
  tags jsonb,
  ingredients jsonb,
  steps jsonb,
  source_urls jsonb,
  origin_title text,
  origin_body text,
  culture_title text,
  culture_body text
);

-- Refresh only this migration's managed API recipes. User-owned recipes and other curated dishes are preserved.
delete from public.recipes r
using _southeast_asian_dish_seed d
where r.source_type = 'api'
  and r.source_ref = d.source_ref;

-- Remove orphaned managed ingredient rows for these dishes after targeted recipe deletion.
delete from public.ingredients i
where exists (
    select 1
    from _southeast_asian_dish_seed d
    where i.name_en like d.source_ref || ':%'
  )
  and not exists (
    select 1 from public.recipe_ingredients ri where ri.ingredient_id = i.id
  );

insert into public.recipes (
  source_type,
  source_ref,
  title,
  description,
  cuisine,
  flag,
  image_url,
  cook_time_min,
  servings,
  is_public,
  is_vegan,
  is_gluten_free,
  tags,
  steps
)
select
  'api',
  source_ref,
  title,
  description,
  cuisine,
  flag,
  image_url,
  cook_time_min,
  servings,
  true,
  is_vegan,
  is_gluten_free,
  array(select jsonb_array_elements_text(tags)),
  steps
from _southeast_asian_dish_seed
on conflict (source_type, source_ref) where source_ref is not null do update set
  title = excluded.title,
  description = excluded.description,
  cuisine = excluded.cuisine,
  flag = excluded.flag,
  image_url = excluded.image_url,
  cook_time_min = excluded.cook_time_min,
  servings = excluded.servings,
  is_public = excluded.is_public,
  is_vegan = excluded.is_vegan,
  is_gluten_free = excluded.is_gluten_free,
  tags = excluded.tags,
  steps = excluded.steps;

with ingredient_seed as (
  select distinct
    case
      when coalesce(item ->> 'master_name_en', '') <> '' then item ->> 'master_name_en'
      else d.source_ref || ':ingredient:' || lpad(raw.ordinality::text, 2, '0')
    end as name_en,
    item ->> 'name_ja' as name_ja
  from _southeast_asian_dish_seed d
  cross join lateral jsonb_array_elements(d.ingredients) with ordinality as raw(item, ordinality)
  where coalesce(item ->> 'master_name_en', '') = ''
)
insert into public.ingredients (name_ja, name_en, category)
select name_ja, name_en, '世界料理'
from ingredient_seed
on conflict (name_en) do update set
  name_ja = excluded.name_ja,
  category = excluded.category;

with ingredient_seed as (
  select
    d.source_ref,
    case
      when coalesce(item ->> 'master_name_en', '') <> '' then item ->> 'master_name_en'
      else d.source_ref || ':ingredient:' || lpad(raw.ordinality::text, 2, '0')
    end as name_en,
    item ->> 'name_ja' as display_name_ja,
    item ->> 'quantity' as quantity,
    coalesce((item ->> 'is_optional')::boolean, false) as is_optional
  from _southeast_asian_dish_seed d
  cross join lateral jsonb_array_elements(d.ingredients) with ordinality as raw(item, ordinality)
)
insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, is_optional, display_name_ja)
select r.id, ing.id, s.quantity, s.is_optional, s.display_name_ja
from ingredient_seed s
join public.recipes r
  on r.source_type = 'api'
 and r.source_ref = s.source_ref
join public.ingredients ing
  on ing.name_en = s.name_en
on conflict (recipe_id, ingredient_id) do update set
  quantity = excluded.quantity,
  is_optional = excluded.is_optional,
  display_name_ja = excluded.display_name_ja;

with culture_seed as (
  select source_ref, 'origin'::text as section_key, '由来'::text as label, origin_title as title, origin_body as body, 1 as sort_order
  from _southeast_asian_dish_seed
  union all
  select source_ref, 'food_culture'::text, '食文化'::text, culture_title, culture_body, 2
  from _southeast_asian_dish_seed
)
insert into public.recipe_culture_sections (recipe_id, section_key, label, title, body, sort_order)
select r.id, c.section_key, c.label, c.title, c.body, c.sort_order
from culture_seed c
join public.recipes r
  on r.source_type = 'api'
 and r.source_ref = c.source_ref
on conflict (recipe_id, section_key) do update set
  label = excluded.label,
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  updated_at = now();

with source_seed as (
  select d.source_ref, url.source_url, '調査資料'::text as source_title
  from _southeast_asian_dish_seed d
  cross join lateral jsonb_array_elements_text(d.source_urls) as url(source_url)
  union all
  select source_ref, photo_source_url, '写真出典'::text
  from _southeast_asian_dish_seed
  where photo_source_url is not null and photo_source_url <> ''
)
insert into public.recipe_research_sources (recipe_id, source_url, source_title)
select distinct on (r.id, s.source_url)
  r.id, s.source_url, s.source_title
from source_seed s
join public.recipes r
  on r.source_type = 'api'
 and r.source_ref = s.source_ref
order by
  r.id,
  s.source_url,
  case when s.source_title = '写真出典' then 0 else 1 end
on conflict (recipe_id, source_url) do update set
  source_title = excluded.source_title;
