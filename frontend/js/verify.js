const resultEl = document.getElementById("verifyResult");
const certificateInput = document.getElementById("certificateNumber");
const statusLabels = {
  VALID: "VALID",
  EXPIRING_SOON: "EXPIRING SOON",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
  NOT_FOUND: "NOT FOUND",
};

const appendDetail = (container, label, value) => {
  const row = document.createElement("p");
  const key = document.createElement("strong");
  key.textContent = `${label}: `;
  row.append(key, document.createTextNode(value || "N/A"));
  container.append(row);
};

const verifyCertificate = async () => {
  const certificateNumber = certificateInput.value.trim();
  if (!certificateNumber) {
    resultEl.className = "alert error";
    resultEl.textContent = "Certificate number is required.";
    resultEl.classList.remove("hidden");
    return;
  }

  const button = document.getElementById("verifyButton");
  button.disabled = true;
  button.textContent = "Checking...";
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/certificates/verify/${encodeURIComponent(certificateNumber)}`,
    );
    const data = await response.json().catch(() => ({}));
    resultEl.classList.remove("hidden");

    if (!response.ok) {
      resultEl.className = "alert error";
      resultEl.textContent = data.message || "Certificate not found.";
      return;
    }

    const certificate = data.certificate || {};
    const instrument = certificate.instrumentId || {};
    const owner = certificate.ownerId || {};
    const verification = certificate.verificationId || {};
    resultEl.className = `alert ${data.status === "VALID" ? "success" : data.status === "EXPIRING_SOON" ? "warning" : "error"}`;
    resultEl.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = statusLabels[data.status] || "CERTIFICATE STATUS";
    resultEl.append(heading);
    appendDetail(resultEl, "Certificate number", certificate.certificateNumber);
    appendDetail(
      resultEl,
      "Instrument",
      `${instrument.type || "N/A"} · ${instrument.category || "N/A"}`,
    );
    appendDetail(resultEl, "Serial number", instrument.serialNumber);
    appendDetail(resultEl, "Business", owner.organization || owner.name);
    appendDetail(
      resultEl,
      "Verification date",
      verification.verifiedAt
        ? new Date(verification.verifiedAt).toLocaleDateString()
        : "N/A",
    );
    appendDetail(
      resultEl,
      "Valid until",
      certificate.validUntil
        ? new Date(certificate.validUntil).toLocaleDateString()
        : "N/A",
    );
    appendDetail(resultEl, "Authority", certificate.authority);
  } catch (error) {
    resultEl.classList.remove("hidden");
    resultEl.className = "alert error";
    resultEl.textContent =
      "Certificate verification failed. Check your connection and try again.";
  } finally {
    button.disabled = false;
    button.textContent = "Verify";
  }
};

document
  .getElementById("verifyButton")
  .addEventListener("click", verifyCertificate);
certificateInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") verifyCertificate();
});

const certificateFromQr = new URLSearchParams(window.location.search).get(
  "certificateNumber",
);
if (certificateFromQr) {
  certificateInput.value = certificateFromQr;
  verifyCertificate();
}
