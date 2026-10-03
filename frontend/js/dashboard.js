const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userNameBadge = document.getElementById("userNameBadge");
  if (userNameBadge && user.name) {
    userNameBadge.textContent = `Welcome, ${user.name}`;
  }
  if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    initializeAdminTools();
  }
  if (["LMO", "GATC"].includes(user.role)) {
    initializeStaffWorkspace(user.role);
  }

  try {
    const [instrumentsRes, appsRes, certificatesRes, notificationsRes] =
      await Promise.all([
        apiRequest("/api/instruments", "GET", null, true),
        apiRequest("/api/applications", "GET", null, true),
        apiRequest("/api/certificates", "GET", null, true),
        apiRequest("/api/notifications", "GET", null, true),
      ]);

    const instruments = instrumentsRes.instruments || [];
    const applications = appsRes.applications || [];
    const certificates = certificatesRes.certificates || [];
    const notifications = notificationsRes.notifications || [];

    document.getElementById("statInstruments").textContent = String(
      instruments.length,
    );
    document.getElementById("statApplications").textContent = String(
      applications.length,
    );
    document.getElementById("statPending").textContent = String(
      applications.filter((item) =>
        ["SUBMITTED", "UNDER_REVIEW", "SCHEDULED"].includes(item.status),
      ).length,
    );
    document.getElementById("statCertificates").textContent = String(
      certificates.filter((certificate) =>
        ["VALID", "EXPIRING_SOON"].includes(certificate.status),
      ).length,
    );
    renderCertificates(certificates);
    renderNotifications(notifications, notificationsRes.unreadCount || 0);

    const activityList = document.getElementById("activityList");
    if (activityList) {
      activityList.innerHTML =
        applications
          .slice(0, 5)
          .map(
            (app) => `
        <li>
          <div><strong>${escapeHtml(app.applicationType)}</strong></div>
          <div>Status: ${escapeHtml(app.status)}</div>
        </li>
      `,
          )
          .join("") || '<li class="text-slate-500">No activity yet.</li>';
    }

    const counts = {
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      SCHEDULED: 0,
      VERIFIED: 0,
      REJECTED: 0,
    };

    applications.forEach((app) => {
      if (counts[app.status] !== undefined) counts[app.status] += 1;
    });

    const statusChart = document.getElementById("statusChart");
    if (statusChart) {
      const maximum = Math.max(applications.length, 1);
      statusChart.innerHTML = Object.entries(counts)
        .map(
          ([status, count]) => `
            <div class="status-row">
              <div class="status-row-head"><span>${status.replaceAll("_", " ")}</span><strong>${count}</strong></div>
              <progress max="${maximum}" value="${count}" aria-label="${status.replaceAll("_", " ")}: ${count}"></progress>
            </div>
          `,
        )
        .join("");
    }
  } catch (error) {
    console.error(error);
    const activityList = document.getElementById("activityList");
    if (activityList) {
      activityList.innerHTML =
        '<li class="text-red-600">Unable to load dashboard data.</li>';
    }
  }
});

