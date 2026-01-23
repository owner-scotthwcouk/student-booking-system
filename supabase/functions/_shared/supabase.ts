// supabase/functions/_shared/supabase.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ENV } from "./env.ts";

export function supabaseAdmin() {
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
