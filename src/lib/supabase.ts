import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://dzyuqibobeujzedomlsc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6eXVxaWJvYmV1anplZG9tbHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjA3NzEsImV4cCI6MjA4NzQzNjc3MX0.2wpTD_5_FmdPpihTDs-ELvVwQXxAQuYcKcT0vsgYJk4"
);
