// Self-hosted auth client — calls our own API routes directly.
// Replaces the external Neon/Better Auth dependency.

type AuthResult = {
  success: boolean;
  isNewUser?: boolean;
  needsProfile?: boolean;
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  user?: { id: string; name: string; email: string; [key: string]: unknown };
  message?: string;
};

async function post(path: string, body: unknown): Promise<AuthResult> {
  const res = await fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json() as AuthResult;
  return data;
}

export const authClient = {
  signIn: {
    email: async ({ email, password }: { email: string; password: string }) => {
      const data = await post("/email-login", { email, password });
      if (!data.success) {
        return { data: null, error: { message: data.message ?? "Sign-in failed" } };
      }
      return {
        data: {
          token: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          needsProfile: data.needsProfile,
        },
        error: null,
      };
    },
    social: async ({ provider, callbackURL }: { provider: string; callbackURL: string }) => {
      // Google OAuth via Firebase — redirect to the external flow
      console.warn(`Social sign-in (${provider}) requires Firebase configuration.`, callbackURL);
      throw new Error("Google sign-in requires Firebase to be configured. Please use email sign-in.");
    },
  },
  signUp: {
    email: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      const data = await post("/email-signup", { name, email, password });
      if (!data.success) {
        return { data: null, error: { message: data.message ?? "Sign-up failed" } };
      }
      return {
        data: {
          token: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          needsProfile: data.needsProfile,
        },
        error: null,
      };
    },
  },
  signOut: async () => {
    return { error: null };
  },
  getSession: async () => {
    return { data: null, error: { message: "External session not available" } };
  },
  resetPassword: async ({ newPassword, token }: { newPassword: string; token: string }) => {
    const data = await post("/email-reset-password", { newPassword, token });
    if (!data.success) {
      return { error: { message: data.message ?? "Password reset failed" } };
    }
    return { error: null };
  },
  forgetPassword: async ({ email, redirectTo }: { email: string; redirectTo?: string }) => {
    const data = await post("/email-forgot-password", { email, redirectTo });
    if (!data.success) {
      return { error: { message: data.message ?? "Failed to send reset email" } };
    }
    return { error: null };
  },
};
