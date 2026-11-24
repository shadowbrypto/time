// Runs before first paint so dark mode never flashes light. Kept as a file
// rather than inline so the Content-Security-Policy can forbid inline scripts.
(function () {
  try {
    var theme = localStorage.getItem("timetosync-theme") || "system";
    if (theme === "system") {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.classList.add(theme === "dark" ? "dark" : "light");
  } catch (e) {}
})();
