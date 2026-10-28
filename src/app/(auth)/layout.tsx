import { SelectorTema } from "@/components/tema/selector-tema";
import { Notificaciones } from "@/components/alertas/notificaciones";
export const metadata={referrer:"no-referrer" as const,robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <><Notificaciones/><div className="flex min-h-dvh flex-col bg-background"><div className="flex justify-end px-4 pt-4"><SelectorTema/></div><main className="flex flex-1 items-center justify-center p-4">{children}</main></div></>;}
