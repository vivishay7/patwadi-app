import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { resetToLogin } from "./navigationRef";

/**
 * On explicit sign-out (Supabase SIGNED_OUT), leave Main/guest browsing and
 * return to Sign In. Splash "Continue as guest" never creates a session, so
 * intentional guest entry is unaffected.
 */
export default function AuthNavigationSync() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        resetToLogin();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
