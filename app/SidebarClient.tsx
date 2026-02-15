"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  AlertCircle,
  CreditCard,
  Activity,
  Settings,
} from "lucide-react";

const navItems = [
  {
    href: "/",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    color: "#9B2C3E",
    hoverBg: "hover:bg-[#9B2C3E]/10",
    hoverText: "hover:text-[#9B2C3E]",
  },
  {
    href: "/patients",
    label: "Patients",
    icon: Users,
    color: "#4ECDC4",
    hoverBg: "hover:bg-[#4ECDC4]/10",
    hoverText: "hover:text-[#4ECDC4]",
  },
  {
    href: "/rendez-vous",
    label: "Rendez-vous",
    icon: Activity,
    color: "#FF6B6B",
    hoverBg: "hover:bg-[#FF6B6B]/10",
    hoverText: "hover:text-[#FF6B6B]",
  },
  {
    href: "/charges",
    label: "Charges par Spécialité",
    icon: CreditCard,
    color: "#FFE66D",
    hoverBg: "hover:bg-[#FFE66D]/10",
    hoverText: "hover:text-[#FFE66D]",
  },
  {
    href: "/missed",
    label: "Relance Clients",
    icon: AlertCircle,
    color: "#FF8C00",
    hoverBg: "hover:bg-orange-100",
    hoverText: "hover:text-orange-600",
  },
  {
    href: "/settings",
    label: "Paramètres",
    icon: Settings,
    color: "#5A5A5A",
    hoverBg: "hover:bg-gray-100",
    hoverText: "hover:text-gray-800",
  },
];

export function SidebarClient() {
  const pathname = usePathname();

  const getIsActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = getIsActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 font-semibold group ${
              isActive
                ? "bg-gradient-to-r from-[#9B2C3E]/20 to-[#9B2C3E]/5 text-[#9B2C3E] shadow-md border-l-4"
                : `text-gray-600 ${item.hoverBg} ${item.hoverText}`
            }`}
            style={
              isActive
                ? {
                    borderLeftColor: item.color,
                    backgroundColor: item.color + "15",
                  }
                : {}
            }
          >
            <Icon
              size={24}
              className={`transition-all ${
                isActive ? "scale-110" : "group-hover:scale-110"
              }`}
              style={isActive ? { color: item.color } : {}}
            />
            <span className={isActive ? "font-black" : ""}>{item.label}</span>
            {isActive && <span className='ml-auto text-xl'>📍</span>}
          </Link>
        );
      })}
    </>
  );
}
