import { z } from "zod";
import { genderEnum } from "@/lib/validation/auth";

export const parentChildRelationshipTypeEnum = z.enum(["biological", "adopted", "step"]);
export const spouseStatusEnum = z.enum(["married", "divorced", "widowed", "partnered"]);

const newPersonRequiredSchema = z.object({
  first_name: z.string().trim().min(1, { error: "First name is required." }),
  last_name: z.string().trim().min(1, { error: "Last name is required." }),
  gender: genderEnum.optional().default("unknown"),
  date_of_birth: z.iso.date().optional(),
  date_of_death: z.iso.date().optional(),
  avatar_url: z.url().optional(),
  notes: z.string().optional(),
});

// Same fields, but all optional — for "attach existing OR describe a new person" endpoints.
const newPersonOptionalShape = newPersonRequiredSchema.partial().shape;

export const createPersonSchema = z.object({
  relation_type: z.enum(["parent", "child", "spouse"]),
  related_to_person_id: z.uuid(),
  relationship_type: parentChildRelationshipTypeEnum.optional().default("biological"),
  status: spouseStatusEnum.optional().default("married"),
  start_date: z.iso.date().optional(),
  end_date: z.iso.date().optional(),
  ...newPersonRequiredSchema.shape,
});

export const patchPersonSchema = z
  .object({
    first_name: z.string().trim().min(1).optional(),
    last_name: z.string().trim().min(1).optional(),
    gender: genderEnum.optional(),
    date_of_birth: z.iso.date().nullable().optional(),
    date_of_death: z.iso.date().nullable().optional(),
    is_alive: z.boolean().optional(),
    avatar_url: z.url().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided.",
  });

export const deletePersonSchema = z.object({
  confirm: z.boolean().optional().default(false),
});

export const attachParentSchema = z
  .object({
    existing_person_id: z.uuid().optional(),
    relationship_type: parentChildRelationshipTypeEnum.optional().default("biological"),
    ...newPersonOptionalShape,
  })
  .refine((data) => Boolean(data.existing_person_id) || Boolean(data.first_name && data.last_name), {
    error: "Provide either existing_person_id or first_name and last_name for a new person.",
    path: ["existing_person_id"],
  });

export const attachChildSchema = attachParentSchema;

export const attachSpouseSchema = z
  .object({
    existing_person_id: z.uuid().optional(),
    status: spouseStatusEnum.optional().default("married"),
    start_date: z.iso.date().optional(),
    end_date: z.iso.date().optional(),
    ...newPersonOptionalShape,
  })
  .refine((data) => Boolean(data.existing_person_id) || Boolean(data.first_name && data.last_name), {
    error: "Provide either existing_person_id or first_name and last_name for a new person.",
    path: ["existing_person_id"],
  });
