import { Notificaciones } from "@/components/alertas/notificaciones";
export const metadata={referrer:"no-referrer" as const,robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <><Notificaciones/><main className="flex min-h-dvh items-center justify-center bg-background p-4">{children}</main></>;}
