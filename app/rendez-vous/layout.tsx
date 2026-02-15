import { Outfit } from "next/font/google";
import "../globals.css";

const outfit = Outfit({ subsets: ["latin"] });

export default function RDVLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${outfit.className} w-full min-h-full`}>{children}</div>
  );
}
