// ── Symbol library, sorted by category ───────────────────────────
// Used by ink-fx.js for click effects. Add or remove freely:
// single symbols go in the space-separated strings, anything that
// contains its own spaces goes in the extra [ ... ] list.
(function () {
  'use strict';

  function words(s) { return s.split(/\s+/).filter(Boolean); }

  var LIB = {
    hearts: words(
      '♡ ♥ ❥ ❣ ღ ෆ ᰔ ᰔᩚ ᥫ᭡ ꨄ ᡣ𐭩 𓆩♡𓆪 ୨୧ ౨ৎ 𐙚 ʚɞ ʚ♡ɞ ♡̆̈ ♡̷ ♡̩͙ ♡˖*° ♡﹆ ˚◞♡ 𓂃♡ ' +
      '♡⃕ ♡̶ ♡ྀི ୨♡୧ ♡₊˚ ♡⃗ ❦ ❧ ☙'
    ).concat(['꒰ა ♡ ໒꒱', '♡ ⊸ ꒰ ❛ ❜ ꒱']),

    stars: words(
      '✦ ✧ ✩ ✪ ✫ ✬ ✭ ✮ ✯ ✰ ✱ ✲ ✳ ✴ ✵ ✶ ✷ ✸ ✹ ✺ ✻ ✼ ✽ ✾ ✿ ❀ ❁ ❃ ⋆ ★ ☆ ⭒ ⊹ ⁺ ₊ ˚ ° ｡ ' +
      '꙳ ⟡ ⟢ ⟣ 𖤐 𖦹 𖥔 𖣔 ⋆｡˚ ✧‧₊˚ ˳✧༚ ₊˚⊹ ✩‧₊˚ ⋆⁺₊⋆'
    ),

    faces: words('◡̈ ◡̎ ◡̉̈ ◡◡ ˘͈ᵕ˘͈ ·͜·♡ ᐧ༚̮ᐧ ˙ᴥ˙ ⍤ ツ ʬʬʬ ^^')
      .concat(['˙ᘧ ͜ ˙', 'ᕐ ̆̈͜͡ ᕐ', '･ ͜ʖ ･']),

    kaomoji: [
      '(˶ᵔ ᵕ ᵔ˶)', '(˶˃ ᵕ ˂˶)', '(՞ ܸ. .ܸ՞)', '(｡•ᴗ•｡)', '(◕‿◕)', '(ᴗ͈ˬᴗ͈)', '(๑>◡<๑)',
      '(ㅅ´ ˘ `)', '(´｡• ᵕ •｡`)', '(⸝⸝> ᴗ <⸝⸝)', '(˶>⩊<˶)', '(ᵕ—ᴗ—)', '(❀´ ˘ `❀)',
      '(๑ᵔ⤙ᵔ๑)', '(˶ˆᗜˆ˵)', '(づ｡◕‿‿◕｡)づ', '(╥﹏╥)', '(⁄ ⁄•⁄ω⁄•⁄ ⁄)', '(๑˃̵ᴗ˂̵)و',
      '( ˘ ³˘)♥', '(｡♥‿♥｡)'
    ],

    animals: words(
      'ᙏ̤̫ ᙏ̤̥ ᘏ⑅ᘏ ฅ^•ﻌ•^ฅ (=^･ω･^=) (=ↀωↀ=) ʕ•ᴥ•ʔ ʕ·͡ˑ·ཻʔ ʕっ•ᴥ•ʔっ ₍ᐢ•ﻌ•ᐢ₎ ' +
      '/ᐠ｡ꞈ｡ᐟ\\ ᓚᘏᗢ ʕ•́ᴥ•̀ʔ'
    ).concat(['૮₍ ˶•⤙•˶ ₎ა', '૮₍ ´ ꒳ `₎ა', 'ᐢ. .ᐢ', '₍ᐢ. ̫.ᐢ₎', '૮꒰ ˶• ༝ •˶꒱ა', '૮₍ ˃ ⤙ ˂ ₎ა']),

    nature: words(
      '𓇼 𓂂 𓏸 𓈒 𓐍 𓍯 𓍲 𓍱 𓆉 𓆝 𓆟 𓆞 𓆡 𓇢 𓇬 𓇣 𓇗 𓋼 𓍊 𓋼𓍊 ❀ ✿ ❁ ❃ ꕤ ꕥ ⚘ ☘ ❦ ❧ ' +
      '𖤣 𖥧 𖡼 𖤥 𖦥 𖠚ᐝ 𓌈˒˒ 𓎩 𓌉 𓇋'
    ),

    sky: words(
      '☾ ☽ ☼ ☀ ☁ ☂ ☃ ☄ ☇ ☈ ☉ ☊ ☋ ☌ ☍ ☿ ♀ ♂ ♄ ♃ ♆ ♇ ☪ ☯ ☸ ☯︎ ☮ ☄︎ ☃︎ ❄ ❅ ❆ ✵ ✶ ✷ ' +
      '☾⋆⁺₊✧ ⋆｡˚☁︎˚｡⋆'
    ),

    arrows: words(
      '→ ← ↑ ↓ ↗ ↘ ↙ ↖ ↔ ↕ ↝ ↜ ↞ ↠ ↟ ↡ ↣ ↢ ↦ ↤ ↪ ↩ ↬ ↫ ↭ ↯ ⇢ ⇠ ⇡ ⇣ ⇝ ⇜ ⇨ ⇦ ➜ ➝ ➞ ' +
      '➟ ➠ ➤ ➥ ➦ ➳ ➵ ➶ ➷ ➸ ➹ ➺ ➻ ➼ ➽ ➾ ⤾ ⤿ ⤷ ⤶ ⤴ ⤵ ⟶ ⟵ ⟷ ⊸'
    ),

    japanese: words(
      'あ い う え お の ん ゆ ね ぬ ふ み も め ら り る ろ っ ッ シ ツ ソ ノ ミ メ ム ヲ ヨ ㋡ ㋛ ' +
      '㊗ ㊙ 々 〆 〃 〄 〠 〰 〽 〜 ・ ･ ｡ 「 」 『 』 【 】 〖 〗 〈 〉 《 》 〔 〕 〘 〙 〚 〛'
    ),

    korean: words(
      'ㅇ ㅎ ㅅ ㅆ ㅁ ㅂ ㅃ ㄱ ㄴ ㄷ ㄹ ㅈ ㅊ ㅋ ㅌ ㅍ ㅠ ㅜ ㅡ ㅣ ㅏ ㅓ ㅗ ㅛ ㅕ ㅑ ㅐ ㅔ ㅢ ㆁ ㆆ ㆍ ' +
      'ᄋ ᄒ ᄉ ᄆ ᄂ ᄀ ᄃ ᄅ'
    ),

    thai: words(
      '๏ ๚ ๛ ๎ ์ ฯ ฿ ๅ ๋ ๊ ่ ้ ะ ำ ิ ี ึ ื ุ ู เ แ โ ใ ไ ๐ ๑ ๒ ๓ ๔ ๕ ๖ ๗ ๘ ๙ ༄ ࿔ ꧁ ꧂ ' +
      'ᨀ ᨁ ᨂ ᨃ ᨄ ᩚ ᨼ ᯤ ᯅ ᯭ ᰔ'
    ),

    tibetan: words(
      'ༀ ༁ ༂ ༃ ༄ ༅ ༆ ༇ ༈ ༉ ༊ ་ ༌ ། ༎ ༏ ༐ ༑ ༒ ༓ ༔ ༕ ༖ ༗ ༘ ༙ ༚ ༛ ༜ ༝ ༞ ༟ ༴ ༵ ༶ ༷ ༸ ' +
      '༹ ༺ ༻ ༼ ༽ ࿓ ࿔ ࿕ ࿖ ࿗ ࿘'
    ),

    indic: words(
      'ॐ ॰ ऽ ँ ं ः ॱ ॲ ॻ ॼ ॽ ॾ ॿ । ॥ ॑ ॒ ॓ ॔ ॕ ॖ ॗ ॢ ॣ ॺ ॸ ळ ष ह अ आ इ ई उ ऊ ऋ ए ऐ ओ औ ' +
      'क ख ग घ च छ ज झ ञ ट ठ ड ढ ण त थ द ध न प फ ब भ म य र ल व श स'
    ),

    sinhala: words(
      'ෆ ෴ ෳ ෲ ෟ ෞ ෙ ේ ෛ ො ෝ ං ඃ අ ආ ඇ ඈ ඉ ඊ උ ඌ එ ඒ ඓ ඔ ඕ ඖ ක ග ඟ ච ජ ඤ ත ද න ප බ ' +
      'ම ය ර ල ව ස හ ළ'
    ),

    georgian: words(
      'ღ ჻ ჼ ჽ ჾ ჿ ა ბ გ დ ე ვ ზ თ ი კ ლ მ ნ ო პ ჟ რ ს ტ უ ფ ქ ყ შ ჩ ც ძ წ ჭ ხ ჯ ჰ ' +
      'Ⴀ Ⴁ Ⴂ Ⴃ Ⴄ Ⴅ Ⴆ Ⴇ Ⴈ Ⴉ'
    ),

    greek: words(
      'α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω ϑ ϕ ϖ ϰ ϱ ϵ ϶ ϟ ϡ Ж ж Я я Д д Ф ф ' +
      'Ц ц Ч ч Ш ш Щ щ Ъ ъ Ы ы Ь ь Э э Ю ю Ѧ Ѫ Ѭ Ѯ Ѱ Ѳ Ѵ'
    ),

    arabic: words(
      '۞ ۩ ۝ ۜ ۟ ۠ ۡ ۢ ۣ ۤ ۥ ۦ ۧ ۨ ۬ ۭ ؀ ؁ ؂ ؃ ؄ ؎ ؏ ؞ ؟ ء آ أ إ ؤ ئ ا ب ت ث ج ح خ د ذ ر ز ' +
      'س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي ے'
    ),

    hebrew: words('א ב ג ד ה ו ז ח ט י כ ל מ נ ס ע פ צ ק ר ש ת ׀ ׃ ׆ ׇ ־ ׅ ּ ֽ ֿ ׁ ׂ ׄ ׳ ״'),

    egyptian: words(
      '𓀀 𓀁 𓀂 𓀃 𓀄 𓁐 𓁹 𓂀 𓂃 𓂋 𓃠 𓃰 𓄿 𓅓 𓆣 𓆤 𓇋 𓈖 𓉐 𓊖 𓋹 𓌳 𓎛 𓏏 𓏤 𓐍 𓀠 𓃭'
    ),

    runes: words(
      'ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ ᛝ ᛡ ᛣ ᛥ ᛦ ᛨ ᛩ ᛪ ᛫ ᛬ ᛭'
    ),

    dots: words(
      '· • ‧ ∙ ⋅ ∘ ◦ ○ ◌ ◍ ◎ ◉ ⊙ ⊚ ⊛ ⊜ ⊝ ⊞ ⊟ ⊕ ⊖ ⊗ ⊘ ◇ ◆ ◈ ◊ ⬡ ⬢ ⬣ ▫ ▪ □ ■ ▢ ▣ ▤ ▥ ' +
      '▦ ▧ ▨ ▩ ⌇ ⌁ ⌑ ⌗ ⌘ ⌖ ⌕ ⌔'
    ),

    writing: words(
      '✎ ✏ ✐ ✑ ✒ ✍ ✁ ✂ ✃ ✄ ✓ ✔ ✕ ✖ ✗ ✘ ☑ ☒ ☐ ☞ ☜ ☝ ☟ ☛ ☚ ✉ ✆ ☏ ☎ ♫ ♪ ♩ ♬ ♭ ♮ ♯ ' +
      '♔ ♕ ♖ ♗ ♘ ♙ ♚ ♛ ♜ ♝ ♞ ♟'
    ),

    dividers: [
      '── ⋆⋅☆⋅⋆ ──', '୨୧・┈・┈・୨୧', '⋆｡°✩ ⋆｡°✩', '꒰ঌ 𓂃 ♡ 𓂃 ໒꒱', '˚₊‧꒰ა ☆ ໒꒱ ‧₊˚',
      '𓂃 ࣪˖ ִֶָ𐀔 ♡', '✦ ⋆ ｡ ˚ ☾ ˚ ｡ ⋆ ✦', '❀ ⋆ ✿ ⋆ ❀', '♡ ⌇ ꨄ ⌇ ♡', '༄ ⁺ ˚ ⊹ ˚ ⁺ ༄',
      '𓇼𓂃◌𓈒𓐍𓇼', '❅*⋆ ↟.｡.:*', '-ˋˏ ♡ ˎˊ-', '⋆˚࿔ 𝜗𝜚 𝜚˚⋆'
    ]
  };

  // Drop entries that are only combining marks (vowel signs, tone marks…):
  // on their own they render as a dotted circle.
  var markOnly;
  try { markOnly = new RegExp('^[\\p{M}\\u200c\\u200d]+$', 'u'); } catch (e) { markOnly = null; }
  Object.keys(LIB).forEach(function (k) {
    var seen = {};
    LIB[k] = LIB[k].filter(function (s) {
      if (!s || seen[s]) return false;
      seen[s] = 1;
      return !(markOnly && markOnly.test(s));
    });
  });

  // Which categories clicks draw from most: the soft, cute ones lead,
  // the alphabets appear now and then.
  var WEIGHTS = {
    hearts: 7, stars: 7, kaomoji: 6, animals: 5, faces: 4, nature: 5, sky: 5, dividers: 3,
    arrows: 1, dots: 1, writing: 1,
    japanese: 1, korean: 1, thai: 1, tibetan: 1, indic: 1, sinhala: 1, georgian: 1,
    greek: 1, arabic: 1, hebrew: 1, egyptian: 2, runes: 1
  };

  window.InkSymbols = { LIB: LIB, WEIGHTS: WEIGHTS };
})();
