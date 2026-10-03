document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const accountType = document.getElementById("accountType");
  const staffFields = document.getElementById("staffFields");
  const lmoFields = document.getElementById("lmoFields");
  const gatcFields = document.getElementById("gatcFields");
  const staffDocumentsCard = document.getElementById("staffDocumentsCard");
  const staffDocumentForm = document.getElementById("staffDocumentForm");

  const showStaffDocuments = (role) => {
    if (!staffDocumentsCard) return;
    const documentTypes =
      role === "LMO"
        ? [
            ["appointment", "Appointment / authorization order"],
            ["identity", "Identity document"],
            ["official_id", "Official ID card"],
            ["supporting", "Supporting document"],
          ]
        : [
            ["authorization", "Authorization document"],
            ["facility", "Facility evidence"],
            ["equipment", "Equipment details"],
            ["personnel", "Authorized personnel"],
            ["supporting", "Supporting document"],
          ];
    const select = document.getElementById("staffDocumentType");
    select.innerHTML = documentTypes
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join("");
    staffDocumentsCard.classList.remove("hidden");
  };

  if (sessionStorage.getItem("staffUploadToken")) {
    showStaffDocuments(sessionStorage.getItem("staffUploadRole") || "LMO");
  }

  const updateRegistrationFields = () => {
    if (!accountType || !staffFields) return;
    const role = accountType.value;
    staffFields.hidden = role === "USER";
    lmoFields.hidden = role !== "LMO";
    gatcFields.hidden = role !== "GATC";
    document.getElementById("invitationKey").required = role !== "USER";
    document.getElementById("password").minLength = role === "USER" ? 8 : 12;
    document.getElementById("designation").required = role === "LMO";
    document.getElementById("employeeId").required = role === "LMO";
    document.getElementById("authorizationNumber").required = role === "GATC";
  };

  accountType?.addEventListener("change", updateRegistrationFields);
  updateRegistrationFields();

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const el = document.getElementById("loginMessage");

      try {
        const data = await apiRequest(
          "/api/auth/login",
          "POST",
          {
            email,
            password,
            adminAccessKey: document.getElementById("adminAccessKey")?.value,
          },
          false,
        );
        if (data.pending) {
          sessionStorage.setItem("staffUploadToken", data.uploadToken);
          sessionStorage.setItem("staffUploadRole", data.user.role);
          showStaffDocuments(data.user.role);
          showMessage(el, data.message, "success");
          return;
        }
        sessionStorage.removeItem("staffUploadToken");
        sessionStorage.removeItem("staffUploadRole");
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        showMessage(el, data.message || "Login successful.", "success");
        window.location.href = "./dashboard.html";
      } catch (error) {
        showMessage(el, error.message, "error");
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        organization: document.getElementById("organization").value,
        address: document.getElementById("address").value,
        state: document.getElementById("state").value,
        district: document.getElementById("district").value,
        password: document.getElementById("password").value,
      };
      const role = accountType?.value || "USER";
      const el = document.getElementById("registerMessage");

      try {
        const data = await apiRequest(
          role === "USER" ? "/api/auth/register" : "/api/auth/staff-register",
          "POST",
          role === "USER"
            ? payload
            : {
                ...payload,
                role,
                invitationKey: document.getElementById("invitationKey").value,
                designation: document.getElementById("designation").value,
                employeeId: document.getElementById("employeeId").value,
                authorizationNumber: document.getElementById(
                  "authorizationNumber",
                ).value,
              },
          false,
        );
        if (role !== "USER") {
          sessionStorage.setItem("staffUploadToken", data.uploadToken);
          sessionStorage.setItem("staffUploadRole", data.user.role);
          showMessage(
            el,
            data.message || "Registration submitted for administrator review.",
            "success",
          );
          registerForm.hidden = true;
          showStaffDocuments(data.user.role);
          registerForm.reset();
          updateRegistrationFields();
          return;
        }
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        showMessage(el, data.message || "Registration successful.", "success");
        setTimeout(() => (window.location.href = "./dashboard.html"), 600);
      } catch (error) {
        showMessage(el, error.message, "error");
      }
    });
  }

  if (staffDocumentForm) {
    staffDocumentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const token = sessionStorage.getItem("staffUploadToken");
      const files = document.getElementById("staffDocumentFiles").files;
      const message = document.getElementById("staffDocumentMessage");
      if (!token) {
        showMessage(
          message,
          "Sign in again to continue document upload.",
          "error",
        );
        return;
      }
      if (!files.length) {
        showMessage(message, "Choose at least one document.", "error");
        return;
      }

      const formData = new FormData();
      formData.append(
        "documentType",
        document.getElementById("staffDocumentType").value,
      );
      [...files].forEach((file) => formData.append("files", file));
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/users/me/staff-documents`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(
            data.message || `Upload failed (HTTP ${response.status}).`,
          );
        showMessage(
          message,
          `${data.documents.length} document(s) uploaded for review.`,
          "success",
        );
        document.getElementById("staffDocumentFiles").value = "";
      } catch (error) {
        showMessage(message, error.message, "error");
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "./login.html";
    });
  }

  if (window.location.pathname.endsWith("dashboard.html")) {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "./login.html";
    }
  }
});
