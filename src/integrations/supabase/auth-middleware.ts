import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    const authorization = getRequest()?.headers.get("authorization");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase server URL or publishable key is not configured.");
    }
    if (!authorization?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: bearer token required.");
    }

    const token = authorization.slice("Bearer ".length);
    if (!token || token.split(".").length !== 3) {
      throw new Error("Unauthorized: invalid bearer token.");
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.auth.getUser(token);
    if (error) throw new Error("Unauthorized: session is invalid or expired.");

    return next();
  },
);