function renderCertificates(certificates) {
  const certificateList = document.getElementById("certificateList");
  const emptyState = document.getElementById("certificateEmpty");
  if (!certificateList) return;
  if (emptyState)
    emptyState.classList.toggle("hidden", certificates.length > 0);
  certificateList.innerHTML = certificates
    .map(
      (certificate) => `<article class="certificate-row">
        <div><strong>${escapeHtml(certificate.certificateNumber)}</strong><span class="badge certificate-status ${escapeHtml(certificate.status)}">${escapeHtml(certificate.status)}</span></div>
        <p>${escapeHtml(certificate.instrumentId?.type)} · Serial ${escapeHtml(certificate.instrumentId?.serialNumber)}</p>
        <p>Valid until ${escapeHtml(new Date(certificate.validUntil).toLocaleDateString())}</p>
        <div class="certificate-actions"><button class="btn btn-secondary certificate-download" data-id="${escapeHtml(certificate._id)}" data-kind="pdf" type="button">Download PDF</button><button class="btn btn-secondary certificate-download" data-id="${escapeHtml(certificate._id)}" data-kind="qr" type="button">Download QR</button>${["EXPIRED", "EXPIRING_SOON"].includes(certificate.status) && certificate.instrumentId?._id ? `<a class="btn btn-primary" href="./applications.html?instrumentId=${encodeURIComponent(certificate.instrumentId._id)}&type=Re-Verification">Start re-verification</a>` : ""}</div>
      </article>`,
    )
    .join("");

  certificateList.addEventListener("click", async (event) => {
    const button = event.target.closest(".certificate-download");
    if (!button) return;
    button.disabled = true;
    try {
      const extension = button.dataset.kind === "pdf" ? "pdf" : "qr";
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/certificates/${encodeURIComponent(button.dataset.id)}/${extension}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message || `Download failed (HTTP ${response.status}).`,
        );
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${button.dataset.id}.${extension === "qr" ? "png" : "pdf"}`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      const message = document.getElementById("dashboardMessage");
      if (message) showMessage(message, error.message, "error");
    } finally {
      button.disabled = false;
    }
  });
}

function renderNotifications(notifications, unreadCount) {
  const list = document.getElementById("notificationList");
  const emptyState = document.getElementById("notificationEmpty");
  const unreadBadge = document.getElementById("unreadNotificationCount");
  if (!list) return;
  if (emptyState)
    emptyState.classList.toggle("hidden", notifications.length > 0);
  if (unreadBadge) unreadBadge.textContent = `${unreadCount} unread`;
  list.innerHTML = notifications
    .map(
      (
        notification,
      ) => `<li class="notification-item ${notification.read ? "read" : "unread"}">
        <div><strong>${escapeHtml(notification.title)}</strong></div>
        <p>${escapeHtml(notification.message)}</p>
        <small>${escapeHtml(new Date(notification.createdAt).toLocaleString())}</small>
        ${notification.read ? "" : `<button class="btn btn-secondary mark-notification-read" data-id="${escapeHtml(notification._id)}" type="button">Mark read</button>`}
      </li>`,
    )
    .join("");
  list.addEventListener(
    "click",
    async (event) => {
      const button = event.target.closest(".mark-notification-read");
      if (!button) return;
      try {
        await apiRequest(
          `/api/notifications/${encodeURIComponent(button.dataset.id)}/read`,
          "PUT",
          {},
        );
        const updated = notifications.map((notification) =>
          notification._id === button.dataset.id
            ? { ...notification, read: true }
            : notification,
        );
        renderNotifications(updated, Math.max(0, unreadCount - 1));
      } catch (error) {
        const message = document.getElementById("dashboardMessage");
        if (message) showMessage(message, error.message, "error");
      }
    },
    { once: true },
  );
}

async function initializeAdminTools() {
  const adminTools = document.getElementById("adminTools");
  const invitationForm = document.getElementById("invitationForm");
  const invitationMessage = document.getElementById("invitationMessage");
  const invitationList = document.getElementById("invitationList");
  const pendingStaffList = document.getElementById("pendingStaffList");
  const adminApplicationsList = document.getElementById(
    "adminApplicationsList",
  );
  if (!adminTools || !invitationForm) return;
  adminTools.classList.remove("hidden");

  const loadOnboarding = async () => {
    const [invitationData, staffData] = await Promise.all([
      apiRequest("/api/invitations"),
      apiRequest("/api/users/staff/pending"),
    ]);
    invitationList.innerHTML = invitationData.invitations.length
      ? invitationData.invitations
          .map(
            (invitation) => `
              <li>
                <div><strong>${escapeHtml(invitation.role)}</strong> · ${escapeHtml(invitation.status)}</div>
                <div>${escapeHtml(invitation.organization || "Any organization")} · ${escapeHtml(invitation.state || "Any state")}${invitation.district ? ` · ${escapeHtml(invitation.district)}` : ""}</div>
                <small>Expires ${escapeHtml(new Date(invitation.expiresAt).toLocaleDateString())}</small>
                ${invitation.status === "ACTIVE" ? `<button class="btn btn-secondary invitation-revoke" data-id="${escapeHtml(invitation.id)}" type="button">Revoke</button>` : ""}
              </li>
            `,
          )
          .join("")
      : "<li>No invitation keys.</li>";

    pendingStaffList.innerHTML = staffData.users.length
      ? staffData.users
          .map(
            (staff) => `
              <li class="staff-review-item" data-id="${escapeHtml(staff._id)}">
                <div><strong>${escapeHtml(staff.name)}</strong> · ${escapeHtml(staff.role)}</div>
                <div>${escapeHtml(staff.organization)} · ${escapeHtml(staff.state)}, ${escapeHtml(staff.district)}</div>
                <div>${escapeHtml(staff.email)} · ${escapeHtml(staff.phone)}</div>
                <div>${escapeHtml(staff.staffProfile?.designation || staff.staffProfile?.authorizationNumber || "")}</div>
                <label class="sr-only" for="review-${escapeHtml(staff._id)}">Rejection or resubmission reason</label>
                <input id="review-${escapeHtml(staff._id)}" class="staff-review-reason" placeholder="Reason required for rejection or resubmission" maxlength="1000" />
                <div class="review-actions">
                  <button class="btn btn-primary staff-review-action" data-decision="VERIFIED" type="button">Approve</button>
                  <button class="btn btn-secondary staff-review-action" data-decision="RESUBMISSION_REQUIRED" type="button">Request resubmission</button>
                  <button class="btn btn-secondary staff-review-action" data-decision="REJECTED" type="button">Reject</button>
                </div>
              </li>
            `,
          )
          .join("")
      : "<li>No pending staff applications.</li>";
  };

  const loadAdminApplications = async () => {
    if (!adminApplicationsList) return;
    const [applicationsData, lmoData, gatcData] = await Promise.all([
      apiRequest("/api/applications"),
      apiRequest("/api/users/authorized-staff?role=LMO"),
      apiRequest("/api/users/authorized-staff?role=GATC"),
    ]);
    const lmoOptions = lmoData.staff
      .map(
        (staff) =>
          `<option value="${escapeHtml(staff._id)}">${escapeHtml(staff.name)} · ${escapeHtml(staff.state)}, ${escapeHtml(staff.district)} · workload ${escapeHtml(staff.workload)}</option>`,
      )
      .join("");
    const gatcOptions = gatcData.staff
      .map(
        (staff) =>
          `<option value="${escapeHtml(staff._id)}">${escapeHtml(staff.organization || staff.name)} · workload ${escapeHtml(staff.workload)}</option>`,
      )
      .join("");
    const applications = applicationsData.applications || [];
    adminApplicationsList.innerHTML = applications.length
      ? applications
          .map((application) => {
            const status = application.status;
            const reviewAction =
              status === "SUBMITTED"
                ? `<button class="btn btn-primary application-review-action" data-id="${escapeHtml(application._id)}" data-next="UNDER_REVIEW" type="button">Start review</button>`
                : status === "UNDER_REVIEW"
                  ? `<button class="btn btn-primary application-review-action" data-id="${escapeHtml(application._id)}" data-next="APPROVED_FOR_SCHEDULING" type="button">Approve for scheduling</button>`
                  : "";
            const rejectAction = ![
              "REJECTED",
              "CERTIFICATE_ISSUED",
              "CERTIFICATE_GENERATED",
              "CANCELLED",
            ].includes(status)
              ? `<div class="review-actions"><input class="application-rejection-reason" aria-label="Rejection reason for ${escapeHtml(application.applicationId)}" placeholder="Required if rejecting" maxlength="1000"><button class="btn btn-secondary application-review-action" data-id="${escapeHtml(application._id)}" data-next="REJECTED" type="button">Reject</button></div>`
              : "";
            const assignmentForm = [
              "APPROVED_FOR_SCHEDULING",
              "ASSIGNED",
            ].includes(status)
              ? `<form class="application-schedule-form form-grid two-up" data-id="${escapeHtml(application._id)}">
                  <div class="field-group"><label>LMO</label><select name="officerId"><option value="">No LMO selected</option>${lmoOptions}</select></div>
                  <div class="field-group"><label>GATC (optional)</label><select name="gatcId"><option value="">No GATC</option>${gatcOptions}</select></div>
                  <div class="field-group"><label>Inspection date</label><input name="scheduledDate" type="date" required min="${new Date().toISOString().slice(0, 10)}" value="${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}"></div>
                  <div class="field-group"><label>Inspection location</label><input name="scheduleLocation" required maxlength="200" value="${escapeHtml(application.instrumentId?.location || "")}"></div>
                  <button class="btn btn-primary full-width application-schedule-trigger" type="button">Assign and schedule</button>
                </form>`
              : "";
            return `<li class="admin-application-item">
              <div class="application-summary"><strong>${escapeHtml(application.applicationId)}</strong> · ${escapeHtml(status)}</div>
              <div>${escapeHtml(application.applicationType)} · ${escapeHtml(application.applicantId?.organization || application.applicantId?.name)} · ${escapeHtml(application.instrumentId?.type)} · Serial ${escapeHtml(application.instrumentId?.serialNumber)}</div>
              ${application.assignedOfficer ? `<div>LMO: ${escapeHtml(application.assignedOfficer.name)}</div>` : ""}
              ${application.assignedGATC ? `<div>GATC: ${escapeHtml(application.assignedGATC.organization || application.assignedGATC.name)}</div>` : ""}
              ${reviewAction}${rejectAction}${assignmentForm}
            </li>`;
          })
          .join("")
      : "<li>No verification applications.</li>";
  };

  invitationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = await apiRequest("/api/invitations", "POST", {
        role: document.getElementById("invitationRole").value,
        organization:
          document.getElementById("invitationOrganization").value.trim() ||
          undefined,
        state:
          document.getElementById("invitationState").value.trim() || undefined,
        district:
          document.getElementById("invitationDistrict").value.trim() ||
          undefined,
      });
      showMessage(
        invitationMessage,
        `Copy this one-time ${data.invitation.role} key now: ${data.invitationKey}`,
        "success",
      );
      invitationForm.reset();
      await loadOnboarding();
    } catch (error) {
      showMessage(invitationMessage, error.message, "error");
    }
  });

  adminTools.addEventListener("click", async (event) => {
    const revokeButton = event.target.closest(".invitation-revoke");
    const reviewButton = event.target.closest(".staff-review-action");
    try {
      if (revokeButton) {
        await apiRequest(
          `/api/invitations/${encodeURIComponent(revokeButton.dataset.id)}/revoke`,
          "PUT",
          {},
        );
      }
      if (reviewButton) {
        const reviewItem = reviewButton.closest(".staff-review-item");
        const decision = reviewButton.dataset.decision;
        const reason = reviewItem
          .querySelector(".staff-review-reason")
          .value.trim();
        if (decision !== "VERIFIED" && !reason) {
          showMessage(
            invitationMessage,
            "Enter a reason before requesting resubmission or rejecting.",
            "error",
          );
          return;
        }
        await apiRequest(
          `/api/users/${encodeURIComponent(reviewItem.dataset.id)}/review-staff`,
          "POST",
          { decision, reason },
        );
      }
      const applicationAction = event.target.closest(
        ".application-review-action",
      );
      const scheduleForm = event.target.closest(".application-schedule-form");
      if (applicationAction) {
        const row = applicationAction.closest(".admin-application-item");
        const nextStatus = applicationAction.dataset.next;
        const rejectionReason = row
          .querySelector(".application-rejection-reason")
          ?.value.trim();
        if (nextStatus === "REJECTED" && !rejectionReason) {
          showMessage(
            invitationMessage,
            "Enter a rejection reason before rejecting an application.",
            "error",
          );
          return;
        }
        await apiRequest(
          `/api/applications/${encodeURIComponent(applicationAction.dataset.id)}`,
          "PUT",
          { status: nextStatus, rejectionReason },
        );
      }
      if (
        scheduleForm &&
        event.target.closest(".application-schedule-trigger")
      ) {
        const values = new FormData(scheduleForm);
        const officerId = values.get("officerId");
        const gatcId = values.get("gatcId");
        const scheduledDate = values.get("scheduledDate");
        const scheduleLocation = values.get("scheduleLocation").trim();
        if (!officerId && !gatcId) {
          showMessage(
            invitationMessage,
            "Select an authorized LMO or GATC before scheduling.",
            "error",
          );
          return;
        }
        if (!scheduledDate || !scheduleLocation) {
          showMessage(
            invitationMessage,
            "Set an inspection date and location before scheduling.",
            "error",
          );
          return;
        }
        await apiRequest(
          `/api/applications/${encodeURIComponent(scheduleForm.dataset.id)}/schedule`,
          "POST",
          {
            officerId: officerId || undefined,
            gatcId: gatcId || undefined,
            scheduledDate,
            scheduleLocation,
          },
        );
      }
      if (revokeButton || reviewButton) await loadOnboarding();
      if (applicationAction || scheduleForm) await loadAdminApplications();
    } catch (error) {
      showMessage(invitationMessage, error.message, "error");
    }
  });

  try {
    await Promise.all([loadOnboarding(), loadAdminApplications()]);
  } catch (error) {
    showMessage(invitationMessage, error.message, "error");
  }
}

async function initializeStaffWorkspace(role) {
  const workspace = document.getElementById("staffWorkspace");
  const queue = document.getElementById("staffQueue");
  const empty = document.getElementById("staffQueueEmpty");
  const message = document.getElementById("staffWorkspaceMessage");
  if (!workspace || !queue) return;
  workspace.classList.remove("hidden");
  document.getElementById("staffWorkspaceTitle").textContent =
    role === "LMO" ? "LMO inspection queue" : "GATC technical review queue";

  const loadQueue = async () => {
    const { applications = [] } = await apiRequest("/api/applications");
    const assignedWork = applications.filter((application) =>
      role === "LMO"
        ? ["SCHEDULED", "ASSIGNED", "VERIFICATION_IN_PROGRESS"].includes(
            application.status,
          )
        : application.status === "GATC_REVIEW",
    );
    empty.classList.toggle("hidden", assignedWork.length > 0);
    queue.innerHTML = assignedWork
      .map(
        (application) => `<article class="staff-case">
          <div class="section-head"><h3>${escapeHtml(application.applicationId)}</h3><span class="badge">${escapeHtml(application.status)}</span></div>
          <p>${escapeHtml(application.applicationType)} · ${escapeHtml(application.instrumentId?.type)} · ${escapeHtml(application.instrumentId?.manufacturer)} ${escapeHtml(application.instrumentId?.model)}</p>
          <p>Serial ${escapeHtml(application.instrumentId?.serialNumber)} · Capacity ${escapeHtml(application.instrumentId?.capacity)} · Accuracy ${escapeHtml(application.instrumentId?.accuracy)}</p>
          <p>Applicant ${escapeHtml(application.applicantId?.organization || application.applicantId?.name)} · Location ${escapeHtml(application.scheduleLocation || application.instrumentId?.location)}</p>
          ${application.scheduledDate ? `<p>Scheduled ${escapeHtml(new Date(application.scheduledDate).toLocaleString())}</p>` : ""}
          <form class="field-verification-form form-grid two-up" data-application-id="${escapeHtml(application._id)}">
            <div class="field-group"><label><input name="instrumentPhysicallyAvailable" type="checkbox" required> Instrument physically available</label></div>
            <div class="field-group"><label><input name="identificationVerified" type="checkbox" required> Identification and serial verified</label></div>
            <div class="field-group"><label for="observed-${escapeHtml(application._id)}">Observed measurement</label><input id="observed-${escapeHtml(application._id)}" name="observedMeasurement" type="number" step="any" required></div>
            <div class="field-group"><label for="standard-${escapeHtml(application._id)}">Standard measurement</label><input id="standard-${escapeHtml(application._id)}" name="standardMeasurement" type="number" step="any" required></div>
            <div class="field-group"><label for="tolerance-${escapeHtml(application._id)}">Permissible error</label><input id="tolerance-${escapeHtml(application._id)}" name="permissibleError" type="number" min="0" step="any" required></div>
            <div class="field-group"><label for="result-${escapeHtml(application._id)}">Result</label><select id="result-${escapeHtml(application._id)}" name="result" required><option value="PASS">PASS</option><option value="FAIL">FAIL</option></select></div>
            <div class="field-group full-width"><label for="observation-${escapeHtml(application._id)}">Observations</label><textarea id="observation-${escapeHtml(application._id)}" name="observations" rows="3" maxlength="2000" required></textarea></div>
            <div class="field-group full-width"><label for="remarks-${escapeHtml(application._id)}">Remarks / failure reason</label><textarea id="remarks-${escapeHtml(application._id)}" name="remarks" rows="2" maxlength="1000"></textarea></div>
            <div class="full-width location-capture"><input name="latitude" type="hidden"><input name="longitude" type="hidden"><button class="btn btn-secondary capture-location" type="button">Capture current location</button><span class="location-message" aria-live="polite"></span></div>
            <button class="btn btn-primary full-width" type="submit">Submit ${role === "LMO" ? "inspection" : "technical review"}</button>
          </form>
        </article>`,
      )
      .join("");
  };

  queue.addEventListener("click", (event) => {
    const locationButton = event.target.closest(".capture-location");
    if (!locationButton) return;
    const form = locationButton.closest("form");
    const status = form.querySelector(".location-message");
    if (!navigator.geolocation) {
      status.textContent =
        "Location is unavailable in this browser; submit without GPS.";
      return;
    }
    locationButton.disabled = true;
    status.textContent = "Waiting for location permission…";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.elements.latitude.value = String(position.coords.latitude);
        form.elements.longitude.value = String(position.coords.longitude);
        status.textContent = "Location captured.";
        locationButton.disabled = false;
      },
      () => {
        status.textContent =
          "Location was not shared; submit without GPS or enter the authorized alternative in remarks.";
        locationButton.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });

  queue.addEventListener("submit", async (event) => {
    const form = event.target.closest(".field-verification-form");
    if (!form) return;
    event.preventDefault();
    const values = new FormData(form);
    const observedMeasurement = Number(values.get("observedMeasurement"));
    const standardMeasurement = Number(values.get("standardMeasurement"));
    const payload = {
      applicationId: form.dataset.applicationId,
      result: values.get("result"),
      checklist: {
        instrumentPhysicallyAvailable: values.has(
          "instrumentPhysicallyAvailable",
        ),
        identificationVerified: values.has("identificationVerified"),
        serialNumberChecked: values.has("identificationVerified"),
      },
      measurements: {
        observedMeasurement,
        standardMeasurement,
        error: observedMeasurement - standardMeasurement,
        permissibleError: Number(values.get("permissibleError")),
      },
      observations: values.get("observations").trim(),
      remarks: values.get("remarks").trim(),
      ...(values.get("latitude")
        ? { latitude: Number(values.get("latitude")) }
        : {}),
      ...(values.get("longitude")
        ? { longitude: Number(values.get("longitude")) }
        : {}),
    };
    try {
      await apiRequest("/api/verifications", "POST", payload);
      showMessage(
        message,
        role === "LMO" && payload.result === "PASS"
          ? "Inspection submitted. The application is now in the next review stage."
          : `Verification submitted with result ${payload.result}.`,
        "success",
      );
      await loadQueue();
    } catch (error) {
      showMessage(message, error.message, "error");
    }
  });

  try {
    await loadQueue();
  } catch (error) {
    showMessage(message, error.message, "error");
  }
}
