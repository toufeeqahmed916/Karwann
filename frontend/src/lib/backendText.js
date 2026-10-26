// Translates text that arrives from the API (allocation reasons, scenario notes, error messages, place names)
// into Urdu ("ur") or Sindhi ("sd"). English text is always returned as-is.
// Anything this file does not recognise (for example text typed by a user) is returned unchanged,
// so nothing is ever lost or made up.

import { canonicalPlace } from "./placeNames.js";

const PLACES = {
  ur: {
    Badin: "بدین", Dadu: "دادو", Gambat: "گمبٹ", Hyderabad: "حیدرآباد", Jacobabad: "جیکب آباد", Karachi: "کراچی", Khairpur: "خیرپور",
    Kotri: "کوٹری", Larkana: "لاڑکانہ", Matiari: "مٹیاری", Mirpurkhas: "میرپورخاص", Nawabshah: "نواب شاہ",
    Sanghar: "سانگھڑ", Sehwan: "سیہون", Sukkur: "سکھر", "Tando Allahyar": "ٹنڈو الہ یار", Thatta: "ٹھٹھہ", Sindh: "سندھ",
  },
  sd: {
    Badin: "بدين", Dadu: "دادو", Gambat: "گمبٽ", Hyderabad: "حيدرآباد", Jacobabad: "جيڪب آباد", Karachi: "ڪراچي", Khairpur: "خيرپور",
    Kotri: "ڪوٽڙي", Larkana: "لاڙڪاڻو", Matiari: "مٽياري", Mirpurkhas: "ميرپورخاص", Nawabshah: "نواب شاهه",
    Sanghar: "سانگهڙ", Sehwan: "سيوهڻ", Sukkur: "سکر", "Tando Allahyar": "ٽنڊو الهيار", Thatta: "ٺٽو", Sindh: "سنڌ",
  },
};

// Words used when a place or vehicle name is built from parts (for example "Hyderabad Depot", "Truck 3").
const WORDS = {
  ur: { depot: "ڈپو", truck: "ٹرک" },
  sd: { depot: "ڊپو", truck: "ٽرڪ" },
};

const ITEMS = {
  ur: { food: "خوراک", water: "پانی", medicine: "دوائیں", shelter: "پناہ گاہ کٹس", "shelter kits": "پناہ گاہ کٹس" },
  sd: { food: "کاڌو", water: "پاڻي", medicine: "دوائون", shelter: "پناهه ڪٽس", "shelter kits": "پناهه ڪٽس" },
};

