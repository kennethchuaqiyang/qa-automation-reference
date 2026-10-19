// DECISIONS.md #1 — blank email/password is a client-side validation
// error: block the submit entirely so it never counts toward the
// 3-try lockout.
document.getElementById("login-form").addEventListener("submit", (e) => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const validationError = document.getElementById("validation-error");

  if (email === "" || password === "") {
    e.preventDefault();
    validationError.textContent = "Email and password are required.";
    validationError.style.display = "block";
  }
});
