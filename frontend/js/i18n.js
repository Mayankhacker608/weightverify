(() => {
  const translations = {
    en: {
      "language.choose": "Choose language",
      "language.english": "English",
      "language.hindi": "हिंदी",

      "nav.dashboard": "Dashboard",
      "nav.instruments": "Instruments",
      "nav.applications": "Applications",
      "nav.verify": "Verify Certificate",
      "nav.login": "Login",
      "nav.register": "Register",
      "nav.logout": "Logout",

      "common.createAccount": "Create account",
      "common.submitApplication": "Submit application",
      "common.verify": "Verify",
      "common.upload": "Upload evidence",
      "common.valid": "VALID",
      "common.expiringSoon": "EXPIRING SOON",
      "common.expired": "EXPIRED",
      "common.revoked": "REVOKED",
      "common.pending": "PENDING",
      "common.rejected": "REJECTED",

      "auth.registerTitle": "Create account",
      "auth.loginTitle": "Login",
      "auth.secureAccess": "Secure access",
      "auth.registerEyebrow": "Professional registration",
      "auth.loginDescription":
        "Access your verification dashboard and certificate records.",

      "form.fullName": "Full name",
      "form.email": "Email address",
      "form.phone": "Mobile number",
      "form.organization": "Organization",
      "form.state": "State",
      "form.district": "District",
      "form.address": "Address",
      "form.password": "Password",
      "form.accountType": "Account type",
      "form.businessUser": "Business / individual",
      "form.lmo": "LMO officer",
      "form.gatc": "GATC organization",
      "form.invitationKey": "Special registration key",
      "form.designation": "Official designation",
      "form.employeeId": "Employee / officer ID",
      "form.authorizationNumber": "Authorization number",

      "common.login": "Login",
      "common.register": "Register",
      "common.applyVerification": "Apply for Verification",

      "dashboard.operations": "Operations dashboard",
      "dashboard.welcome": "Welcome back",
      "dashboard.instruments": "Registered instruments",
      "dashboard.applications": "Applications",
      "dashboard.pending": "Pending review",
      "dashboard.certificates": "Valid certificates",
      "dashboard.applicationStatus": "Application status",
      "dashboard.recentActivity": "Recent activity",
      "dashboard.myCertificates": "My certificates",
      "dashboard.notifications": "Notifications",
      "dashboard.noCertificates": "No certificates issued yet.",
      "dashboard.noNotifications": "No notifications yet.",

      "instrument.title": "Instruments",
      "instrument.register": "Register an instrument",
      "instrument.submit": "Register instrument",
      "instrument.registered": "My instruments",
      "instrument.photos": "Upload instrument evidence",
      "instrument.type": "Instrument type",
      "instrument.category": "Category",
      "instrument.manufacturer": "Manufacturer",
      "instrument.model": "Model",
      "instrument.serialNumber": "Serial number",
      "instrument.location": "Installation location",
      "instrument.selectCategory": "Select category",
      "instrument.capacity": "Capacity",
      "instrument.accuracy": "Accuracy / class",
      "instrument.purchaseDate": "Purchase date",
      "instrument.id": "Instrument ID",
      "instrument.files": "Photos / documents",
      "instrument.empty": "No instruments registered yet.",
      "instrument.photoView": "Photo view",
      "instrument.fileHelp": "JPEG, PNG, or PDF (up to 5 files, 5 MB each)",

      "category.weight": "Weight",
      "category.measure": "Measure",
      "category.volume": "Volume",
      "category.other": "Other",

      "photo.front": "Front",
      "photo.back": "Back",
      "photo.side": "Side",
      "photo.serialPlate": "Serial number / nameplate",
      "photo.location": "Installation / location",
      "photo.additional": "Additional evidence",

      "application.title": "Verification applications",
      "application.start": "Start a verification",
      "application.submit": "Submit application",
      "application.history": "Application history",
      "application.instrument": "Instrument",
      "application.type": "Request type",
      "application.date": "Preferred date",
      "application.remarks": "Additional information",
      "application.initial": "Initial Verification",
      "application.reverification": "Re-Verification",
      "application.empty":
        "No applications yet. Register an instrument to begin.",

      "certificate.verify": "Verify certificate",

      /* Themed application pages */
      "theme.toggle": "Toggle light and dark theme",
      "brand.service": "Citizen service",
      "workspace.user": "User workspace",

      "common.type": "Type",
      "common.location": "Location",
      "common.status": "Status",

      /* Staff */
      "staff.eyebrow": "Authorized field work",
      "staff.title": "Assigned work",
      "staff.empty": "No assigned work is waiting for you.",

      /* Admin */
      "admin.eyebrow": "Administration",
      "admin.title": "Staff onboarding",
      "admin.createKey": "Create invitation key",
      "admin.role": "Staff role",
      "admin.organizationOptional": "Organization (optional)",
      "admin.stateOptional": "State (optional)",
      "admin.districtOptional": "District (optional)",
      "admin.generate": "Generate one-time key",
      "admin.issuedKeys": "Issued keys",
      "admin.pendingStaff": "Pending staff applications",
      "admin.reviewAssign": "Application review and assignment",
    },

    hi: {
      "language.choose": "भाषा चुनें",
      "language.english": "English",
      "language.hindi": "हिंदी",

      "nav.dashboard": "डैशबोर्ड",
      "nav.instruments": "उपकरण",
      "nav.applications": "आवेदन",
      "nav.verify": "प्रमाणपत्र सत्यापित करें",
      "nav.login": "लॉगिन",
      "nav.register": "पंजीकरण",
      "nav.logout": "लॉगआउट",

      "common.createAccount": "खाता बनाएँ",
      "common.submitApplication": "आवेदन जमा करें",
      "common.verify": "सत्यापित करें",
      "common.upload": "साक्ष्य अपलोड करें",
      "common.valid": "वैध",
      "common.expiringSoon": "शीघ्र समाप्त होगा",
      "common.expired": "समाप्त",
      "common.revoked": "रद्द",
      "common.pending": "लंबित",
      "common.rejected": "अस्वीकृत",

      "auth.registerTitle": "खाता बनाएँ",
      "auth.loginTitle": "लॉगिन",
      "auth.secureAccess": "सुरक्षित प्रवेश",
      "auth.registerEyebrow": "व्यावसायिक पंजीकरण",
      "auth.loginDescription":
        "अपने सत्यापन डैशबोर्ड और प्रमाणपत्र रिकॉर्ड देखें।",

      "form.fullName": "पूरा नाम",
      "form.email": "ईमेल पता",
      "form.phone": "मोबाइल नंबर",
      "form.organization": "संस्था",
      "form.state": "राज्य",
      "form.district": "ज़िला",
      "form.address": "पता",
      "form.password": "पासवर्ड",
      "form.accountType": "खाते का प्रकार",
      "form.businessUser": "व्यवसाय / व्यक्ति",
      "form.lmo": "LMO अधिकारी",
      "form.gatc": "GATC संस्था",
      "form.invitationKey": "विशेष पंजीकरण कुंजी",
      "form.designation": "आधिकारिक पदनाम",
      "form.employeeId": "कर्मचारी / अधिकारी आईडी",
      "form.authorizationNumber": "प्राधिकरण संख्या",

      "common.login": "लॉगिन",
      "common.register": "पंजीकरण",
      "common.applyVerification": "सत्यापन के लिए आवेदन करें",

      "dashboard.operations": "कार्य डैशबोर्ड",
      "dashboard.welcome": "वापसी पर स्वागत है",
      "dashboard.instruments": "पंजीकृत उपकरण",
      "dashboard.applications": "आवेदन",
      "dashboard.pending": "समीक्षा लंबित",
      "dashboard.certificates": "वैध प्रमाणपत्र",
      "dashboard.applicationStatus": "आवेदन स्थिति",
      "dashboard.recentActivity": "हाल की गतिविधि",
      "dashboard.myCertificates": "मेरे प्रमाणपत्र",
      "dashboard.notifications": "सूचनाएँ",
      "dashboard.noCertificates": "अभी तक कोई प्रमाणपत्र जारी नहीं हुआ है।",
      "dashboard.noNotifications": "अभी कोई सूचना नहीं है।",

      "instrument.title": "उपकरण",
      "instrument.register": "उपकरण पंजीकृत करें",
      "instrument.submit": "उपकरण पंजीकृत करें",
      "instrument.registered": "मेरे उपकरण",
      "instrument.photos": "उपकरण साक्ष्य अपलोड करें",
      "instrument.type": "उपकरण का प्रकार",
      "instrument.category": "श्रेणी",
      "instrument.manufacturer": "निर्माता",
      "instrument.model": "मॉडल",
      "instrument.serialNumber": "सीरियल नंबर",
      "instrument.location": "स्थापना स्थान",
      "instrument.selectCategory": "श्रेणी चुनें",
      "instrument.capacity": "क्षमता",
      "instrument.accuracy": "सटीकता / श्रेणी",
      "instrument.purchaseDate": "खरीद की तारीख",
      "instrument.id": "उपकरण आईडी",
      "instrument.files": "फ़ोटो / दस्तावेज़",
      "instrument.empty": "अभी तक कोई उपकरण पंजीकृत नहीं है।",
      "instrument.photoView": "फ़ोटो का दृश्य",
      "instrument.fileHelp":
        "JPEG, PNG या PDF (अधिकतम 5 फ़ाइलें, प्रत्येक 5 MB)",

      "category.weight": "वज़न",
      "category.measure": "माप",
      "category.volume": "आयतन",
      "category.other": "अन्य",

      "photo.front": "सामने",
      "photo.back": "पीछे",
      "photo.side": "बगल",
      "photo.serialPlate": "सीरियल नंबर / नेमप्लेट",
      "photo.location": "स्थापना / स्थान",
      "photo.additional": "अतिरिक्त साक्ष्य",

      "application.title": "सत्यापन आवेदन",
      "application.start": "सत्यापन शुरू करें",
      "application.submit": "आवेदन जमा करें",
      "application.history": "आवेदन इतिहास",
      "application.instrument": "उपकरण",
      "application.type": "अनुरोध का प्रकार",
      "application.date": "पसंदीदा तारीख",
      "application.remarks": "अतिरिक्त जानकारी",
      "application.initial": "प्रारंभिक सत्यापन",
      "application.reverification": "पुनः सत्यापन",
      "application.empty":
        "अभी कोई आवेदन नहीं है। शुरू करने के लिए उपकरण पंजीकृत करें।",

      "certificate.verify": "प्रमाणपत्र सत्यापित करें",

      /* Themed application pages */
      "theme.toggle": "लाइट और डार्क थीम बदलें",
      "brand.service": "नागरिक सेवा",
      "workspace.user": "उपयोगकर्ता कार्यक्षेत्र",

      "common.type": "प्रकार",
      "common.location": "स्थान",
      "common.status": "स्थिति",

      /* Staff */
      "staff.eyebrow": "अधिकृत क्षेत्रीय कार्य",
      "staff.title": "सौंपा गया कार्य",
      "staff.empty": "आपके लिए कोई कार्य लंबित नहीं है।",

      /* Admin */
      "admin.eyebrow": "प्रशासन",
      "admin.title": "स्टाफ ऑनबोर्डिंग",
      "admin.createKey": "आमंत्रण कुंजी बनाएँ",
      "admin.role": "स्टाफ की भूमिका",
      "admin.organizationOptional": "संस्था (वैकल्पिक)",
      "admin.stateOptional": "राज्य (वैकल्पिक)",
      "admin.districtOptional": "ज़िला (वैकल्पिक)",
      "admin.generate": "एकबारगी कुंजी बनाएँ",
      "admin.issuedKeys": "जारी की गई कुंजियाँ",
      "admin.pendingStaff": "लंबित स्टाफ आवेदन",
      "admin.reviewAssign": "आवेदन समीक्षा और आवंटन",
    },
  };

  /* ---------------------------------------------
     LANGUAGE STATE
  --------------------------------------------- */

  let language = localStorage.getItem("language");

  if (!language || !translations[language]) {
    language = "en";
  }

  /* ---------------------------------------------
     TRANSLATION FUNCTION
  --------------------------------------------- */

  const translate = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  window.translate = translate;

  /* ---------------------------------------------
     APPLY TRANSLATIONS
     Works with entire document OR any container
  --------------------------------------------- */

  const applyLanguage = (root = document) => {
    document.documentElement.lang = language === "hi" ? "hi" : "en";

    root.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = translate(element.dataset.i18n);
    });

    root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.placeholder = translate(element.dataset.i18nPlaceholder);
    });

    root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute(
        "aria-label",
        translate(element.dataset.i18nAriaLabel),
      );
    });

    /* Support title translation */
    root.querySelectorAll("[data-i18n-title]").forEach((element) => {
      element.setAttribute("title", translate(element.dataset.i18nTitle));
    });

    /* Support value translation */
    root.querySelectorAll("[data-i18n-value]").forEach((element) => {
      element.value = translate(element.dataset.i18nValue);
    });
  };

  /*
    Other JS files can use:

    window.applyTranslations(container);

    Example:
    window.applyTranslations(document.querySelector(".dashboard"));
  */

  window.applyTranslations = applyLanguage;

  /* ---------------------------------------------
     LANGUAGE CHANGE
  --------------------------------------------- */

  const chooseLanguage = (value) => {
    if (!translations[value]) return;

    language = value;

    localStorage.setItem("language", value);

    applyLanguage();

    /* Remove first-visit dialog */
    document.getElementById("languageDialog")?.remove();

    /* Update language buttons */
    document.querySelectorAll(".language-switch button").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.language === value),
      );
    });

    /* Update switcher label */
    const switcher = document.querySelector(".language-switch");

    if (switcher) {
      switcher.setAttribute("aria-label", translate("language.choose"));
    }

    /*
      Notify dashboard.js / workflows.js / other scripts
      that language has changed.
    */

    document.dispatchEvent(
      new CustomEvent("languagechange", {
        detail: {
          language: value,
        },
      }),
    );
  };

  window.chooseLanguage = chooseLanguage;

  /* ---------------------------------------------
     LANGUAGE SWITCHER
  --------------------------------------------- */

  const addLanguageSwitcher = () => {
    const host =
      document.querySelector(".top-actions") ||
      document.querySelector(".main-nav") ||
      document.querySelector(".topbar") ||
      document.querySelector(".auth-header");

    if (!host) return;

    /* Don't create duplicate switchers */
    if (document.querySelector(".language-switch")) return;

    const switcher = document.createElement("div");

    switcher.className = "language-switch";

    switcher.setAttribute("aria-label", translate("language.choose"));

    switcher.innerHTML = `
      <button
        type="button"
        data-language="en"
        aria-pressed="${language === "en"}"
      >
        ${translate("language.english")}
      </button>

      <button
        type="button"
        data-language="hi"
        aria-pressed="${language === "hi"}"
      >
        ${translate("language.hindi")}
      </button>
    `;

    switcher.addEventListener("click", (event) => {
      const button = event.target.closest("[data-language]");

      if (!button) return;

      chooseLanguage(button.dataset.language);
    });

    host.appendChild(switcher);
  };

  /* ---------------------------------------------
     FIRST VISIT LANGUAGE DIALOG
  --------------------------------------------- */

  const showFirstVisitDialog = () => {
    /*
      If language already exists, don't show dialog.
    */

    if (localStorage.getItem("language")) return;

    /* Prevent duplicate dialog */
    if (document.getElementById("languageDialog")) return;

    const dialog = document.createElement("div");

    dialog.id = "languageDialog";

    dialog.className = "language-overlay";

    dialog.innerHTML = `
      <section
        class="language-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="languageDialogTitle"
      >

        <h2 id="languageDialogTitle">
          Choose language / भाषा चुनें
        </h2>

        <div class="language-dialog-actions">

          <button
            type="button"
            class="btn btn-primary"
            data-language="en"
          >
            English
          </button>

          <button
            type="button"
            class="btn btn-secondary"
            data-language="hi"
          >
            हिंदी
          </button>

        </div>

      </section>
    `;

    dialog.addEventListener("click", (event) => {
      const button = event.target.closest("[data-language]");

      if (!button) return;

      chooseLanguage(button.dataset.language);
    });

    document.body.appendChild(dialog);
  };

  /* ---------------------------------------------
     INITIALIZE
  --------------------------------------------- */

  document.addEventListener("DOMContentLoaded", () => {
    applyLanguage();

    addLanguageSwitcher();

    showFirstVisitDialog();
  });

  /* ---------------------------------------------
     HANDLE DYNAMIC CONTENT
     
     If dashboard/workflow JS inserts new HTML,
     it can call:
     
     window.applyTranslations(newContainer);
  --------------------------------------------- */

  document.addEventListener("languagechange", () => {
    /*
      Re-apply static page translations after
      language changes.
    */
    applyLanguage();
  });
})();
