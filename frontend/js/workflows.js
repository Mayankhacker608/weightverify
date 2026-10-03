const workflowEscape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );

const setWorkflowMessage = (id, message, type = "success") => {
  const element = document.getElementById(id);
  if (!element) return;
  showMessage(element, message, type);
};

const uploadFiles = async (url, fields, files) => {
  const formData = new FormData();
  Object.entries(fields).forEach(([name, value]) =>
    formData.append(name, value),
  );
  [...files].forEach((file) => formData.append("files", file));
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Upload failed (HTTP ${response.status}).`);
  }
  return data;
};

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const badge = document.getElementById("userNameBadge");
  if (badge && user.name) badge.textContent = `Welcome, ${user.name}`;

  initializeInstruments();
  initializeApplications();
});

async function initializeInstruments() {
  const instrumentForm = document.getElementById("instrumentForm");
  const instrumentRows = document.getElementById("instrumentRows");
  const uploadForm = document.getElementById("instrumentUploadForm");
  const uploadSelect = document.getElementById("uploadInstrument");
  const applicationSelect = document.getElementById("applicationInstrument");
  if (
    !instrumentForm &&
    !instrumentRows &&
    !uploadSelect &&
    !applicationSelect
  ) {
    return;
  }

  let instruments = [];
  const loadInstruments = async () => {
    const data = await apiRequest("/api/instruments");
    instruments = data.instruments || [];
    const empty = document.getElementById("instrumentEmpty");
    if (empty) empty.classList.toggle("hidden", instruments.length > 0);
    if (instrumentRows) {
      instrumentRows.innerHTML = instruments
        .map(
          (instrument) => `<tr>
            <td>${workflowEscape(instrument.instrumentId)}</td>
            <td>${workflowEscape(instrument.type)}</td>
            <td>${workflowEscape(instrument.serialNumber)}</td>
            <td>${workflowEscape(instrument.location)}</td>
            <td>${workflowEscape(instrument.currentStatus)}</td>
            <td>${(instrument.documents || []).length + (instrument.photos || []).length}</td>
          </tr>`,
        )
        .join("");
    }
    if (uploadSelect) {
      uploadSelect.innerHTML = instruments
        .map(
          (instrument) =>
            `<option value="${workflowEscape(instrument._id)}">${workflowEscape(instrument.instrumentId)} · ${workflowEscape(instrument.type)} · ${workflowEscape(instrument.serialNumber)}</option>`,
        )
        .join("");
      uploadSelect.disabled = instruments.length === 0;
    }
    if (applicationSelect) {
      applicationSelect.innerHTML = instruments.length
        ? instruments
            .map(
              (instrument) =>
                `<option value="${workflowEscape(instrument._id)}">${workflowEscape(instrument.instrumentId)} · ${workflowEscape(instrument.type)} · ${workflowEscape(instrument.serialNumber)}</option>`,
            )
            .join("")
        : '<option value="">Register an instrument first</option>';
      applicationSelect.disabled = instruments.length === 0;
      const requestedInstrument = new URLSearchParams(
        window.location.search,
      ).get("instrumentId");
      if (requestedInstrument) applicationSelect.value = requestedInstrument;
    }
  };

  instrumentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(
      [
        "type",
        "category",
        "manufacturer",
        "model",
        "serialNumber",
        "capacity",
        "accuracy",
        "location",
        "purchaseDate",
      ].map((id) => [id, document.getElementById(id).value.trim()]),
    );
    try {
      const data = await apiRequest("/api/instruments", "POST", payload);
      setWorkflowMessage(
        "instrumentMessage",
        `Instrument ${data.instrument.instrumentId} registered.`,
      );
      instrumentForm.reset();
      await loadInstruments();
    } catch (error) {
      setWorkflowMessage("instrumentMessage", error.message, "error");
    }
  });

  const filesInput = document.getElementById("instrumentFiles");
  filesInput?.addEventListener("change", () => {
    const preview = document.getElementById("photoPreview");
    preview.replaceChildren();
    [...filesInput.files].forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const image = document.createElement("img");
      image.alt = file.name;
      image.src = URL.createObjectURL(file);
      image.addEventListener("load", () => URL.revokeObjectURL(image.src), {
        once: true,
      });
      preview.append(image);
    });
  });

  uploadForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const files = filesInput.files;
    if (!files.length || files.length > 5) {
      setWorkflowMessage(
        "uploadMessage",
        "Choose between 1 and 5 files.",
        "error",
      );
      return;
    }
    if ([...files].some((file) => file.size > 5 * 1024 * 1024)) {
      setWorkflowMessage(
        "uploadMessage",
        "Each file must be 5 MB or smaller.",
        "error",
      );
      return;
    }
    try {
      const instrumentId = document.getElementById("uploadInstrument").value;
      const photoType = document.getElementById("photoType").value;
      const data = await uploadFiles(
        `/api/instruments/${encodeURIComponent(instrumentId)}/upload`,
        { photoType },
        files,
      );
      setWorkflowMessage(
        "uploadMessage",
        `${data.files.length} evidence file(s) uploaded.`,
      );
      uploadForm.reset();
      document.getElementById("photoPreview").replaceChildren();
      await loadInstruments();
    } catch (error) {
      setWorkflowMessage("uploadMessage", error.message, "error");
    }
  });

  try {
    await loadInstruments();
  } catch (error) {
    setWorkflowMessage("instrumentMessage", error.message, "error");
  }
}

async function initializeApplications() {
  const applicationForm = document.getElementById("applicationForm");
  const applicationList = document.getElementById("applicationList");
  if (!applicationForm && !applicationList) return;

  const stages = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED_FOR_SCHEDULING",
    "SCHEDULED",
    "FIELD_VERIFICATION",
    "LMO_REVIEW",
    "GATC_REVIEW",
    "FINAL_REVIEW",
    "APPROVED",
    "CERTIFICATE_ISSUED",
  ];

  const loadApplications = async () => {
    const data = await apiRequest("/api/applications");
    const applications = data.applications || [];
    document
      .getElementById("applicationEmpty")
      ?.classList.toggle("hidden", applications.length > 0);
    if (!applicationList) return;
    applicationList.innerHTML = applications
      .map((application) => {
        const currentIndex = stages.indexOf(application.status);
        const isRejected = application.status === "REJECTED";
        const timeline = stages
          .map(
            (stage, index) =>
              `<li class="timeline-step ${index < currentIndex ? "complete" : index === currentIndex ? "current" : "pending"}"><span>${index + 1}</span>${workflowEscape(stage.replaceAll("_", " "))}</li>`,
          )
          .join("");
        const rejection = isRejected
          ? `<p class="rejection-reason"><strong>Correction required:</strong> ${workflowEscape(application.rejectionReason || "Contact the reviewing office for details.")}</p>`
          : "";
        const previousCertificate = application.previousCertificateId
          ? `<p>Previous certificate: ${workflowEscape(application.previousCertificateId.certificateNumber)} · ${workflowEscape(application.previousCertificateId.status)}</p>`
          : "";
        return `<article class="application-history-item">
          <div class="section-head"><h4>${workflowEscape(application.applicationId)} · ${workflowEscape(application.applicationType)}</h4><span class="badge">${workflowEscape(application.status)}</span></div>
          <p>${workflowEscape(application.instrumentId?.instrumentId)} · ${workflowEscape(application.instrumentId?.type)} · Serial ${workflowEscape(application.instrumentId?.serialNumber)}</p>
          ${application.scheduledDate ? `<p>Scheduled: ${workflowEscape(new Date(application.scheduledDate).toLocaleString())} at ${workflowEscape(application.scheduleLocation)}</p>` : ""}
          ${previousCertificate}
          ${rejection}
          <ol class="application-timeline">${timeline}</ol>
        </article>`;
      })
      .join("");
  };

  if (
    new URLSearchParams(window.location.search).get("type") ===
    "Re-Verification"
  ) {
    document.getElementById("applicationType").value = "Re-Verification";
  }

  applicationForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const instrumentId = document.getElementById("applicationInstrument").value;
    if (!instrumentId) {
      setWorkflowMessage(
        "applicationMessage",
        "Register an instrument before applying.",
        "error",
      );
      return;
    }
    try {
      const data = await apiRequest("/api/applications", "POST", {
        instrumentId,
        applicationType: document.getElementById("applicationType").value,
        preferredDate:
          document.getElementById("preferredDate").value || undefined,
        remarks: document.getElementById("remarks").value.trim(),
      });
      setWorkflowMessage(
        "applicationMessage",
        `Application ${data.application.applicationId} submitted.`,
      );
      applicationForm.reset();
      await loadApplications();
    } catch (error) {
      setWorkflowMessage("applicationMessage", error.message, "error");
    }
  });

  try {
    await loadApplications();
  } catch (error) {
    setWorkflowMessage("applicationMessage", error.message, "error");
  }
}
