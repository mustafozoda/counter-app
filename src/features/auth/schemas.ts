import { z } from 'zod';

// Validation messages are stored as i18n keys and resolved with `t()` at the
// point of display (see the auth screens), keeping the schemas pure data.
export const signInSchema = z.object({
  email: z.string().trim().email('auth.invalidEmail'),
  password: z.string().min(8, 'auth.min8'),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  name: z.string().trim().min(2, 'auth.nameNeeded'),
  email: z.string().trim().email('auth.invalidEmail'),
  password: z.string().min(8, 'auth.min8'),
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('auth.invalidEmail'),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