const SENTENCES = {
  ur: {
    "Depot daily capacity was reached.": "ڈپو کی یومیہ گنجائش پوری ہو گئی۔",
    "Stock is short, so supply was shared by priority score.": "ذخیرہ کم ہے، اس لیے سامان ترجیحی اسکور کے مطابق تقسیم کیا گیا۔",
    "A blocked zone added a distance penalty.": "بند علاقے کی وجہ سے فاصلے میں اضافہ کیا گیا۔",
    "The nearest available depot can meet this share.": "سب سے قریبی دستیاب ڈپو یہ حصہ پورا کر سکتا ہے۔",
    "No stock available at any depot.": "کسی بھی ڈپو میں ذخیرہ دستیاب نہیں۔",
    "Reduced stock changes how limited supplies are shared.": "ذخیرہ کم ہونے سے محدود سامان کی تقسیم بدل جاتی ہے۔",
    "Additional stock allows more requests to be fulfilled.": "اضافی ذخیرے سے مزید درخواستیں پوری کی جا سکتی ہیں۔",
    "Higher affected population changes demand priority.": "متاثرہ آبادی بڑھنے سے مانگ کی ترجیح بدل جاتی ہے۔",
    "Higher affected population increases demand and priority.": "متاثرہ آبادی بڑھنے سے مانگ اور ترجیح بڑھ جاتی ہے۔",
    "The new request competes for the same limited resources.": "نئی درخواست انہی محدود وسائل میں حصہ مانگتی ہے۔",
    "Depot capacity changes the amount that can be dispatched today.": "ڈپو کی گنجائش بدلنے سے آج روانہ کی جا سکنے والی مقدار بدل جاتی ہے۔",
    "The blocked zone increases access difficulty and travel distance.": "بند علاقے سے رسائی مشکل اور سفر کا فاصلہ زیادہ ہو جاتا ہے۔",
    "The blocked zone increases access difficulty for nearby requests.": "بند علاقے سے قریبی درخواستوں کے لیے رسائی مشکل ہو جاتی ہے۔",
    "The scenario changed the recommended allocation.": "اس منظرنامے نے تجویز کردہ تقسیم کو بدل دیا۔",
  },
  sd: {
    "Depot daily capacity was reached.": "ڊپو جي روزاني گنجائش پوري ٿي وئي.",
    "Stock is short, so supply was shared by priority score.": "ذخيرو گهٽ آهي، تنهنڪري سامان ترجيحي اسڪور مطابق ورهايو ويو.",
    "A blocked zone added a distance penalty.": "بند علائقي سبب فاصلو وڌايو ويو.",
    "The nearest available depot can meet this share.": "سڀ کان ويجهو موجود ڊپو هي حصو پورو ڪري سگهي ٿو.",
    "No stock available at any depot.": "ڪنهن به ڊپو ۾ ذخيرو موجود ناهي.",
    "Reduced stock changes how limited supplies are shared.": "ذخيرو گهٽجڻ سان محدود سامان جي ورهاست بدلجي ٿي.",
    "Additional stock allows more requests to be fulfilled.": "اضافي ذخيري سان وڌيڪ درخواستون پوريون ٿي سگهن ٿيون.",
    "Higher affected population changes demand priority.": "متاثر ماڻهن جو تعداد وڌڻ سان گهر جي ترجيح بدلجي ٿي.",
    "Higher affected population increases demand and priority.": "متاثر ماڻهن جو تعداد وڌڻ سان گهر ۽ ترجيح وڌي ٿي.",
    "The new request competes for the same limited resources.": "نئين درخواست ساڳين محدود وسيلن ۾ حصو گهري ٿي.",
    "Depot capacity changes the amount that can be dispatched today.": "ڊپو جي گنجائش بدلجڻ سان اڄ موڪلي سگهجندڙ مقدار بدلجي ٿي.",
    "The blocked zone increases access difficulty and travel distance.": "بند علائقي سبب پهچڻ ڏکيو ٿئي ٿو ۽ سفر جو فاصلو وڌي ٿو.",
    "The blocked zone increases access difficulty for nearby requests.": "بند علائقي سبب ويجهين درخواستن لاءِ پهچڻ ڏکيو ٿئي ٿو.",
    "The scenario changed the recommended allocation.": "هن منظرنامي تجويز ڪيل ورهاست کي بدلائي ڇڏيو.",
  },
};

