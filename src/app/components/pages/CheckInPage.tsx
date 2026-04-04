import { ClipboardCheck } from "lucide-react";
import { PlaceholderPage } from "./PlaceholderPage";

export function CheckInPage() {
  return (
    <PlaceholderPage
      title="Check-In"
      icon={ClipboardCheck}
      description="Check clients in and out of the facility, view attendance, and manage walk-ins."
    />
  );
}
