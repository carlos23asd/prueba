// Manejo del inicio de sesión en login.html
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  // Usamos signInWithPassword del cliente Supabase
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById('errorMessage').textContent = error.message;
  } else {
    window.location.href = "index.html";
  }
});