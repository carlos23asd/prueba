// Reemplaza los siguientes valores por tu configuración de Supabase
const SUPABASE_URL = 'https://udaloepzgkgjvbyzkhmy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkYWxvZXB6Z2tnanZieXpraG15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0NDk2NjYsImV4cCI6MjA1NjAyNTY2Nn0.VcY3iVmYTfb5V0wYoGY3HPyNHKwcrTjA55Lf_lE_NL8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabaseClient;