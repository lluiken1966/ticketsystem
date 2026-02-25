"use client";
import { useRef } from "react";
import { Menubar } from "primereact/menubar";
import { Avatar } from "primereact/avatar";
import { Menu } from "primereact/menu";
import { Badge } from "primereact/badge";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { MenuItem } from "primereact/menuitem";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();
  const userMenu = useRef<Menu>(null);
  const role = (session?.user as any)?.role;

  const navItems: MenuItem[] = [
    {
      label: "Dashboard",
      icon: "pi pi-home",
      command: () => router.push("/dashboard"),
    },
    {
      label: "Tickets",
      icon: "pi pi-ticket",
      command: () => router.push("/tickets"),
    },
    ...(role === "CLIENT"
      ? [
          {
            label: "New Ticket",
            icon: "pi pi-plus",
            command: () => router.push("/tickets/new"),
          },
        ]
      : []),
    ...(role === "ADMIN"
      ? [
          {
            label: "Admin",
            icon: "pi pi-cog",
            command: () => router.push("/admin"),
          },
        ]
      : []),
  ];

  const userMenuItems: MenuItem[] = [
    {
      label: session?.user?.name || "User",
      items: [
        {
          label: "Sign out",
          icon: "pi pi-sign-out",
          command: () => signOut({ callbackUrl: "/login" }),
        },
      ],
    },
  ];

  const end = (
    <div className="flex align-items-center gap-2">
      <span className="text-sm text-color-secondary hidden md:inline">
        {session?.user?.email}
      </span>
      <Avatar
        label={(session?.user?.name || "U").charAt(0).toUpperCase()}
        shape="circle"
        className="cursor-pointer"
        style={{ backgroundColor: "var(--primary-color)", color: "#fff" }}
        onClick={(e) => userMenu.current?.toggle(e)}
      />
      <Menu ref={userMenu} model={userMenuItems} popup />
    </div>
  );

  return (
    <div className="flex flex-column" style={{ minHeight: "100vh" }}>
      <Menubar model={navItems} end={end} className="border-noround" />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
