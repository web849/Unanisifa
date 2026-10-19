import { MessageCircle } from "lucide-react";
import { getBrand } from "@/lib/store/repository";
import { whatsappLink } from "@/lib/contact-links";

/** ফ্লোটিং WhatsApp বাটন — সব পেজে একই নম্বর (01310678729) */
export async function WhatsAppFab() {
  const brand = await getBrand();
  return (
    <a
      className="fab-whatsapp"
      href={whatsappLink(brand)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`WhatsApp-এ বার্তা পাঠান: ${brand.phone}`}
    >
      <MessageCircle aria-hidden="true" />
    </a>
  );
}