const MESSAGES = {
  ur: {
    "Request failed": "درخواست ناکام ہو گئی۔",
    "Failed to fetch": "سرور سے رابطہ نہیں ہو سکا۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔",
    "Load failed": "سرور سے رابطہ نہیں ہو سکا۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔",
    "NetworkError when attempting to fetch resource.": "سرور سے رابطہ نہیں ہو سکا۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔",
    "Pick a location on the map": "نقشے پر مقام منتخب کریں۔",
    "Population must be greater than 0": "متاثرہ افراد کی تعداد 0 سے زیادہ ہونی چاہیے۔",
    "Add at least one supply": "کم از کم ایک سامان شامل کریں۔",
    "Request not found": "درخواست نہیں ملی۔",
    "Depot not found": "ڈپو نہیں ملا۔",
    "Inventory item not found": "ذخیرے کی مد نہیں ملی۔",
    "Vehicle not found": "گاڑی نہیں ملی۔",
    "Delivery not found": "ترسیل نہیں ملی۔",
    "Road block not found": "بند راستہ نہیں ملا۔",
    "Route endpoints not found": "راستے کے مقامات نہیں ملے۔",
    "Weights must add up to 100%": "وزن کا مجموعہ 100 فیصد ہونا چاہیے۔",
    "Enter a quantity and reason": "مقدار اور وجہ درج کریں۔",
    "Daily capacity must be 0 or more": "یومیہ گنجائش 0 یا اس سے زیادہ ہونی چاہیے۔",
    "Enter a vehicle name and valid capacity": "گاڑی کا نام اور درست گنجائش درج کریں۔",
    "Invalid vehicle status": "گاڑی کی حالت درست نہیں۔",
    "Generate an allocation first": "پہلے تقسیم تیار کریں۔",
    "Generate an allocation before approving it": "منظوری سے پہلے تقسیم تیار کریں۔",
    "The selected request has no supplies available to approve": "منتخب درخواست کے لیے منظوری کے قابل کوئی سامان نہیں۔",
    "Stock changed after this recommendation. Regenerate the allocation.": "اس تجویز کے بعد ذخیرہ بدل گیا۔ تقسیم کو تازہ کریں۔",
    "Recalculate a scenario first": "پہلے منظرنامے کا دوبارہ حساب لگائیں۔",
    "Recalculate a scenario before applying it": "لاگو کرنے سے پہلے منظرنامے کا دوبارہ حساب لگائیں۔",
    "There is no pending scenario to undo": "واپس کرنے کے لیے کوئی زیرِ التوا منظرنامہ نہیں۔",
    "No truck is available for this allocation": "اس تقسیم کے لیے کوئی ٹرک دستیاب نہیں۔",
    "Selected deliveries are not ready to start": "منتخب ترسیلات شروع کرنے کے لیے تیار نہیں۔",
    "The assigned vehicle already has a delivery in transit": "مقرر گاڑی پہلے ہی ایک ترسیل پر ہے۔",
    "Start the trip before marking it delivered": "پہنچا دیا گیا کا نشان لگانے سے پہلے سفر شروع کریں۔",
    "At least one supply item is required": "کم از کم ایک سامان درکار ہے۔",
    "Dashboard is unavailable.": "ڈیش بورڈ دستیاب نہیں۔",
  },
  sd: {
    "Request failed": "درخواست ناڪام ٿي وئي.",
    "Failed to fetch": "سرور سان رابطو نه ٿي سگهيو. انٽرنيٽ چيڪ ڪري ٻيهر ڪوشش ڪريو.",
    "Load failed": "سرور سان رابطو نه ٿي سگهيو. انٽرنيٽ چيڪ ڪري ٻيهر ڪوشش ڪريو.",
    "NetworkError when attempting to fetch resource.": "سرور سان رابطو نه ٿي سگهيو. انٽرنيٽ چيڪ ڪري ٻيهر ڪوشش ڪريو.",
    "Pick a location on the map": "نقشي تي جڳهه چونڊيو.",
    "Population must be greater than 0": "متاثر ماڻهن جو تعداد 0 کان وڌيڪ هجڻ گهرجي.",
    "Add at least one supply": "گهٽ ۾ گهٽ هڪ سامان شامل ڪريو.",
    "Request not found": "درخواست نه ملي.",
    "Depot not found": "ڊپو نه ملي.",
    "Inventory item not found": "ذخيري جي مد نه ملي.",
    "Vehicle not found": "گاڏي نه ملي.",
    "Delivery not found": "ترسيل نه ملي.",
    "Road block not found": "بند رستو نه ملي.",
    "Route endpoints not found": "رستي جون جڳهون نه مليون.",
    "Weights must add up to 100%": "وزن جو مجموعو 100 سيڪڙو هجڻ گهرجي.",
    "Enter a quantity and reason": "مقدار ۽ سبب داخل ڪريو.",
    "Daily capacity must be 0 or more": "روزاني گنجائش 0 يا ان کان وڌيڪ هجڻ گهرجي.",
    "Enter a vehicle name and valid capacity": "گاڏي جو نالو ۽ صحيح گنجائش داخل ڪريو.",
    "Invalid vehicle status": "گاڏي جي حالت صحيح ناهي.",
    "Generate an allocation first": "پهرين ورهاست تيار ڪريو.",
    "Generate an allocation before approving it": "منظوري کان اڳ ورهاست تيار ڪريو.",
    "The selected request has no supplies available to approve": "چونڊيل درخواست لاءِ منظوري جوڳو ڪو سامان ناهي.",
    "Stock changed after this recommendation. Regenerate the allocation.": "هن تجويز کان پوءِ ذخيرو بدلجي ويو. ورهاست کي تازو ڪريو.",
    "Recalculate a scenario first": "پهرين منظرنامي جو ٻيهر حساب ڪريو.",
    "Recalculate a scenario before applying it": "لاڳو ڪرڻ کان اڳ منظرنامي جو ٻيهر حساب ڪريو.",
    "There is no pending scenario to undo": "واپس ڪرڻ لاءِ ڪو التوا ۾ منظرنامو ناهي.",
    "No truck is available for this allocation": "هن ورهاست لاءِ ڪو ٽرڪ موجود ناهي.",
    "Selected deliveries are not ready to start": "چونڊيل ترسيلون شروع ڪرڻ لاءِ تيار ناهن.",
    "The assigned vehicle already has a delivery in transit": "مقرر ڪيل گاڏي اڳ ئي هڪ ترسيل تي آهي.",
    "Start the trip before marking it delivered": "پهچايو ويو جو نشان لڳائڻ کان اڳ سفر شروع ڪريو.",
    "At least one supply item is required": "گهٽ ۾ گهٽ هڪ سامان گهربل آهي.",
    "Dashboard is unavailable.": "ڊيش بورڊ موجود ناهي.",
  },
};

