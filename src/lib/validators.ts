import { z } from "zod";

export const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "La direccion Ethereum debe tener formato 0x + 40 caracteres hexadecimales.");

export const hashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "El hash SHA-256 debe tener formato 0x + 64 caracteres hexadecimales.");

export const certificateIssueSchema = z.object({
  studentId: z.string().min(1),
  issuerId: z.string().min(1),
  title: z.string().min(8).max(120),
  pdfHash: hashSchema,
});

export const verificationSchema = z.object({
  pdfHash: hashSchema,
  verifierName: z.string().min(3).max(80),
});

export type CertificateIssueInput = z.infer<typeof certificateIssueSchema>;
export type VerificationInput = z.infer<typeof verificationSchema>;
