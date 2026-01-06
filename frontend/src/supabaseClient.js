import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jlomvhmfjwxybtfbcrwq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsb212aG1mand4eWJ0ZmJjcndxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2OTU2MzAsImV4cCI6MjA4MzI3MTYzMH0.Q-YKaO7_LFMYbZkq9if-vFd761CDeZdz0TiMojN_1Yw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)