// Sentence patterns that carry numbers or names, one per language.
const PATTERNS = {
  ur: {
    reason: ({ item, need, qty, pct, depot, km, rest }) => `${item}: ${need} میں سے ${qty} (${pct}%)۔ ${depot} سب سے قریب ہے (${km} کلومیٹر)۔ ${rest}`,
    trips: (n) => `${n} گاڑی کے چکر درکار ہیں۔`,
    noUsable: (item) => `${item} کا قابلِ استعمال ذخیرہ، ڈپو کی گنجائش یا دستیاب گاڑی موجود نہیں۔`,
    noVehicle: (depot) => `${depot} میں ذخیرہ موجود ہے مگر کوئی گاڑی دستیاب نہیں۔`,
    onlyUnits: (n) => `صرف ${n} یونٹ دستیاب ہیں۔`,
    applied: "سمیولیٹر کی تبدیلی لاگو کی گئی۔",
    nearbyDuplicate: (n) => `24 گھنٹوں میں ملتی جلتی جگہ سے ${n} درخواست${Number(n) === 1 ? "" : "یں"} آئی${Number(n) === 1 ? "" : "ں"}۔`,
    similarText: (percent, area) => `شکایت کا متن ${area} کی ایک درخواست سے ${percent}% ملتا جلتا ہے۔`,
    sameNetwork: (n) => `ایک ہی نیٹ ورک سے 24 گھنٹوں میں ${n} درخواستیں آئیں۔`,
  },
  sd: {
    reason: ({ item, need, qty, pct, depot, km, rest }) => `${item}: ${need} مان ${qty} (${pct}%). ${depot} سڀ کان ويجهو آهي (${km} ڪلوميٽر). ${rest}`,
    trips: (n) => `${n} گاڏي جا چڪر گهربل آهن.`,
    noUsable: (item) => `${item} جو استعمال جوڳو ذخيرو، ڊپو جي گنجائش يا موجود گاڏي ناهي.`,
    noVehicle: (depot) => `${depot} ۾ ذخيرو موجود آهي پر ڪا گاڏي موجود ناهي.`,
    onlyUnits: (n) => `رڳو ${n} يونٽ موجود آهن.`,
    applied: "سميوليٽر جي تبديلي لاڳو ڪئي وئي.",
    nearbyDuplicate: (n) => (Number(n) === 1 ? `24 ڪلاڪن اندر ساڳي جڳهه تان 1 درخواست آئي.` : `24 ڪلاڪن اندر ساڳي جڳهه تان ${n} درخواستون آيون.`),
    similarText: (percent, area) => `شڪايت جو متن ${area} جي هڪ درخواست سان ${percent}% ملندڙ جلندڙ آهي.`,
    sameNetwork: (n) => `هڪ ئي نيٽ ورڪ تان 24 ڪلاڪن اندر ${n} درخواستون آيون.`,
  },
};

