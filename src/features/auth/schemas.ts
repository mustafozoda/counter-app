import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'At least 8 characters'),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'At least 8 characters'),
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
