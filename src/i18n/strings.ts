export type AppLocale = "en" | "hi" | "pa" | "ta" | "te" | "mr" | "gu";

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  hi: "हिन्दी",
  pa: "ਪੰਜਾਬੀ",
  ta: "தமிழ்",
  te: "తెలుగు",
  mr: "मराठी",
  gu: "ગુજરાતી",
};

export const LOCALE_ORDER: AppLocale[] = ["en", "hi", "pa", "ta", "te", "mr", "gu"];

export type TranslationKey =
  | "welcome"
  | "welcomeSubtitle"
  | "welcomeSubtitleCustomer"
  | "createTrip"
  | "myTrips"
  | "myParcels"
  | "handoffCodes"
  | "language"
  | "signedInAs"
  | "transferOfferTitle"
  | "transferOfferBody"
  | "newJobsTitle"
  | "newJobsBody"
  | "acceptLoad"
  | "viewTrips"
  | "viewJobs"
  | "notificationTransferTitle"
  | "notificationTransferBody"
  | "notificationJobsTitle"
  | "notificationJobsBody";

export type TranslationTable = Record<TranslationKey, string>;

export const STRINGS: Record<AppLocale, TranslationTable> = {
  en: {
    welcome: "Welcome",
    welcomeSubtitle: "Manage trips, parcels, and handoffs",
    welcomeSubtitleCustomer: "Send and track parcels on verified bus corridors",
    createTrip: "Create new trip",
    myTrips: "My Trips",
    myParcels: "My Parcels",
    handoffCodes: "Handoff Codes",
    language: "Language",
    signedInAs: "Signed in as",
    transferOfferTitle: "Trip transfer waiting for you",
    transferOfferBody:
      "Another conductor offered you their trip. Accept the load before the window closes.",
    newJobsTitle: "New parcels on your route",
    newJobsBody: "parcels match your open trip — tap to view Available Jobs.",
    acceptLoad: "Accept load",
    viewTrips: "View in My Trips",
    viewJobs: "View Available Jobs",
    notificationTransferTitle: "Accept trip transfer",
    notificationTransferBody:
      "A conductor transferred a trip to you. Open Patwadi to accept.",
    notificationJobsTitle: "New jobs on your route",
    notificationJobsBody:
      "Parcels are available for your corridor. Open Patwadi to attach them.",
  },
  hi: {
    welcome: "स्वागत है",
    welcomeSubtitle: "यात्राएँ, पार्सल और हैंडऑफ़ प्रबंधित करें",
    welcomeSubtitleCustomer: "भारत भर में पार्सल भेजें और ट्रैक करें",
    createTrip: "नई यात्रा बनाएँ",
    myTrips: "मेरी यात्राएँ",
    myParcels: "मेरे पार्सल",
    handoffCodes: "हैंडऑफ़ कोड",
    language: "भाषा",
    signedInAs: "लॉग इन",
    transferOfferTitle: "यात्रा ट्रांसफ़र आपका इंतज़ार कर रहा है",
    transferOfferBody:
      "एक कंडक्टर ने आपको यात्रा ऑफ़र की है। समय समाप्त होने से पहले स्वीकार करें।",
    newJobsTitle: "आपके रूट पर नए पार्सल",
    newJobsBody: "पार्सल आपकी खुली यात्रा से मेल खाते हैं — उपलब्ध नौकरियाँ देखें।",
    acceptLoad: "लोड स्वीकार करें",
    viewTrips: "मेरी यात्राएँ में देखें",
    viewJobs: "उपलब्ध नौकरियाँ देखें",
    notificationTransferTitle: "यात्रा ट्रांसफ़र स्वीकार करें",
    notificationTransferBody: "एक कंडक्टर ने आपको यात्रा ट्रांसफ़र की है। Patwadi खोलें।",
    notificationJobsTitle: "आपके रूट पर नई नौकरियाँ",
    notificationJobsBody: "आपके कॉरिडोर में पार्सल उपलब्ध हैं। Patwadi खोलें।",
  },
  pa: {
    welcome: "ਜੀ ਆਇਆਂ ਨੂੰ",
    welcomeSubtitle: "ਯਾਤਰਾਵਾਂ, ਪਾਰਸਲ ਅਤੇ ਹੈਂਡਆਫ਼ ਪ੍ਰਬੰਧਿਤ ਕਰੋ",
    welcomeSubtitleCustomer: "ਭਾਰਤ ਭਰ ਵਿੱਚ ਪਾਰਸਲ ਭੇਜੋ ਅਤੇ ਟ੍ਰੈਕ ਕਰੋ",
    createTrip: "ਨਵੀਂ ਯਾਤਰਾ",
    myTrips: "ਮੇਰੀਆਂ ਯਾਤਰਾਵਾਂ",
    myParcels: "ਮੇਰੇ ਪਾਰਸਲ",
    handoffCodes: "ਹੈਂਡਆਫ਼ ਕੋਡ",
    language: "ਭਾਸ਼ਾ",
    signedInAs: "ਸਾਈਨ ਇਨ",
    transferOfferTitle: "ਯਾਤਰਾ ਟ੍ਰਾਂਸਫ਼ਰ ਤੁਹਾਡੀ ਉਡੀਕ ਕਰ ਰਿਹਾ ਹੈ",
    transferOfferBody:
      "ਕਿਸੇ ਹੋਰ ਕੰਡਕਟਰ ਨੇ ਯਾਤਰਾ ਭੇਜੀ ਹੈ। ਸਮਾਂ ਖਤਮ ਹੋਣ ਤੋਂ ਪਹਿਲਾਂ ਸਵੀਕਾਰ ਕਰੋ।",
    newJobsTitle: "ਤੁਹਾਡੇ ਰੂਟ 'ਤੇ ਨਵੇਂ ਪਾਰਸਲ",
    newJobsBody: "ਪਾਰਸਲ ਤੁਹਾਡੀ ਖੁੱਲ੍ਹੀ ਯਾਤਰਾ ਨਾਲ ਮੇਲ ਖਾਂਦੇ ਹਨ।",
    acceptLoad: "ਲੋਡ ਸਵੀਕਾਰ ਕਰੋ",
    viewTrips: "ਮੇਰੀਆਂ ਯਾਤਰਾਵਾਂ ਵਿੱਚ ਦੇਖੋ",
    viewJobs: "ਉਪਲਬਧ ਨੌਕਰੀਆਂ ਦੇਖੋ",
    notificationTransferTitle: "ਯਾਤਰਾ ਟ੍ਰਾਂਸਫ਼ਰ ਸਵੀਕਾਰ ਕਰੋ",
    notificationTransferBody: "ਯਾਤਰਾ ਤੁਹਾਨੂੰ ਟ੍ਰਾਂਸਫ਼ਰ ਕੀਤੀ ਗਈ। Patwadi ਖੋਲ੍ਹੋ।",
    notificationJobsTitle: "ਤੁਹਾਡੇ ਰੂਟ 'ਤੇ ਨਵੀਆਂ ਨੌਕਰੀਆਂ",
    notificationJobsBody: "ਤੁਹਾਡੇ ਕੋਰੀਡੋਰ ਵਿੱਚ ਪਾਰਸਲ ਉਪਲਬਧ ਹਨ। Patwadi ਖੋਲ੍ਹੋ।",
  },
  ta: {
    welcome: "வணக்கம்",
    welcomeSubtitle: "பயணங்கள், பார்சல்கள், ஒப்படைப்புகளை நிர்வகிக்கவும்",
    welcomeSubtitleCustomer: "இந்தியா முழுவதும் பார்சல் அனுப்பி கண்காணிக்கவும்",
    createTrip: "புதிய பயணம்",
    myTrips: "என் பயணங்கள்",
    myParcels: "என் பார்சல்கள்",
    handoffCodes: "ஒப்படைப்பு குறியீடுகள்",
    language: "மொழி",
    signedInAs: "உள்நுழைந்தது",
    transferOfferTitle: "பயண மாற்றம் காத்திருக்கிறது",
    transferOfferBody:
      "மற்றொரு நடத்துனர் பயணத்தை வழங்கியுள்ளார். நேரம் முடிவதற்கு முன் ஏற்றுக்கொள்ளுங்கள்.",
    newJobsTitle: "உங்கள் வழியில் புதிய பார்சல்கள்",
    newJobsBody: "பார்சல்கள் உங்கள் திறந்த பயணத்துடன் பொருந்துகின்றன.",
    acceptLoad: "சுமை ஏற்றுக்கொள்",
    viewTrips: "என் பயணங்களில் பார்",
    viewJobs: "கிடைக்கும் வேலைகள்",
    notificationTransferTitle: "பயண மாற்றத்தை ஏற்றுக்கொள்",
    notificationTransferBody: "பயணம் உங்களுக்கு மாற்றப்பட்டது. Patwadi திறக்கவும்.",
    notificationJobsTitle: "புதிய வேலைகள்",
    notificationJobsBody: "உங்கள் வழியில் பார்சல்கள் கிடைக்கின்றன.",
  },
  te: {
    welcome: "స్వాగతం",
    welcomeSubtitle: "ప్రయాణాలు, పార్సెల్‌లు, హ్యాండాఫ్‌లు నిర్వహించండి",
    welcomeSubtitleCustomer: "భారతదేశం అంతటా పార్సెల్‌లు పంపండి మరియు ట్రాక్ చేయండి",
    createTrip: "కొత్త ప్రయాణం",
    myTrips: "నా ప్రయాణాలు",
    myParcels: "నా పార్సెల్‌లు",
    handoffCodes: "హ్యాండాఫ్ కోడ్‌లు",
    language: "భాష",
    signedInAs: "లాగిన్",
    transferOfferTitle: "ప్రయాణ బదిలీ మీ కోసం వేచి ఉంది",
    transferOfferBody:
      "మరొక కండక్టర్ ప్రయాణాన్ని అందించారు. సమయం ముగియడానికి ముందు అంగీకరించండి.",
    newJobsTitle: "మీ మార్గంలో కొత్త పార్సెల్‌లు",
    newJobsBody: "పార్సెల్‌లు మీ ఓపెన్ ట్రిప్‌కు సరిపోతాయి.",
    acceptLoad: "లోడ్ అంగీకరించండి",
    viewTrips: "నా ప్రయాణాలలో చూడండి",
    viewJobs: "అందుబాటు ఉద్యోగాలు",
    notificationTransferTitle: "ట్రాన్స్‌ఫర్ అంగీకరించండి",
    notificationTransferBody: "ప్రయాణం మీకు బదిలీ చేయబడింది. Patwadi తెరవండి.",
    notificationJobsTitle: "కొత్త ఉద్యోగాలు",
    notificationJobsBody: "మీ కారిడార్‌లో పార్సెల్‌లు అందుబాటులో ఉన్నాయి.",
  },
  mr: {
    welcome: "स्वागत आहे",
    welcomeSubtitle: "प्रवास, पार्सल आणि हँडऑफ व्यवस्थापित करा",
    welcomeSubtitleCustomer: "भारतभर पार्सल पाठवा आणि ट्रॅक करा",
    createTrip: "नवीन प्रवास",
    myTrips: "माझे प्रवास",
    myParcels: "माझे पार्सल",
    handoffCodes: "हँडऑफ कोड",
    language: "भाषा",
    signedInAs: "लॉग इन",
    transferOfferTitle: "प्रवास हस्तांतरण थांबले आहे",
    transferOfferBody:
      "दुसऱ्या कंडक्टरने प्रवास ऑफर केला. वेळ संपण्यापूर्वी स्वीकारा.",
    newJobsTitle: "तुमच्या मार्गावर नवीन पार्सल",
    newJobsBody: "पार्सल तुमच्या उघड्या प्रवासाशी जुळतात.",
    acceptLoad: "लोड स्वीकारा",
    viewTrips: "माझे प्रवास पहा",
    viewJobs: "उपलब्ध कामे",
    notificationTransferTitle: "हस्तांतरण स्वीकारा",
    notificationTransferBody: "प्रवास तुम्हाला हस्तांतरित झाला. Patwadi उघडा.",
    notificationJobsTitle: "नवीन कामे",
    notificationJobsBody: "तुमच्या कॉरिडॉरमध्ये पार्सल उपलब्ध आहेत.",
  },
  gu: {
    welcome: "સ્વાગત છે",
    welcomeSubtitle: "ટ્રિપ, પાર્સલ અને હેન્ડઑફ મેનેજ કરો",
    welcomeSubtitleCustomer: "ભારત ભરમાં પાર્સલ મોકલો અને ટ્રેક કરો",
    createTrip: "નવી ટ્રિપ",
    myTrips: "મારી ટ્રિપ",
    myParcels: "મારા પાર્સલ",
    handoffCodes: "હેન્ડઑફ કોડ",
    language: "ભાષા",
    signedInAs: "સાઇન ઇન",
    transferOfferTitle: "ટ્રિપ ટ્રાન્સફર તમારી રાહ જોઈ રહ્યું છે",
    transferOfferBody:
      "બીજા કંડક્ટરે ટ્રિપ ઓફર કરી છે. સમય પૂરો થાય તે પહેલાં સ્વીકારો.",
    newJobsTitle: "તમારા રૂટ પર નવા પાર્સલ",
    newJobsBody: "પાર્સલ તમારી ખુલ્લી ટ્રિપ સાથે મેળ ખાય છે.",
    acceptLoad: "લોડ સ્વીકારો",
    viewTrips: "મારી ટ્રિપ જુઓ",
    viewJobs: "ઉપલબ્ધ જોબ્સ",
    notificationTransferTitle: "ટ્રાન્સફર સ્વીકારો",
    notificationTransferBody: "ટ્રિપ તમને ટ્રાન્સફર થઈ. Patwadi ખોલો.",
    notificationJobsTitle: "નવી જોબ્સ",
    notificationJobsBody: "તમારા કોરિડોરમાં પાર્સલ ઉપલબ્ધ છે.",
  },
};
