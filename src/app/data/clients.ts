/**
 * clients.ts — mock client data used by both the Clients list page and
 * the Client Profile page so that clicking a row shows the correct person.
 *
 * Each record contains all the data needed by ProfileSection, ContactSection,
 * and AdditionalInfoSection (all required fields are populated).
 */

import type { ProfileData } from "../components/client-profile/ProfileSection";
import type { ContactData } from "../components/client-profile/ContactSection";
import type { AdditionalData } from "../components/client-profile/AdditionalInfoSection";

export interface ClientRecord {
  id: string;
  /** Display status shown in the Clients grid. */
  status: "Active" | "Inactive";
  profile: ProfileData;
  contact: ContactData;
  additional: AdditionalData;
}

export const CLIENTS: ClientRecord[] = [
  {
    id: "1",
    status: "Active",
    profile: {
      firstName: "John",
      lastName: "Smith",
      gender: "Male",
      dateOfBirth: "1985-03-14",
      billingStatus: "Active",
      endDate: "2027-03-14",
      date: "2024-06-01",
      organization: "Smith Fitness LLC",
    },
    contact: {
      email: "jsmith@email.com",
      homePhone: "(555) 123-4567",
      mobilePhone: "(555) 123-9999",
      workPhone: "(555) 123-0000",
      address1: "42 Oak Street",
      address2: "Apt 3B",
      city: "Brooklyn",
      state: "NY – New York",
      zipCode: "11201",
    },
    additional: {
      referredBy: "Google Search",
      hearAboutUs: "Online ad",
      notes: "Prefers morning sessions. Interested in personal training packages.",
      emergencyContactName: "Mary Smith",
      emergencyContactPhone: "(555) 123-8888",
    },
  },
  {
    id: "2",
    status: "Active",
    profile: {
      firstName: "Sarah",
      lastName: "Johnson",
      gender: "Female",
      dateOfBirth: "1992-07-22",
      billingStatus: "Active",
      endDate: "2027-01-31",
      date: "2025-02-01",
      organization: "",
    },
    contact: {
      email: "sjohnson@email.com",
      homePhone: "(555) 234-5678",
      mobilePhone: "(555) 234-1111",
      workPhone: "",
      address1: "88 Maple Avenue",
      address2: "",
      city: "Manhattan",
      state: "NY – New York",
      zipCode: "10016",
    },
    additional: {
      referredBy: "John Smith",
      hearAboutUs: "Friend referral",
      notes: "Participates in group yoga classes on Wednesdays and Fridays.",
      emergencyContactName: "David Johnson",
      emergencyContactPhone: "(555) 234-7777",
    },
  },
  {
    id: "3",
    status: "Inactive",
    profile: {
      firstName: "Michael",
      lastName: "Brown",
      gender: "Male",
      dateOfBirth: "1978-11-05",
      billingStatus: "Inactive",
      endDate: "2025-08-31",
      date: "2023-09-01",
      organization: "Brown & Associates",
    },
    contact: {
      email: "mbrown@email.com",
      homePhone: "(555) 345-6789",
      mobilePhone: "(555) 345-2222",
      workPhone: "(555) 345-3333",
      address1: "217 Pine Road",
      address2: "Suite 400",
      city: "Stamford",
      state: "CT – Connecticut",
      zipCode: "06901",
    },
    additional: {
      referredBy: "",
      hearAboutUs: "Walk-in",
      notes: "Membership expired. Contacted about renewal — awaiting response.",
      emergencyContactName: "Lisa Brown",
      emergencyContactPhone: "(555) 345-6000",
    },
  },
  {
    id: "4",
    status: "Active",
    profile: {
      firstName: "Emily",
      lastName: "Davis",
      gender: "Female",
      dateOfBirth: "1990-04-18",
      billingStatus: "Active",
      endDate: "2026-12-31",
      date: "2025-01-15",
      organization: "",
    },
    contact: {
      email: "edavis@email.com",
      homePhone: "(555) 456-7890",
      mobilePhone: "(555) 456-4444",
      workPhone: "",
      address1: "503 Birch Lane",
      address2: "",
      city: "Austin",
      state: "TX – Texas",
      zipCode: "73301",
    },
    additional: {
      referredBy: "Instagram",
      hearAboutUs: "Social media",
      notes: "Training for a half-marathon. Uses treadmill and track facilities regularly.",
      emergencyContactName: "Mark Davis",
      emergencyContactPhone: "(555) 456-5555",
    },
  },
  {
    id: "5",
    status: "Active",
    profile: {
      firstName: "Robert",
      lastName: "Wilson",
      gender: "Male",
      dateOfBirth: "1983-09-30",
      billingStatus: "Active",
      endDate: "2027-06-30",
      date: "2024-07-01",
      organization: "Wilson Tech",
    },
    contact: {
      email: "rwilson@email.com",
      homePhone: "(555) 567-8901",
      mobilePhone: "(555) 567-5555",
      workPhone: "(555) 567-6666",
      address1: "1200 Elm Boulevard",
      address2: "Floor 2",
      city: "Seattle",
      state: "WA – Washington",
      zipCode: "98101",
    },
    additional: {
      referredBy: "Corporate partnership",
      hearAboutUs: "Employer benefit",
      notes: "Part of Wilson Tech corporate wellness program. Visits 4x/week.",
      emergencyContactName: "Karen Wilson",
      emergencyContactPhone: "(555) 567-7777",
    },
  },
];

/** Look up a client by id. Returns undefined if not found. */
export function getClientById(id: string): ClientRecord | undefined {
  return CLIENTS.find((c) => c.id === id);
}

/** Generate a URL-safe slug from a client's name, e.g. "bob-roberts". */
export function clientSlug(client: ClientRecord): string {
  return `${client.profile.firstName}-${client.profile.lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");
}

/** Look up a client by their URL slug. Returns undefined if not found. */
export function getClientBySlug(slug: string): ClientRecord | undefined {
  return CLIENTS.find((c) => clientSlug(c) === slug);
}