export function translatePlace(name, lang) {
  if (typeof name !== "string") return name;
  const trimmed = name.trim();
  // A place saved in Urdu or Sindhi script is first recognised as its English name, then shown in the chosen language.
  const depot = trimmed.match(/^(.+?)\s*(?:Depot|ڈپو|ڊپو)$/i);
  const english = canonicalPlace(depot ? depot[1] : trimmed) ?? (depot ? depot[1].trim() : trimmed);
  if (lang === "en") return depot ? `${english} Depot` : (canonicalPlace(trimmed) ?? name);
  const places = PLACES[lang];
  if (!places) return name;
  if (depot) return `${places[english] ?? english} ${WORDS[lang].depot}`;
  if (places[english]) return places[english];
  const truck = trimmed.match(/^Truck\s+(\d+)$/i);
  if (truck) return `${WORDS[lang].truck} ${truck[1]}`;
  const vehicleId = trimmed.match(/^veh_0*(\d+)$/i);
  if (vehicleId) return `${WORDS[lang].truck} ${vehicleId[1]}`;
  return name;
}

function translateSentences(text, lang) {
  let out = text;
  for (const [english, translated] of Object.entries(SENTENCES[lang])) out = out.split(english).join(translated);
  return out.replace(/(\d+) vehicle trips are required\./g, (_, n) => PATTERNS[lang].trips(n));
}

export function translateText(text, lang) {
  const messages = MESSAGES[lang];
  if (!messages || typeof text !== "string" || !text) return text;
  const clean = text.trim();
  const items = ITEMS[lang];
  const itemName = (word) => items[String(word).toLowerCase()] ?? word;
  const patterns = PATTERNS[lang];

  if (messages[clean]) return messages[clean];
  if (SENTENCES[lang][clean]) return SENTENCES[lang][clean];

  // "Water: 320 of 500 (64%). Hyderabad Depot is nearest (142 km). <limits>"
  const reason = clean.match(/^(\w[\w ]*?): ([\d,]+) of ([\d,]+) \((\d+)%\)\. (.+?) is nearest \((\d+) km\)\.\s*(.*)$/);
  if (reason) {
    const [, item, qty, need, pct, depot, km, rest] = reason;
    return patterns.reason({
      item: itemName(item), qty, need, pct, depot: translatePlace(depot, lang), km, rest: translateSentences(rest, lang),
    }).trim();
  }

  const noStock = clean.match(/^No usable (\w+) stock, depot capacity, or available vehicle\.$/);
  if (noStock) return patterns.noUsable(itemName(noStock[1]));

  const noVehicle = clean.match(/^(.+?) has stock, but no vehicle is available\.$/);
  if (noVehicle) return patterns.noVehicle(translatePlace(noVehicle[1], lang));

  const onlyUnits = clean.match(/^Only ([\d,]+) units are available$/);
  if (onlyUnits) return patterns.onlyUnits(onlyUnits[1]);

  if (/^Applied simulator action: \w+$/.test(clean)) return patterns.applied;

  // Suspicious-request review reasons (written by the backend in English)
  const nearby = clean.match(/^(\d+) similar location requests? submitted within 24 hours$/);
  if (nearby) return patterns.nearbyDuplicate(nearby[1]);
  const similar = clean.match(/^Complaint text is (\d+)% similar to a request from (.+)$/);
  if (similar) return patterns.similarText(similar[1], translatePlace(similar[2], lang));
  const network = clean.match(/^The same network submitted (\d+) requests within 24 hours$/);
  if (network) return patterns.sameNetwork(network[1]);

  if (/[.]/.test(clean)) {
    const converted = translateSentences(clean, lang);
    if (converted !== clean) return converted;
  }
  return text;
}
