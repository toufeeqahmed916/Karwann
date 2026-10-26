/**
 * Karwan translations.
 * Mini markup used in some strings:
 *   "|"      -> line break
 *   "*text*" -> highlighted <span>text</span>
 * Rendered by the rich() helper inside Karwan.jsx
 */

export const translations = {
  en: {
    dir: "ltr",
    langButton: "اردو",
    langButtonLabel: "Switch to Urdu",
    pageTitle: "Karwan — Relief, delivered with purpose",
    brand: "karwan",
    tag: "RELIEF OS",
    brandLabel: "Karwan home",
    nav: {
      platform: "Platform",
      how: "How it works",
      impact: "Our impact",
      demo: "Live demo",
    },
    submit: "Submit a request",
    submitHero: "Submit a request ↗",
    openMenu: "Open menu",

    slides: [
      {
        title: "Right help.|*Right place.*|Right now.",
        desc: "When every minute matters, Karwan helps relief teams make clearer decisions and move essential supplies where they can make the biggest difference.",
        stat: "12 locations",
        label: "connected across flood-affected Sindh",
      },
      {
        title: "When needs rise,|*clarity matters.*",
        desc: "Bring urgent requests, stock levels and delivery capacity into one shared operational picture.",
        stat: "4 supply types",
        label: "food · water · medicine · shelter kits",
      },
      {
        title: "Every request|has a *reason.*",
        desc: "Transparent priority scores help coordinators understand which needs require attention first—and why.",
        stat: "5 priority factors",
        label: "from urgency to accessibility",
      },
      {
        title: "From depot|to *doorstep.*",
        desc: "Connect available inventory with relief requests and follow each delivery along its planned route.",
        stat: "3 demo depots",
        label: "Hyderabad · Sukkur · Karachi",
      },
      {
        title: "Make every|resource *count.*",
        desc: "Test changing conditions, compare allocation outcomes and adapt plans when demand or supply shifts.",
        stat: "One mission",
        label: "the right help, in the right order",
      },
    ],
    heroSlides: "Hero slides",
    slideN: (n) => `Slide ${n}`,

    ticker: [
      "SUPPLIES WITH PURPOSE",
      "DECISIONS YOU CAN EXPLAIN",
      "EVERY DELIVERY COUNTS",
      "BUILT FOR HUMAN IMPACT",
    ],

    platform: {
      kicker: "One platform. One shared picture.",
      title: "Many moving parts.|One clear mission.",
      desc: "Karwan connects field requests, warehouse inventory and delivery capacity—so coordinators can turn limited resources into better-informed decisions.",
    },
    services: [
      {
        num: "01 / REQUESTS",
        title: "Every need, visible",
        desc: "Collect requests by location, urgency, affected people, accessibility and essential supplies.",
      },
      {
        num: "02 / INVENTORY",
        title: "Know what’s available",
        desc: "See stock levels, available vehicles and daily depot capacity in one coordinated view.",
      },
      {
        num: "03 / PRIORITY",
        title: "Priorities with a reason",
        desc: "Understand why a request ranks where it does, with a transparent score breakdown.",
      },
      {
        num: "04 / ALLOCATION",
        title: "Fairer allocation",
        desc: "Recommend supply splits when demand exceeds stock, and show what remains unfulfilled.",
      },
      {
        num: "05 / ROUTES",
        title: "From depot to destination",
        desc: "Follow delivery progress, route information and estimated arrival across relief locations.",
      },
      {
        num: "06 / SIMULATION",
        title: "Plan for what changes",
        desc: "Test a new emergency, reduced stock or blocked route, then compare the allocation impact.",
      },
    ],

    safety: {
      imageLabel: "Community support and humanitarian aid",
      title: "Every decision should have a reason.",
      desc: "When resources are limited, a dashboard should do more than show numbers. Karwan makes the why visible—from priority factors to partial allocations—so coordinators can understand and explain each recommendation.",
      button: "See the coordination view ↗",
      metrics: [
        "priority factors",
        "essential supply types",
        "demo depots",
        "shared mission",
      ],
    },

    dashboard: {
      kicker: "A closer look",
      title: "See the situation.|Act with clarity.",
      desc: "A sample coordination view for the Karwan hackathon prototype. The locations and figures below are illustrative demo data—not live emergency information.",
      overview: "Relief operations overview",
      live: "Demo simulation",
      mapLabel: "Illustrative map showing relief locations",
      sukkur: "SUKKUR DEPOT",
      dadu: "DADU",
      hyderabad: "HYDERABAD DEPOT",
      badin: "BADIN",
      truck: "Simulated truck",
      legend: {
        critical: "Critical",
        high: "High",
        transit: "In transit",
        delivered: "Delivered",
      },
      note: "Illustrative route · simulated truck movement",
      refresh: "Refresh route ↻",
      refreshToast: "Demo route refreshed. No real dispatch was made.",
      kpis: [
        ["Active requests", "12"],
        ["People awaiting help", "8.4k"],
        ["Deliveries in progress", "06"],
        ["Critical shortages", "04"],
      ],
      queue: "Priority queue",
      demoData: "Demo data ↗",
      requests: [
        {
          title: "Dadu · Request #104",
          sub: "Water · 2,400 people affected",
          status: "CRITICAL",
        },
        {
          title: "Sehwan · Request #108",
          sub: "Medicine · hard to reach",
          status: "HIGH",
        },
        {
          title: "Badin · Request #112",
          sub: "Shelter kits · waiting",
          status: "WAITING",
        },
      ],
    },

    impact: {
      kicker: "The reason behind the system",
      title: "Technology should|move humanity forward.",
      desc: "Behind every request is a family, a community and a need that cannot wait. Better coordination helps relief teams use what they have more thoughtfully.",
      storyAlt: "Volunteers working together to support a community",
      storyKicker: "The people behind the numbers",
      storyTitle: "Relief is more than moving supplies.",
      storyDesc:
        "It’s about understanding the need, making the best available decision and keeping every team aligned around the people who need help.",
      storyButton: "Explore the idea ↗",
      card1: {
        kicker: "Designed for transparency",
        title: "Explain the recommendation.",
        desc: "Priority factors, allocation quantities and unfulfilled needs should be understandable—not hidden behind a score.",
        button: "Try the simulator ↗",
      },
      card2: {
        kicker: "Made for changing conditions",
        title: "When the situation changes, plans should too.",
        desc: "Test a new emergency or a stock shortage and compare how a reallocation could change fulfilment.",
        button: "See what-if planning ↗",
      },
      news: [
        {
          alt: "Relief supplies prepared for distribution",
          tag: "01 · Preparedness",
          title: "Make limited supplies count.",
          desc: "Inventory visibility helps teams understand what can be sent and where a shortfall remains.",
        },
        {
          alt: "Community receiving humanitarian support",
          tag: "02 · Coordination",
          title: "Put urgent needs in view.",
          desc: "A shared request queue helps relief coordinators see urgency, vulnerability and waiting time together.",
        },
        {
          alt: "Children in a community supported by aid",
          tag: "03 · Human impact",
          title: "Keep the people at the centre.",
          desc: "Behind each marker is a real-world need. The interface should make that impossible to forget.",
        },
      ],
    },

    sim: {
      eyebrow: "Interactive concept demo",
      title: "What if the situation changes?",
      desc: "Adjust the demo conditions to see a sample fulfilment estimate react. This is a front-end illustration of Karwan’s what-if concept, not the production allocation algorithm.",
      baseline: "Illustrative baseline",
      fcfs: "First-come-first-served: 61%",
      karwan: "Karwan: 84%",
      panel: "What-if simulator",
      interactive: "Interactive",
      demand: "Demand increase",
      stock: "Available stock",
      capacity: "Delivery capacity",
      fulfilment: "Estimated fulfilment",
      gap: "Estimated supply gap",
      msgOk: "Stock and capacity are balanced for this demo scenario.",
      msgMid:
        "A supply gap is emerging. Review depot stock or delivery capacity.",
      msgLow:
        "This scenario creates a major shortfall. Prioritise critical and vulnerable requests.",
      reset: "Reset scenario ↻",
      resetToast: "Demo scenario reset.",
    },

    flow: {
      kicker: "Built around the real workflow",
      title: "From a request to a delivery.",
      desc: "One connected flow for field reporters, depot managers, coordinators and drivers—with a simple role switch in the MVP.",
      steps: [
        {
          num: "STEP 01",
          title: "Report a need",
          desc: "Submit an affected area, urgency level, vulnerable groups and required supplies.",
        },
        {
          num: "STEP 02",
          title: "Prioritise fairly",
          desc: "Review the score: urgency 35%, affected people 25%, vulnerability 15%, waiting 15%, accessibility 10%.",
        },
        {
          num: "STEP 03",
          title: "Allocate and track",
          desc: "Review recommended quantities, approve dispatch and track the simulated journey to delivery.",
        },
      ],
    },

    footer: {
      tagline:
        "Right supplies, to the right people, in the right order—and a clear reason why.",
      explore: "Explore",
      platform: "The platform",
      ops: "Operations view",
      sim: "What-if simulator",
      workflows: "Workflows",
      reqPriority: "Requests & priority",
      invRoutes: "Inventory & routes",
      human: "Human impact",
      prototype: "Prototype",
      top: "Back to top ↑",
      about: "About this demo",
      sample: "Submit a sample request",
      aboutToast: "This is a front-end prototype using illustrative data.",
      copyright: "© 2026 Karwan · Hackathon MVP prototype",
      disclaimer: "Illustrative data only · Not an emergency-response service",
    },

    modal: {
      kicker: "Requester portal · prototype",
      title: "Tell us what’s needed.",
      desc: "Submit an illustrative request to preview the requester flow. This prototype does not send information to a server or emergency service.",
      area: "Affected area",
      areaPlaceholder: "e.g. Dadu",
      urgency: "Urgency",
      need: "Most urgent supply",
      submit: "Preview request ↗",
      close: "Close dialog",
    },
    urgencyOptions: {
      Critical: "Critical",
      High: "High",
      Medium: "Medium",
      Low: "Low",
    },
    needOptions: {
      Water: "Water",
      Food: "Food",
      Medicine: "Medicine",
      "Shelter kits": "Shelter kits",
    },
    sampleToast: (urgency, need, area) =>
      `Sample ${urgency.toLowerCase()} request for ${need.toLowerCase()} in ${area} previewed.`,
  },

  ur: {
    dir: "rtl",
    langButton: "English",
    langButtonLabel: "انگریزی میں تبدیل کریں",
    pageTitle: "کاروان — مقصد کے ساتھ امداد، بروقت",
    brand: "کاروان",
    tag: "ریلیف او ایس",
    brandLabel: "کاروان ہوم",
    nav: {
      platform: "پلیٹ فارم",
      how: "یہ کیسے کام کرتا ہے",
      impact: "ہمارا اثر",
      demo: "لائیو ڈیمو",
    },
    submit: "درخواست جمع کرائیں",
    submitHero: "درخواست جمع کرائیں ↗",
    openMenu: "مینو کھولیں",

    slides: [
      {
        title: "درست مدد۔|*درست جگہ۔*|درست وقت پر۔",
        desc: "جب ہر منٹ اہم ہو، کاروان امدادی ٹیموں کو واضح فیصلے کرنے اور ضروری سامان وہاں پہنچانے میں مدد دیتا ہے جہاں اس سے سب سے زیادہ فرق پڑے۔",
        stat: "12 مقامات",
        label: "سیلاب سے متاثرہ سندھ بھر میں منسلک",
      },
      {
        title: "جب ضروریات بڑھیں،|*وضاحت اہم ہوتی ہے۔*",
        desc: "فوری درخواستیں، اسٹاک کی سطح اور ترسیل کی صلاحیت کو ایک مشترکہ آپریشنل تصویر میں لائیں۔",
        stat: "4 اقسام کا سامان",
        label: "خوراک · پانی · ادویات · شیلٹر کٹس",
      },
      {
        title: "ہر درخواست کی|ایک *وجہ* ہے۔",
        desc: "شفاف ترجیحی اسکور کوآرڈینیٹرز کو سمجھاتے ہیں کہ کن ضروریات پر پہلے توجہ دینی ہے—اور کیوں۔",
        stat: "5 ترجیحی عوامل",
        label: "فوری ضرورت سے رسائی تک",
      },
      {
        title: "ڈپو سے|*دہلیز* تک۔",
        desc: "دستیاب ذخیرے کو امدادی درخواستوں سے جوڑیں اور ہر ترسیل کو اس کے طے شدہ راستے پر دیکھیں۔",
        stat: "3 ڈیمو ڈپو",
        label: "حیدرآباد · سکھر · کراچی",
      },
      {
        title: "ہر وسیلے کو|*کارآمد* بنائیں۔",
        desc: "بدلتے حالات کو آزمائیں، تخصیص کے نتائج کا موازنہ کریں اور طلب یا رسد بدلنے پر منصوبے ڈھالیں۔",
        stat: "ایک مشن",
        label: "درست مدد، درست ترتیب میں",
      },
    ],
    heroSlides: "ہیرو سلائیڈز",
    slideN: (n) => `سلائیڈ ${n}`,

    ticker: [
      "مقصد کے ساتھ سامان",
      "ایسے فیصلے جو سمجھائے جا سکیں",
      "ہر ترسیل اہم ہے",
      "انسانی اثر کے لیے بنایا گیا",
    ],

    platform: {
      kicker: "ایک پلیٹ فارم۔ ایک مشترکہ تصویر۔",
      title: "بہت سے حصے۔|ایک واضح مشن۔",
      desc: "کاروان میدانی درخواستوں، گودام کے ذخیرے اور ترسیلی صلاحیت کو جوڑتا ہے—تاکہ کوآرڈینیٹرز محدود وسائل کو بہتر باخبر فیصلوں میں بدل سکیں۔",
    },
    services: [
      {
        num: "01 / درخواستیں",
        title: "ہر ضرورت، نظر کے سامنے",
        desc: "مقام، فوری ضرورت، متاثرہ افراد، رسائی اور ضروری سامان کے لحاظ سے درخواستیں جمع کریں۔",
      },
      {
        num: "02 / ذخیرہ",
        title: "جانیں کیا دستیاب ہے",
        desc: "اسٹاک کی سطح، دستیاب گاڑیاں اور ڈپو کی روزانہ گنجائش ایک مربوط منظر میں دیکھیں۔",
      },
      {
        num: "03 / ترجیح",
        title: "وجہ کے ساتھ ترجیحات",
        desc: "شفاف اسکور کی تفصیل کے ساتھ سمجھیں کہ کوئی درخواست اس درجے پر کیوں ہے۔",
      },
      {
        num: "04 / تخصیص",
        title: "منصفانہ تخصیص",
        desc: "جب طلب ذخیرے سے بڑھ جائے تو سامان کی تقسیم تجویز کریں اور دکھائیں کہ کیا پورا نہیں ہوا۔",
      },
      {
        num: "05 / راستے",
        title: "ڈپو سے منزل تک",
        desc: "امدادی مقامات تک ترسیل کی پیش رفت، راستے کی معلومات اور متوقع آمد کو دیکھیں۔",
      },
      {
        num: "06 / نقالی",
        title: "بدلتے حالات کی منصوبہ بندی",
        desc: "نئی ایمرجنسی، کم اسٹاک یا بند راستے کو آزمائیں، پھر تخصیص پر اثر کا موازنہ کریں۔",
      },
    ],

    safety: {
      imageLabel: "کمیونٹی کی مدد اور انسانی امداد",
      title: "ہر فیصلے کی ایک وجہ ہونی چاہیے۔",
      desc: 'جب وسائل محدود ہوں تو ڈیش بورڈ کو صرف اعداد نہیں دکھانے چاہییں۔ کاروان "کیوں" کو نظر آنے والا بناتا ہے—ترجیحی عوامل سے لے کر جزوی تخصیص تک—تاکہ کوآرڈینیٹرز ہر سفارش کو سمجھ اور سمجھا سکیں۔',
      button: "رابطہ کاری کا منظر دیکھیں ↗",
      metrics: [
        "ترجیحی عوامل",
        "ضروری سامان کی اقسام",
        "ڈیمو ڈپو",
        "مشترکہ مشن",
      ],
    },

    dashboard: {
      kicker: "قریب سے جائزہ",
      title: "صورتحال دیکھیں۔|وضاحت کے ساتھ عمل کریں۔",
      desc: "کاروان ہیکاتھون پروٹوٹائپ کے لیے ایک نمونہ رابطہ کاری منظر۔ نیچے دیے گئے مقامات اور اعداد صرف مثال کے طور پر ڈیمو ڈیٹا ہیں—براہِ راست ایمرجنسی معلومات نہیں۔",
      overview: "امدادی کارروائیوں کا جائزہ",
      live: "ڈیمو نقالی",
      mapLabel: "امدادی مقامات دکھانے والا مثالی نقشہ",
      sukkur: "سکھر ڈپو",
      dadu: "دادو",
      hyderabad: "حیدرآباد ڈپو",
      badin: "بدین",
      truck: "نقلی ٹرک",
      legend: {
        critical: "انتہائی نازک",
        high: "زیادہ",
        transit: "راستے میں",
        delivered: "پہنچا دیا گیا",
      },
      note: "مثالی راستہ · نقلی ٹرک کی حرکت",
      refresh: "راستہ ریفریش کریں ↻",
      refreshToast: "ڈیمو راستہ ریفریش ہو گیا۔ کوئی حقیقی روانگی نہیں کی گئی۔",
      kpis: [
        ["فعال درخواستیں", "12"],
        ["مدد کے منتظر افراد", "8.4 ہزار"],
        ["جاری ترسیلات", "06"],
        ["نازک قلت", "04"],
      ],
      queue: "ترجیحی قطار",
      demoData: "ڈیمو ڈیٹا ↗",
      requests: [
        {
          title: "دادو · درخواست #104",
          sub: "پانی · 2,400 افراد متاثر",
          status: "نازک",
        },
        {
          title: "سیہون · درخواست #108",
          sub: "ادویات · رسائی مشکل",
          status: "زیادہ",
        },
        {
          title: "بدین · درخواست #112",
          sub: "شیلٹر کٹس · انتظار میں",
          status: "انتظار",
        },
      ],
    },

    impact: {
      kicker: "نظام کے پیچھے مقصد",
      title: "ٹیکنالوجی کو چاہیے کہ|انسانیت کو آگے بڑھائے۔",
      desc: "ہر درخواست کے پیچھے ایک خاندان، ایک برادری اور ایک ایسی ضرورت ہے جو انتظار نہیں کر سکتی۔ بہتر رابطہ کاری امدادی ٹیموں کو اپنے پاس موجود وسائل زیادہ سوچ سمجھ کر استعمال کرنے میں مدد دیتی ہے۔",
      storyAlt: "رضاکار مل کر ایک کمیونٹی کی مدد کر رہے ہیں",
      storyKicker: "اعداد کے پیچھے لوگ",
      storyTitle: "امداد صرف سامان پہنچانا نہیں ہے۔",
      storyDesc:
        "یہ ضرورت کو سمجھنے، دستیاب بہترین فیصلہ کرنے اور ہر ٹیم کو ان لوگوں پر مرکوز رکھنے کا نام ہے جنہیں مدد چاہیے۔",
      storyButton: "اس خیال کو دیکھیں ↗",
      card1: {
        kicker: "شفافیت کے لیے ڈیزائن کیا گیا",
        title: "سفارش کی وضاحت کریں۔",
        desc: "ترجیحی عوامل، تخصیص کی مقداریں اور غیر پوری ضروریات سمجھ میں آنی چاہییں—کسی اسکور کے پیچھے چھپی نہیں۔",
        button: "سمیولیٹر آزمائیں ↗",
      },
      card2: {
        kicker: "بدلتے حالات کے لیے بنایا گیا",
        title: "جب صورتحال بدلے تو منصوبے بھی بدلیں۔",
        desc: "نئی ایمرجنسی یا اسٹاک کی کمی آزمائیں اور موازنہ کریں کہ دوبارہ تخصیص سے تکمیل کیسے بدل سکتی ہے۔",
        button: '"کیا ہو اگر" منصوبہ بندی دیکھیں ↗',
      },
      news: [
        {
          alt: "تقسیم کے لیے تیار امدادی سامان",
          tag: "01 · تیاری",
          title: "محدود سامان کو کارآمد بنائیں۔",
          desc: "ذخیرے کی نمائی ٹیموں کو سمجھنے میں مدد دیتی ہے کہ کیا بھیجا جا سکتا ہے اور کمی کہاں باقی ہے۔",
        },
        {
          alt: "انسانی امداد حاصل کرتی ہوئی کمیونٹی",
          tag: "02 · رابطہ کاری",
          title: "فوری ضروریات کو نظر میں رکھیں۔",
          desc: "مشترکہ درخواستی قطار کوآرڈینیٹرز کو فوری ضرورت، کمزوری اور انتظار کا وقت ایک ساتھ دیکھنے میں مدد دیتی ہے۔",
        },
        {
          alt: "امداد سے مستفید کمیونٹی کے بچے",
          tag: "03 · انسانی اثر",
          title: "لوگوں کو مرکز میں رکھیں۔",
          desc: "ہر نشان کے پیچھے ایک حقیقی ضرورت ہے۔ انٹرفیس کو یہ بھولنا ناممکن بنانا چاہیے۔",
        },
      ],
    },

    sim: {
      eyebrow: "انٹرایکٹو تصوراتی ڈیمو",
      title: "اگر صورتحال بدل جائے تو؟",
      desc: 'ڈیمو حالات کو تبدیل کر کے دیکھیں کہ نمونہ تکمیلی تخمینہ کیسے بدلتا ہے۔ یہ کاروان کے "کیا ہو اگر" تصور کی فرنٹ اینڈ مثال ہے، اصل تخصیصی الگورتھم نہیں۔',
      baseline: "مثالی بنیادی سطح",
      fcfs: "پہلے آئیے پہلے پائیے: 61%",
      karwan: "کاروان: 84%",
      panel: '"کیا ہو اگر" سمیولیٹر',
      interactive: "انٹرایکٹو",
      demand: "طلب میں اضافہ",
      stock: "دستیاب اسٹاک",
      capacity: "ترسیلی صلاحیت",
      fulfilment: "تخمینی تکمیل",
      gap: "تخمینی رسد کا خلا",
      msgOk: "اس ڈیمو منظرنامے میں اسٹاک اور صلاحیت متوازن ہیں۔",
      msgMid: "رسد میں کمی ابھر رہی ہے۔ ڈپو کا اسٹاک یا ترسیلی صلاحیت دیکھیں۔",
      msgLow:
        "اس منظرنامے میں بڑی قلت پیدا ہوتی ہے۔ نازک اور کمزور درخواستوں کو ترجیح دیں۔",
      reset: "منظرنامہ ری سیٹ کریں ↻",
      resetToast: "ڈیمو منظرنامہ ری سیٹ ہو گیا۔",
    },

    flow: {
      kicker: "حقیقی کام کے بہاؤ کے مطابق",
      title: "درخواست سے ترسیل تک۔",
      desc: "میدانی رپورٹرز، ڈپو مینیجرز، کوآرڈینیٹرز اور ڈرائیورز کے لیے ایک مربوط بہاؤ—MVP میں سادہ رول سوئچ کے ساتھ۔",
      steps: [
        {
          num: "مرحلہ 01",
          title: "ضرورت رپورٹ کریں",
          desc: "متاثرہ علاقہ، فوری ضرورت کی سطح، کمزور طبقات اور مطلوبہ سامان جمع کرائیں۔",
        },
        {
          num: "مرحلہ 02",
          title: "منصفانہ ترجیح دیں",
          desc: "اسکور دیکھیں: فوری ضرورت 35%، متاثرہ افراد 25%، کمزوری 15%، انتظار 15%، رسائی 10%۔",
        },
        {
          num: "مرحلہ 03",
          title: "تخصیص کریں اور ٹریک کریں",
          desc: "تجویز کردہ مقداریں دیکھیں، روانگی منظور کریں اور ترسیل تک نقلی سفر کو ٹریک کریں۔",
        },
      ],
    },

    footer: {
      tagline:
        "درست سامان، درست لوگوں تک، درست ترتیب میں—اور اس کی واضح وجہ کے ساتھ۔",
      explore: "دریافت کریں",
      platform: "پلیٹ فارم",
      ops: "آپریشنز منظر",
      sim: '"کیا ہو اگر" سمیولیٹر',
      workflows: "ورک فلو",
      reqPriority: "درخواستیں اور ترجیح",
      invRoutes: "ذخیرہ اور راستے",
      human: "انسانی اثر",
      prototype: "پروٹوٹائپ",
      top: "اوپر واپس جائیں ↑",
      about: "اس ڈیمو کے بارے میں",
      sample: "نمونہ درخواست جمع کرائیں",
      aboutToast: "یہ مثالی ڈیٹا استعمال کرنے والا فرنٹ اینڈ پروٹوٹائپ ہے۔",
      copyright: "© 2026 کاروان · ہیکاتھون MVP پروٹوٹائپ",
      disclaimer: "صرف مثالی ڈیٹا · ایمرجنسی رسپانس سروس نہیں",
    },

    modal: {
      kicker: "درخواست گزار پورٹل · پروٹوٹائپ",
      title: "ہمیں بتائیں کیا چاہیے۔",
      desc: "ایک مثالی درخواست جمع کر کے درخواست گزار کے بہاؤ کا پیش منظر دیکھیں۔ یہ پروٹوٹائپ کوئی معلومات سرور یا ایمرجنسی سروس کو نہیں بھیجتا۔",
      area: "متاثرہ علاقہ",
      areaPlaceholder: "مثلاً دادو",
      urgency: "فوری ضرورت",
      need: "سب سے ضروری سامان",
      submit: "درخواست کا پیش منظر ↗",
      close: "ڈائیلاگ بند کریں",
    },
    urgencyOptions: {
      Critical: "انتہائی نازک",
      High: "زیادہ",
      Medium: "درمیانہ",
      Low: "کم",
    },
    needOptions: {
      Water: "پانی",
      Food: "خوراک",
      Medicine: "ادویات",
      "Shelter kits": "شیلٹر کٹس",
    },
    sampleToast: (urgency, need, area) =>
      `${area} میں ${need} کے لیے ${urgency} نمونہ درخواست کا پیش منظر تیار۔`,
  },

  sd: {
    dir: "rtl",
    pageTitle: "ڪاروان — مقصد سان امداد، وقت تي",
    brand: "ڪاروان",
    tag: "ريليف او ايس",
    brandLabel: "ڪاروان هوم",
    nav: {
      platform: "پليٽ فارم",
      how: "هي ڪيئن ڪم ڪري ٿو",
      impact: "اسان جو اثر",
      demo: "لائيو ڊيمو",
    },
    submit: "درخواست جمع ڪرايو",
    submitHero: "درخواست جمع ڪرايو ↗",
    openMenu: "مينيو کوليو",

    slides: [
      {
        title: "صحيح مدد.|*صحيح جڳهه.*|صحيح وقت تي.",
        desc: "جڏهن هر منٽ اهم هجي، ڪاروان امدادي ٽيمن کي واضح فيصلا ڪرڻ ۽ ضروري سامان اتي پهچائڻ ۾ مدد ڏئي ٿو جتي ان سان سڀ کان وڌيڪ فرق پوي.",
        stat: "12 جڳهيون",
        label: "ٻوڏ متاثر سنڌ ۾ ڳنڍيل",
      },
      {
        title: "جڏهن ضرورتون وڌن،|*وضاحت اهم ٿئي ٿي.*",
        desc: "تڪڙين درخواستن، اسٽاڪ جي سطح ۽ ترسيل جي گنجائش کي هڪ گڏيل آپريشنل تصوير ۾ آڻيو.",
        stat: "4 قسمن جو سامان",
        label: "کاڌو · پاڻي · دوائون · پناهه ڪٽس",
      },
      {
        title: "هر درخواست جو|هڪ *سبب* آهي.",
        desc: "شفاف ترجيحي اسڪور ڪوآرڊينيٽرن کي سمجهائين ٿا ته ڪهڙين ضرورتن تي پهرين ڌيان ڏيڻ گهرجي — ۽ ڇو.",
        stat: "5 ترجيحي عنصر",
        label: "تڪڙ کان پهچ تائين",
      },
      {
        title: "ڊپو کان|*دروازي* تائين.",
        desc: "موجود ذخيري کي امدادي درخواستن سان ڳنڍيو ۽ هر ترسيل کي ان جي مقرر رستي تي ڏسو.",
        stat: "3 ڊيمو ڊپو",
        label: "حيدرآباد · سکر · ڪراچي",
      },
      {
        title: "هر وسيلي کي|*ڪارائتو* بڻايو.",
        desc: "بدلجندڙ حالتن کي آزمايو، ورهاست جي نتيجن جو مقابلو ڪريو ۽ گهر يا سپلاءِ بدلجڻ تي منصوبا ٺاهيو.",
        stat: "هڪ مشن",
        label: "صحيح مدد، صحيح ترتيب ۾",
      },
    ],
    heroSlides: "هيرو سلائيڊس",
    slideN: (n) => `سلائيڊ ${n}`,

    ticker: [
      "مقصد سان سامان",
      "اهڙا فيصلا جيڪي سمجهائي سگهجن",
      "هر ترسيل اهم آهي",
      "انساني اثر لاءِ ٺاهيل",
    ],

    platform: {
      kicker: "هڪ پليٽ فارم. هڪ گڏيل تصوير.",
      title: "ڪيترا حصا.|هڪ واضح مشن.",
      desc: "ڪاروان ميداني درخواستن، گودام جي ذخيري ۽ ترسيلي گنجائش کي ڳنڍي ٿو — تان جو ڪوآرڊينيٽر محدود وسيلن کي بهتر باخبر فيصلن ۾ بدلائي سگهن.",
    },
    services: [
      {
        num: "01 / درخواستون",
        title: "هر ضرورت، نظر جي سامهون",
        desc: "جڳهه، تڪڙ، متاثر ماڻهن، پهچ ۽ ضروري سامان جي لحاظ کان درخواستون گڏ ڪريو.",
      },
      {
        num: "02 / ذخيرو",
        title: "ڄاڻو ته ڇا موجود آهي",
        desc: "اسٽاڪ جي سطح، موجود گاڏيون ۽ ڊپو جي روزاني گنجائش هڪ ڳنڍيل منظر ۾ ڏسو.",
      },
      {
        num: "03 / ترجيح",
        title: "سبب سان ترجيحون",
        desc: "شفاف اسڪور جي تفصيل سان سمجهو ته ڪا درخواست ان درجي تي ڇو آهي.",
      },
      {
        num: "04 / ورهاست",
        title: "منصفاڻي ورهاست",
        desc: "جڏهن گهر ذخيري کان وڌي وڃي ته سامان جي ورهاست تجويز ڪريو ۽ ڏيکاريو ته ڇا پورو نه ٿيو.",
      },
      {
        num: "05 / رستا",
        title: "ڊپو کان منزل تائين",
        desc: "امدادي جڳهن تائين ترسيل جي ترقي، رستي جي معلومات ۽ اندازي وارو وقت ڏسو.",
      },
      {
        num: "06 / نقل",
        title: "بدلجندڙ حالتن جي منصوبابندي",
        desc: "نئين ايمرجنسي، گهٽ اسٽاڪ يا بند رستي کي آزمايو، پوءِ ورهاست تي اثر جو مقابلو ڪريو.",
      },
    ],

    safety: {
      imageLabel: "ڪميونٽي جي مدد ۽ انساني امداد",
      title: "هر فيصلي جو هڪ سبب هجڻ گهرجي.",
      desc: 'جڏهن وسيلا محدود هجن ته ڊيش بورڊ کي رڳو انگ نه ڏيکارڻ گهرجن. ڪاروان "ڇو" کي نظر ايندڙ بڻائي ٿو — ترجيحي عنصرن کان وٺي جزوي ورهاست تائين — تان جو ڪوآرڊينيٽر هر سفارش کي سمجهي ۽ سمجهائي سگهن.',
      button: "رابطي جو منظر ڏسو ↗",
      metrics: [
        "ترجيحي عنصر",
        "ضروري سامان جا قسم",
        "ڊيمو ڊپو",
        "گڏيل مشن",
      ],
    },

    dashboard: {
      kicker: "ويجهي کان جائزو",
      title: "صورتحال ڏسو.|وضاحت سان عمل ڪريو.",
      desc: "ڪاروان هيڪاٿون پروٽوٽائيپ لاءِ هڪ نمونو رابطي جو منظر. هيٺ ڏنل جڳهيون ۽ انگ رڳو مثال طور ڊيمو ڊيٽا آهن — سڌي ايمرجنسي معلومات ناهي.",
      overview: "امدادي ڪارروائين جو جائزو",
      live: "ڊيمو نقل",
      mapLabel: "امدادي جڳهن کي ڏيکاريندڙ مثالي نقشو",
      sukkur: "سکر ڊپو",
      dadu: "دادو",
      hyderabad: "حيدرآباد ڊپو",
      badin: "بدين",
      truck: "نقلي ٽرڪ",
      legend: {
        critical: "نازڪ",
        high: "وڌيڪ",
        transit: "رستي ۾",
        delivered: "پهچايو ويو",
      },
      note: "مثالي رستو · نقلي ٽرڪ جي حرڪت",
      refresh: "رستو ريفريش ڪريو ↻",
      refreshToast: "ڊيمو رستو ريفريش ٿي ويو. ڪا حقيقي روانگي نه ڪئي وئي.",
      kpis: [
        ["فعال درخواستون", "12"],
        ["مدد جا منتظر ماڻهو", "8.4 هزار"],
        ["جاري ترسيلون", "06"],
        ["نازڪ کوٽ", "04"],
      ],
      queue: "ترجيحي قطار",
      demoData: "ڊيمو ڊيٽا ↗",
      requests: [
        {
          title: "دادو · درخواست #104",
          sub: "پاڻي · 2,400 ماڻهو متاثر",
          status: "نازڪ",
        },
        {
          title: "سيوهڻ · درخواست #108",
          sub: "دوائون · پهچ ڏکي",
          status: "وڌيڪ",
        },
        {
          title: "بدين · درخواست #112",
          sub: "پناهه ڪٽس · انتظار ۾",
          status: "انتظار",
        },
      ],
    },

    impact: {
      kicker: "نظام جي پويان مقصد",
      title: "ٽيڪنالاجي کي گهرجي ته|انسانيت کي اڳتي وڌائي.",
      desc: "هر درخواست جي پويان هڪ خاندان، هڪ برادري ۽ هڪ اهڙي ضرورت آهي جيڪا انتظار نٿي ڪري سگهي. بهتر رابطو امدادي ٽيمن کي پنهنجن وسيلن کي وڌيڪ سوچ سمجهه سان استعمال ڪرڻ ۾ مدد ڏئي ٿو.",
      storyAlt: "رضاڪار گڏجي هڪ ڪميونٽي جي مدد ڪري رهيا آهن",
      storyKicker: "انگن جي پويان ماڻهو",
      storyTitle: "امداد رڳو سامان پهچائڻ ناهي.",
      storyDesc:
        "هي ضرورت کي سمجهڻ، موجود بهترين فيصلو ڪرڻ ۽ هر ٽيم کي انهن ماڻهن تي مرکوز رکڻ جو نالو آهي جن کي مدد گهرجي.",
      storyButton: "هن خيال کي ڏسو ↗",
      card1: {
        kicker: "شفافيت لاءِ ٺاهيل",
        title: "سفارش جي وضاحت ڪريو.",
        desc: "ترجيحي عنصر، ورهاست جون مقدارون ۽ پوريون نه ٿيل ضرورتون سمجهه ۾ اچڻ گهرجن — ڪنهن اسڪور جي پويان لڪيل نه.",
        button: "سميوليٽر آزمايو ↗",
      },
      card2: {
        kicker: "بدلجندڙ حالتن لاءِ ٺاهيل",
        title: "جڏهن صورتحال بدلجي ته منصوبا به بدلجن.",
        desc: "نئين ايمرجنسي يا اسٽاڪ جي کوٽ آزمايو ۽ مقابلو ڪريو ته ٻيهر ورهاست سان تڪميل ڪيئن بدلجي سگهي ٿي.",
        button: '"جيڪڏهن" منصوبابندي ڏسو ↗',
      },
      news: [
        {
          alt: "ورهاست لاءِ تيار امدادي سامان",
          tag: "01 · تياري",
          title: "محدود سامان کي ڪارائتو بڻايو.",
          desc: "ذخيري جو ڏيک ٽيمن کي سمجهڻ ۾ مدد ڏئي ٿو ته ڇا موڪلي سگهجي ٿو ۽ کوٽ ڪٿي باقي آهي.",
        },
        {
          alt: "انساني امداد وٺندڙ ڪميونٽي",
          tag: "02 · رابطو",
          title: "تڪڙين ضرورتن کي نظر ۾ رکو.",
          desc: "گڏيل درخواستن جي قطار ڪوآرڊينيٽرن کي تڪڙ، ڪمزوري ۽ انتظار جو وقت گڏ ڏسڻ ۾ مدد ڏئي ٿي.",
        },
        {
          alt: "امداد حاصل ڪندڙ ڪميونٽي جا ٻار",
          tag: "03 · انساني اثر",
          title: "ماڻهن کي مرڪز ۾ رکو.",
          desc: "هر نشان جي پويان هڪ حقيقي ضرورت آهي. انٽرفيس کي اهو وسارڻ ناممڪن بڻائڻ گهرجي.",
        },
      ],
    },

    sim: {
      eyebrow: "انٽرايڪٽو تصوراتي ڊيمو",
      title: "جيڪڏهن صورتحال بدلجي وڃي ته؟",
      desc: 'ڊيمو جون حالتون بدلائي ڏسو ته نمونو تڪميلي اندازو ڪيئن بدلجي ٿو. هي ڪاروان جي "جيڪڏهن" تصور جو فرنٽ اينڊ مثال آهي، اصل ورهاست جو الگورتهم ناهي.',
      baseline: "مثالي بنيادي سطح",
      fcfs: "پهرين اچو، پهرين وٺو: 61%",
      karwan: "ڪاروان: 84%",
      panel: '"جيڪڏهن" سميوليٽر',
      interactive: "انٽرايڪٽو",
      demand: "گهر ۾ واڌارو",
      stock: "موجود اسٽاڪ",
      capacity: "ترسيلي گنجائش",
      fulfilment: "اندازي وارو تڪميل",
      gap: "اندازي وارو سپلاءِ جو خلا",
      msgOk: "هن ڊيمو منظرنامي ۾ اسٽاڪ ۽ گنجائش متوازن آهن.",
      msgMid: "سپلاءِ ۾ کوٽ پيدا ٿي رهي آهي. ڊپو جو اسٽاڪ يا ترسيلي گنجائش ڏسو.",
      msgLow:
        "هن منظرنامي ۾ وڏي کوٽ پيدا ٿئي ٿي. نازڪ ۽ ڪمزور درخواستن کي ترجيح ڏيو.",
      reset: "منظرنامو ري سيٽ ڪريو ↻",
      resetToast: "ڊيمو منظرنامو ري سيٽ ٿي ويو.",
    },

    flow: {
      kicker: "حقيقي ڪم جي وهڪري مطابق",
      title: "درخواست کان ترسيل تائين.",
      desc: "ميداني رپورٽرن، ڊپو مئنيجرن، ڪوآرڊينيٽرن ۽ ڊرائيورن لاءِ هڪ ڳنڍيل وهڪرو — MVP ۾ سادي رول سوئچ سان.",
      steps: [
        {
          num: "مرحلو 01",
          title: "ضرورت رپورٽ ڪريو",
          desc: "متاثر علائقو، تڪڙ جي سطح، ڪمزور طبقا ۽ گهربل سامان جمع ڪرايو.",
        },
        {
          num: "مرحلو 02",
          title: "منصفاڻي ترجيح ڏيو",
          desc: "اسڪور ڏسو: تڪڙ 35%، متاثر ماڻهو 25%، ڪمزوري 15%، انتظار 15%، پهچ 10%.",
        },
        {
          num: "مرحلو 03",
          title: "ورهايو ۽ نگراني ڪريو",
          desc: "تجويز ڪيل مقدارون ڏسو، روانگي منظور ڪريو ۽ ترسيل تائين نقلي سفر جي نگراني ڪريو.",
        },
      ],
    },

    footer: {
      tagline:
        "صحيح سامان، صحيح ماڻهن تائين، صحيح ترتيب ۾ — ۽ ان جي واضح سبب سان.",
      explore: "ڳوليو",
      platform: "پليٽ فارم",
      ops: "آپريشنز جو منظر",
      sim: '"جيڪڏهن" سميوليٽر',
      workflows: "ورڪ فلو",
      reqPriority: "درخواستون ۽ ترجيح",
      invRoutes: "ذخيرو ۽ رستا",
      human: "انساني اثر",
      prototype: "پروٽوٽائيپ",
      top: "مٿي واپس وڃو ↑",
      about: "هن ڊيمو بابت",
      sample: "نمونو درخواست جمع ڪرايو",
      aboutToast: "هي مثالي ڊيٽا استعمال ڪندڙ فرنٽ اينڊ پروٽوٽائيپ آهي.",
      copyright: "© 2026 ڪاروان · هيڪاٿون MVP پروٽوٽائيپ",
      disclaimer: "رڳو مثالي ڊيٽا · ايمرجنسي رسپانس سروس ناهي",
    },

    modal: {
      kicker: "درخواست ڏيندڙ پورٽل · پروٽوٽائيپ",
      title: "اسان کي ٻڌايو ته ڇا گهرجي.",
      desc: "هڪ مثالي درخواست جمع ڪري درخواست ڏيندڙ جي وهڪري جو اڳڀرو ڏيک ڏسو. هي پروٽوٽائيپ ڪا معلومات سرور يا ايمرجنسي سروس ڏانهن نٿو موڪلي.",
      area: "متاثر علائقو",
      areaPlaceholder: "مثال: دادو",
      urgency: "تڪڙ",
      need: "سڀ کان ضروري سامان",
      submit: "درخواست جو اڳڀرو ڏيک ↗",
      close: "ڊائلاگ بند ڪريو",
    },
    urgencyOptions: {
      Critical: "نازڪ",
      High: "وڌيڪ",
      Medium: "وچولي",
      Low: "گهٽ",
    },
    needOptions: {
      Water: "پاڻي",
      Food: "کاڌو",
      Medicine: "دوائون",
      "Shelter kits": "پناهه ڪٽس",
    },
    sampleToast: (urgency, need, area) =>
      `${area} ۾ ${need} لاءِ ${urgency} نمونو درخواست جو اڳڀرو ڏيک تيار.`,
  },
};
