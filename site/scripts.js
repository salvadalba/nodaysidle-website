document.addEventListener('DOMContentLoaded', function() {
  var toggle = document.getElementById('terminal-toggle');
  var body = document.body;
  if (localStorage.getItem('ndi-mode') === 'terminal') { body.classList.add('term-active'); if (toggle) toggle.checked = true; }
  if (toggle) toggle.addEventListener('change', function() { if (this.checked) { body.classList.add('term-active'); localStorage.setItem('ndi-mode','terminal'); } else { body.classList.remove('term-active'); localStorage.setItem('ndi-mode','gui'); } });

  var form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      var email = document.getElementById('email');
      var password = document.getElementById('password');
      var valid = true;
      if (email && !email.value) { email.setAttribute('aria-invalid','true'); valid = false; }
      else if (email) { email.setAttribute('aria-invalid','false'); }
      if (password && !password.value) { password.setAttribute('aria-invalid','true'); valid = false; }
      else if (password) { password.setAttribute('aria-invalid','false'); }
      if (!valid) { e.preventDefault(); }
    });
  }
});