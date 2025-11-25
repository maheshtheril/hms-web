"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* ---------------------------------------------
   1) Define strict role type 
---------------------------------------------- */
export type UserRole = "admin" | "manager" | "staff" | "patient";

/* ---------------------------------------------
   2) Define menu item type
---------------------------------------------- */
interface MenuItem {
  label: string;
  href: string;
}

/* ---------------------------------------------
   3) Strongly typed MENU object
---------------------------------------------- */
const MENU: Record<UserRole, MenuItem[]> = {
  admin: [
    { label: "Overview", href: "/dashboard/admin" },
    { label: "Users", href: "/dashboard/admin/users" },
    { label: "Roles & Permissions", href: "/dashboard/admin/roles" },
    { label: "Companies", href: "/dashboard/admin/companies" },
    { label: "Billing", href: "/dashboard/admin/billing" },
    { label: "Audit Logs", href: "/dashboard/admin/audit" },
  ],

  manager: [
    { label: "Overview", href: "/dashboard/manager" },
    { label: "Appointments", href: "/dashboard/manager/appointments" },
    { label: "Patients", href: "/dashboard/manager/patients" },
    { label: "Lab Orders", href: "/dashboard/manager/lab" },
    { label: "Imaging Orders", href: "/dashboard/manager/imaging" },
    { label: "Pharmacy", href: "/dashboard/manager/pharmacy" },
    { label: "Billing", href: "/dashboard/manager/billing" },
  ],

  staff: [
    { label: "Overview", href: "/dashboard/staff" },
    { label: "My Tasks", href: "/dashboard/staff/tasks" },
    { label: "Vitals", href: "/dashboard/staff/vitals" },
    { label: "Orders", href: "/dashboard/staff/orders" },
    { label: "Procedures", href: "/dashboard/staff/procedures" },
  ],

  patient: [
    { label: "Overview", href: "/dashboard/patient" },
    { label: "Appointments", href: "/dashboard/patient/appointments" },
    { label: "Records", href: "/dashboard/patient/records" },
    { label: "Lab Results", href: "/dashboard/patient/labs" },
    { label: "Bills", href: "/dashboard/patient/billing" },
  ],
};

/* ---------------------------------------------
   4) Sidebar Component
---------------------------------------------- */
export default function Sidebar({ role }: { role: UserRole }) {
  const items = MENU[role];
  const pathname = usePathname();

  return (
    <motion.div
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 70, damping: 18 }}
      className="
        w-64 h-full
        fixed md:static left-0 top-0
        backdrop-blur-2xl bg-white/5 
        border-r border-white/10 
        shadow-xl z-40
        flex flex-col
        p-6
      "
    >
      {/* LOGO */}
      <div className="text-2xl font-bold mb-10 tracking-wide text-white/90">
        ZYNTRA HMS
      </div>

      {/* NAV LINKS */}
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 6 }}
                className={`
                  px-4 py-2 rounded-xl cursor-pointer transition
                  ${
                    active
                      ? "bg-white/20 text-white shadow-lg border border-white/10"
                      : "text-white/70 hover:bg-white/10"
                  }
                `}
              >
                {item.label}
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="mt-auto pt-10 text-xs text-white/40">
        © {new Date().getFullYear()} Zyntra — Neural Glass UI
      </div>
    </motion.div>
  );
}
