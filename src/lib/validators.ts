import { z } from "zod";

const roleSchema = z.enum([
  "academic_admin",
  "authorized_issuer",
  "student",
  "public_verifier",
  "auditor",
]);

const networkSchema = z.enum(["ganache", "hardhat", "sepolia"]);

export const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "La direccion Ethereum debe tener formato 0x + 40 caracteres hexadecimales.");

export const hashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "El hash SHA-256 debe tener formato 0x + 64 caracteres hexadecimales.");

export const certificateIssueSchema = z.object({
  studentId: z.string().min(1),
  issuerId: z.string().min(1),
  code: z
    .string()
    .regex(/^CERT-\d{4}-\d{4}$/, "El codigo debe usar formato CERT-2026-0001.")
    .optional(),
  certificateType: z.enum([
    "grade_certificate",
    "academic_diploma",
    "professional_title",
    "study_record",
    "graduation_certificate",
  ]),
  career: z.string().min(3),
  faculty: z.string().min(3),
  identityDocument: z.string().min(4),
  issueDate: z.string().min(10).optional(),
  observations: z.string().min(3),
  pdfName: z.string().min(4),
  university: z.string().min(3),
});

export const verificationSchema = z.object({
  pdfHash: hashSchema,
  verifierName: z.string().min(3).max(80),
});

export const importedAppStateSchema = z.object({
  activeRole: roleSchema,
  activeRoute: z.string().min(1),
  certificates: z.array(z.object({ id: z.string(), code: z.string() }).passthrough()).min(1),
  students: z.array(z.object({ id: z.string(), fullName: z.string() }).passthrough()).min(1),
  issuers: z.array(z.object({ id: z.string(), active: z.boolean() }).passthrough()).min(1),
  nftAcademicTokens: z
    .array(z.object({ id: z.string(), certificateId: z.string(), tokenId: z.string() }).passthrough())
    .optional(),
  verifierEntities: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()).min(1),
  blockchainEvents: z
    .array(z.object({ id: z.string(), transactionHash: z.string() }).passthrough())
    .min(1),
  verificationAttempts: z
    .array(z.object({ id: z.string(), resultStatus: z.string() }).passthrough())
    .min(1),
  selectedNetwork: networkSchema,
  settings: z.object({
    autoPersist: z.boolean(),
    defaultNetwork: networkSchema,
    demoMode: z.boolean(),
    reducedMotion: z.boolean(),
    verifierPublicAccess: z.boolean(),
  }).passthrough(),
  selectedCertificateId: z.string().optional(),
}).passthrough();

export type CertificateIssueInput = z.infer<typeof certificateIssueSchema>;
export type VerificationInput = z.infer<typeof verificationSchema>;
