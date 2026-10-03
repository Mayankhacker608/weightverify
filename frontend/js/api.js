const localHosts = ["localhost", "127.0.0.1"];

const isSeparateLocalFrontend =
  localHosts.includes(window.location.hostname) &&
  window.location.port !== "" &&
  window.location.port !== "5000";

/*
|--------------------------------------------------------------------------
| API Base URL
|--------------------------------------------------------------------------
| If the frontend is running on the same Render server:
|   /api
|
| If frontend is separately deployed, you can set:
|   window.API_BASE_URL = "https://weightverify.onrender.com"
|--------------------------------------------------------------------------
*/

const API_BASE_URL = (window.API_BASE_URL =
  "https://weightverify.onrender.com" ||
  (isSeparateLocalFrontend
    ? `http://${window.location.hostname}:5000`
    : window.location.origin));

async function apiRequest(
  path,
  method = "GET",
  body = null,
  authRequired = true,
) {
  const headers = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("token");

  if (authRequired && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseText = await response.text();

  let data = {};

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const fallbackMessage = responseText.trim().startsWith("<")
      ? `Request failed (HTTP ${response.status}).`
      : responseText.slice(0, 200);

    throw new Error(
      data.message ||
        data.errors?.[0]?.msg ||
        fallbackMessage ||
        `Request failed (HTTP ${response.status}).`,
    );
  }

  return data;
}

function showMessage(el, message, type = "success") {
  if (!el) return;

  el.classList.remove("hidden", "error", "success", "warning");

  el.classList.add("alert", type);

  el.textContent = message;
}
