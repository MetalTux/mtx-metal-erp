import { LONGITUD_MINIMA_CLAVE, LONGITUD_MAXIMA_CLAVE } from "@/config/politica-contrasenas";
import { z } from "zod";
import { rolesSeguridad } from "./permisos";
const clave=z.string().min(LONGITUD_MINIMA_CLAVE,`Usa al menos ${LONGITUD_MINIMA_CLAVE} caracteres.`).max(LONGITUD_MAXIMA_CLAVE);
const secreto=z.string().min(1).max(2048);
const email=z.string().trim().toLowerCase().email().max(254);
const roles=z.array(z.enum(rolesSeguridad)).min(1).max(6).refine(r=>new Set(r).size===r.length);
export const datosProvision = z.object({name:z.string().trim().min(2).max(100),email,password:clave}).strict();
export const entradaSeguridad=z.discriminatedUnion("action",[
 z.object({action:z.literal("login"),email,password:z.string().min(1).max(LONGITUD_MAXIMA_CLAVE)}).strict(),
 z.object({action:z.literal("factor-login"),code:z.string().min(6).max(100)}).strict(),
 z.object({action:z.literal("recover"),email}).strict(),
 z.object({action:z.literal("activate"),token:secreto,password:clave}).strict(),
 z.object({action:z.literal("reset"),token:secreto,password:clave}).strict(),
 z.object({action:z.literal("logout")}).strict(),
 z.object({action:z.literal("self")}).strict(),
 z.object({action:z.literal("reauth"),password:z.string().min(1).max(LONGITUD_MAXIMA_CLAVE),code:z.string().max(100).default("")}).strict(),
 z.object({action:z.literal("password"),password:clave}).strict(),
 z.object({action:z.literal("sessions-revoke"),id:z.string().uuid().optional()}).strict(),
 z.object({action:z.literal("factor-setup")}).strict(),
 z.object({action:z.literal("factor-enable"),setup:secreto,code:z.string().regex(/^\d{6}$/)}).strict(),
 z.object({action:z.literal("factor-disable")}).strict(),
 z.object({action:z.literal("factor-codes")}).strict(),
 z.object({action:z.literal("users"),query:z.string().max(100).default(""),page:z.number().int().min(1).max(100000).default(1)}).strict(),
 z.object({action:z.literal("user-create"),name:z.string().trim().min(2).max(100),email,roles}).strict(),
 z.object({action:z.literal("user-update"),id:z.number().int().positive(),version:z.number().int().positive(),name:z.string().trim().min(2).max(100),roles,status:z.enum(["PENDIENTE_ACTIVACION","ACTIVO","INACTIVO"])}).strict(),
 z.object({action:z.literal("user-token"),id:z.number().int().positive(),version:z.number().int().positive()}).strict(),
]);
export type EntradaSeguridad=z.infer<typeof entradaSeguridad>;
