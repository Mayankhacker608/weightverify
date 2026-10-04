/* Theme toggle shared by app pages — same "em-theme" key as the landing page */
(function () {
  var root = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  function apply(t) {
    root.setAttribute("data-theme", t);
    if (meta)
      meta.setAttribute("content", t === "dark" ? "#07111f" : "#f3f8ff");
  }
  try {
    var saved = localStorage.getItem("em-theme");
    if (saved === "light" || saved === "dark") apply(saved);
  } catch (e) {}
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("themeToggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      apply(next);
      try {
        localStorage.setItem("em-theme", next);
      } catch (e) {}
    });
  });
})();
