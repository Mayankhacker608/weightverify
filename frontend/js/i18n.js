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
      "instrument.title": "Instruments",
      "instrument.register": "Register an instrument",
      "instrument.submit": "Register instrument",
      "application.title": "Verification applications",
      "application.start": "Start a verification",
      "application.submit": "Submit application",
      "certificate.verify": "Verify certificate",
      "dashboard.applicationStatus": "Application status",
      "dashboard.recentActivity": "Recent activity",
      "dashboard.myCertificates": "My certificates",
      "instrument.registered": "My instruments",
      "instrument.photos": "Upload instrument evidence",
      "instrument.type": "Instrument type",
      "instrument.category": "Category",
      "instrument.manufacturer": "Manufacturer",
      "instrument.model": "Model",
      "instrument.serialNumber": "Serial number",
      "instrument.location": "Installation location",
      "application.history": "Application history",
      "application.instrument": "Instrument",
      "application.type": "Request type",
      "application.date": "Preferred date",
      "application.remarks": "Additional information",
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
      "instrument.title": "उपकरण",
      "instrument.register": "उपकरण पंजीकृत करें",
      "instrument.submit": "उपकरण पंजीकृत करें",
      "application.title": "सत्यापन आवेदन",
      "application.start": "सत्यापन शुरू करें",
      "application.submit": "आवेदन जमा करें",
      "certificate.verify": "प्रमाणपत्र सत्यापित करें",
      "dashboard.applicationStatus": "आवेदन स्थिति",
      "dashboard.recentActivity": "हाल की गतिविधि",
      "dashboard.myCertificates": "मेरे प्रमाणपत्र",
      "instrument.registered": "मेरे उपकरण",
      "instrument.photos": "उपकरण साक्ष्य अपलोड करें",
      "instrument.type": "उपकरण का प्रकार",
      "instrument.category": "श्रेणी",
      "instrument.manufacturer": "निर्माता",
      "instrument.model": "मॉडल",
      "instrument.serialNumber": "सीरियल नंबर",
      "instrument.location": "स्थापना स्थान",
      "application.history": "आवेदन इतिहास",
      "application.instrument": "उपकरण",
      "application.type": "अनुरोध का प्रकार",
      "application.date": "पसंदीदा तारीख",
      "application.remarks": "अतिरिक्त जानकारी",
    },
  };

  let language = localStorage.getItem("language");
  const translate = (key) =>
    translations[language]?.[key] || translations.en[key] || key;
  window.translate = translate;

  const applyLanguage = () => {
    document.documentElement.lang = language === "hi" ? "hi" : "en";
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = translate(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.placeholder = translate(element.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute(
        "aria-label",
        translate(element.dataset.i18nAriaLabel),
      );
    });
  };

  const chooseLanguage = (value) => {
    language = value;
    localStorage.setItem("language", value);
    applyLanguage();
    document.getElementById("languageDialog")?.remove();
    document.querySelectorAll(".language-switch button").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.language === value),
      );
    });
  };

  const addLanguageSwitcher = () => {
    const host = document.querySelector(".main-nav, .topbar, .auth-header");
    if (!host || document.querySelector(".language-switch")) return;
    const switcher = document.createElement("div");
    switcher.className = "language-switch";
    switcher.setAttribute("aria-label", translate("language.choose"));
    switcher.innerHTML = `
      <button type="button" data-language="en" aria-pressed="${language === "en"}">${translate("language.english")}</button>
      <button type="button" data-language="hi" aria-pressed="${language === "hi"}">${translate("language.hindi")}</button>
    `;
    switcher.addEventListener("click", (event) => {
      const button = event.target.closest("[data-language]");
      if (button) chooseLanguage(button.dataset.language);
    });
    host.append(switcher);
  };

  const showFirstVisitDialog = () => {
    if (localStorage.getItem("language")) return;
    const dialog = document.createElement("div");
    dialog.id = "languageDialog";
    dialog.className = "language-overlay";
    dialog.innerHTML = `
      <section class="language-dialog" role="dialog" aria-modal="true" aria-labelledby="languageDialogTitle">
        <h2 id="languageDialogTitle">Choose language / भाषा चुनें</h2>
        <div class="language-dialog-actions">
          <button type="button" class="btn btn-primary" data-language="en">English</button>
          <button type="button" class="btn btn-secondary" data-language="hi">हिंदी</button>
        </div>
      </section>
    `;
    dialog.addEventListener("click", (event) => {
      const button = event.target.closest("[data-language]");
      if (button) chooseLanguage(button.dataset.language);
    });
    document.body.append(dialog);
  };

  if (!language) language = "en";
  document.addEventListener("DOMContentLoaded", () => {
    applyLanguage();
    addLanguageSwitcher();
    showFirstVisitDialog();
  });
})();
