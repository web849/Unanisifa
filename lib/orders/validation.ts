/**
 * সার্ভার-সাইড ভ্যালিডেশন (zod) — চেকআউট/অর্ডার ইনপুট।
 * ক্লায়েন্ট ভ্যালিডেশন শুধু UX; আসল যাচাই সবসময় এখানে।
 */

import { z } from "zod";
import { toEnglishDigits } from "../utils";

export const bdPhoneSchema = z
  .string()
  .min(10, "মোবাইল নম্বর দিন")
  .max(16, "মোবাইল নম্বর সঠিক নয়")
  .transform((value) => toEnglishDigits(value).replace(/[^0-9]/g, ""))
  .pipe(
    z
      .string()
      .refine(
        (digits) => {
          const local = digits.startsWith("880") ? digits.slice(2) : digits;
          return /^01[3-9]\d{8}$/.test(local);
        },
        { message: "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01712345678)" },
      )
      .transform((digits) => (digits.startsWith("880") ? digits.slice(2) : digits)),
  );

export const addressSchema = z
  .string()
  .trim()
  .min(8, "সম্পূর্ণ ঠিকানা লিখুন (কমপক্ষে ৮ অক্ষর)")
  .max(400, "ঠিকানা অনেক বড়");

export const nameSchema = z.string().trim().min(2, "নাম লিখুন").max(80, "নাম অনেক বড়");

export const checkoutItemSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().nullable().default(null),
  quantity: z.number().int().min(1).max(20),
});

export const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, "কার্ট খালি"),
  name: nameSchema,
  phone: bdPhoneSchema,
  email: z.string().trim().email("ইমেইল সঠিক নয়").optional().or(z.literal("")),
  address: addressSchema,
  area: z.enum(["inside_dhaka", "outside_dhaka"]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
  idempotencyKey: z.string().min(8).max(120),
  /** হানি-পট — পূরণ থাকলে বট হিসেবে নীরবে প্রত্যাখ্যান */
  website: z.string().max(0).optional(),
  landingSlug: z.string().trim().max(120).optional().or(z.literal("")),
  campaign: z.string().trim().max(120).optional().or(z.literal("")),
  formOpenedAt: z.number().int().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const couponValidateSchema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().int().min(0),
  landingSlug: z.string().trim().max(120).optional().or(z.literal("")),
});

export const leadSchema = z.object({
  name: z.string().trim().max(80).optional().or(z.literal("")),
  phone: bdPhoneSchema,
  email: z.string().trim().email().optional().or(z.literal("")),
  source: z.string().trim().max(40).default("popup"),
  popupLabel: z.string().trim().max(120).optional().or(z.literal("")),
  landingSlug: z.string().trim().max(120).optional().or(z.literal("")),
  campaign: z.string().trim().max(120).optional().or(z.literal("")),
  smsConsent: z.boolean().default(false),
});

export const reviewSchema = z.object({
  productId: z.number().int().positive(),
  name: nameSchema,
  phone: bdPhoneSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(4, "মন্তব্য লিখুন").max(1200, "মন্তব্য অনেক বড়"),
});

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(6).max(40),
  phone: bdPhoneSchema,
});
