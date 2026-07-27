import { z } from "zod";

export const genderEnum = z.enum(["male", "female", "other", "unknown"]);

export const signupSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters long." }),
  first_name: z.string().trim().min(1, { error: "First name is required." }),
  last_name: z.string().trim().min(1, { error: "Last name is required." }),
  gender: genderEnum.optional().default("unknown"),
  date_of_birth: z.iso.date().optional(),
});

export const loginSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Password is required." }),
});

export const forgotPasswordSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, { error: "Password must be at least 8 characters long." }),
});

export const inviteSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim().toLowerCase(),
});

export const claimSchema = z.object({
  password: z.string().min(8, { error: "Password must be at least 8 characters long." }),
});
