"use client";

import { useState, useTransition } from "react";
import {
  addProfileAffiliationAction,
  removeProfileAffiliationAction,
  updatePrimaryEmailAction,
  updateProfileAffiliationAction,
  updateProfileAction,
} from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProfileData = {
  user_id: string;
  role: string;
  active_role: string | null;
  roles: string[] | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  display_name: string | null;
  salutation: string | null;
  suffix: string | null;
  alternate_email: string | null;
  phone: string | null;
  whatsapp: string | null;
  orcid_id: string | null;
  scopus_author_id: string | null;
  wos_researcher_id: string | null;
  google_scholar_url: string | null;
  loop_profile_url: string | null;
  publons_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_region: string | null;
  postal_code: string | null;
  country_code: string | null;
  timezone: string | null;
  biography: string | null;
  degrees: string[] | null;
  expertise_keywords: string[];
  research_areas: string[];
  reviewer_interests: string[];
  methods: string[];
  publication_interests: string[];
  languages: string[];
  accepts_review_invites: boolean;
  available_for_review: boolean;
  max_reviews_per_month: number | null;
  preferred_review_model: string | null;
  review_turnaround_days: number | null;
  conflict_of_interest_statement: string | null;
  email_opt_in: boolean;
  marketing_opt_in: boolean;
  data_processing_consent_at: string | null;
  ethics_training_completed_at: string | null;
  metadata: Record<string, unknown>;
  editorial_preferences: Record<string, unknown>;
};

type AffiliationData = {
  id: string;
  institution_name: string;
  department: string | null;
  position_title: string | null;
  city: string | null;
  country_code: string | null;
  start_date: string | null;
  end_date: string | null;
  is_primary: boolean;
};

const COUNTRY_OPTIONS: Array<{ code: string; name: string }> = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo (Congo-Brazzaville)" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Cote d'Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "CD", name: "Democratic Republic of the Congo" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GD", name: "Grenada" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "KP", name: "North Korea" },
  { code: "MK", name: "North Macedonia" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PS", name: "Palestine" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "Sao Tome and Principe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];

function toLocalDateTimeInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.valueOf())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function ProfileForm({ profile, affiliations }: { profile: ProfileData; affiliations: AffiliationData[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");
  const [emailMessage, setEmailMessage] = useState<string>("");
  const [emailMessageIsError, setEmailMessageIsError] = useState(false);
  const [affMessage, setAffMessage] = useState<string>("");
  const [affInstitution, setAffInstitution] = useState("");
  const [affDepartment, setAffDepartment] = useState("");
  const [affPosition, setAffPosition] = useState("");
  const [affCity, setAffCity] = useState("");
  const [affCountry, setAffCountry] = useState("");
  const [affStartDate, setAffStartDate] = useState("");
  const [affEndDate, setAffEndDate] = useState("");
  const [affPrimary, setAffPrimary] = useState(false);
  const [showAddAffForm, setShowAddAffForm] = useState(affiliations.length === 0);
  const [editingAffId, setEditingAffId] = useState<string | null>(null);
  const [editInstitution, setEditInstitution] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editPrimary, setEditPrimary] = useState(false);

  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [middleName, setMiddleName] = useState(profile.middle_name ?? "");
  const [lastName, setLastName] = useState(profile.last_name ?? "");
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [salutation, setSalutation] = useState(profile.salutation ?? "");
  const [suffix, setSuffix] = useState(profile.suffix ?? "");
  const [primaryEmail, setPrimaryEmail] = useState(profile.email ?? "");

  const [alternateEmail, setAlternateEmail] = useState(profile.alternate_email ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? "");

  const [orcidId, setOrcidId] = useState(profile.orcid_id ?? "");
  const [scopusId, setScopusId] = useState(profile.scopus_author_id ?? "");
  const [wosId, setWosId] = useState(profile.wos_researcher_id ?? "");
  const [googleScholarUrl, setGoogleScholarUrl] = useState(profile.google_scholar_url ?? "");
  const [loopProfileUrl, setLoopProfileUrl] = useState(profile.loop_profile_url ?? "");
  const [publonsUrl, setPublonsUrl] = useState(profile.publons_url ?? "");

  const [addressLine1, setAddressLine1] = useState(profile.address_line1 ?? "");
  const [addressLine2, setAddressLine2] = useState(profile.address_line2 ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [stateRegion, setStateRegion] = useState(profile.state_region ?? "");
  const [postalCode, setPostalCode] = useState(profile.postal_code ?? "");
  const [countryCode, setCountryCode] = useState(profile.country_code ?? "");
  const [timezone, setTimezone] = useState(profile.timezone ?? "");

  const [biography, setBiography] = useState(profile.biography ?? "");
  const [degreesCsv, setDegreesCsv] = useState((profile.degrees ?? []).join(", "));
  const [expertiseCsv, setExpertiseCsv] = useState((profile.expertise_keywords ?? []).join(", "));
  const [researchAreasCsv, setResearchAreasCsv] = useState((profile.research_areas ?? []).join(", "));
  const [reviewerInterestsCsv, setReviewerInterestsCsv] = useState((profile.reviewer_interests ?? []).join(", "));
  const [methodsCsv, setMethodsCsv] = useState((profile.methods ?? []).join(", "));
  const [publicationInterestsCsv, setPublicationInterestsCsv] = useState((profile.publication_interests ?? []).join(", "));
  const [languagesCsv, setLanguagesCsv] = useState((profile.languages ?? []).join(", "));

  const [acceptsReviewInvites, setAcceptsReviewInvites] = useState(Boolean(profile.accepts_review_invites));
  const [availableForReview, setAvailableForReview] = useState(Boolean(profile.available_for_review));
  const [maxReviewsPerMonth, setMaxReviewsPerMonth] = useState(
    profile.max_reviews_per_month == null ? "" : String(profile.max_reviews_per_month),
  );
  const [preferredReviewModel, setPreferredReviewModel] = useState(profile.preferred_review_model ?? "");
  const [reviewTurnaroundDays, setReviewTurnaroundDays] = useState(
    profile.review_turnaround_days == null ? "" : String(profile.review_turnaround_days),
  );
  const [coiStatement, setCoiStatement] = useState(profile.conflict_of_interest_statement ?? "");

  const [emailOptIn, setEmailOptIn] = useState(Boolean(profile.email_opt_in));
  const [marketingOptIn, setMarketingOptIn] = useState(Boolean(profile.marketing_opt_in));
  const [dataConsentAt, setDataConsentAt] = useState(toLocalDateTimeInput(profile.data_processing_consent_at));
  const [ethicsCompletedAt, setEthicsCompletedAt] = useState(toLocalDateTimeInput(profile.ethics_training_completed_at));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage("");
        startTransition(async () => {
          const res = await updateProfileAction({
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            display_name: displayName,
            salutation,
            suffix,
            alternate_email: alternateEmail,
            phone,
            whatsapp,
            orcid_id: orcidId,
            scopus_author_id: scopusId,
            wos_researcher_id: wosId,
            google_scholar_url: googleScholarUrl,
            loop_profile_url: loopProfileUrl,
            publons_url: publonsUrl,
            address_line1: addressLine1,
            address_line2: addressLine2,
            city,
            state_region: stateRegion,
            postal_code: postalCode,
            country_code: countryCode,
            timezone,
            biography,
            degrees_csv: degreesCsv,
            expertise_keywords_csv: expertiseCsv,
            research_areas_csv: researchAreasCsv,
            reviewer_interests_csv: reviewerInterestsCsv,
            methods_csv: methodsCsv,
            publication_interests_csv: publicationInterestsCsv,
            languages_csv: languagesCsv,
            accepts_review_invites: acceptsReviewInvites,
            available_for_review: availableForReview,
            max_reviews_per_month: maxReviewsPerMonth,
            preferred_review_model: preferredReviewModel,
            review_turnaround_days: reviewTurnaroundDays,
            conflict_of_interest_statement: coiStatement,
            email_opt_in: emailOptIn,
            marketing_opt_in: marketingOptIn,
            data_processing_consent_at: dataConsentAt,
            ethics_training_completed_at: ethicsCompletedAt,
            metadata_json: JSON.stringify(profile.metadata ?? {}),
            editorial_preferences_json: JSON.stringify(profile.editorial_preferences ?? {}),
          });
          setMessage(res.ok ? "Saved." : res.message ?? "Could not save.");
        });
      }}
    >
      <section className="rounded-lg border bg-white p-6">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scholarly profile in journal format. Keep this up-to-date for editorial and reviewer workflows.
        </p>
        <div className="mt-4 grid gap-2 md:max-w-lg">
          <Label>Primary email</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={primaryEmail}
              onChange={(e) => setPrimaryEmail(e.target.value)}
              disabled={pending}
              placeholder="name@example.com"
            />
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setEmailMessage("");
                  setEmailMessageIsError(false);
                  const res = await updatePrimaryEmailAction({ email: primaryEmail });
                  setEmailMessageIsError(!res.ok);
                  setEmailMessage(res.message ?? (res.ok ? "Primary email update requested." : "Could not update email."));
                })
              }
            >
              Update email
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Changing your primary email may require confirmation from both old and new inboxes.
          </p>
          {emailMessage ? (
            <p className={`text-sm ${emailMessageIsError ? "text-red-600" : "text-green-600"}`}>
              {emailMessage}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">Identity</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-12">
          <div className="grid gap-2 md:col-span-2">
            <Label>Salutation</Label>
            <Input value={salutation} onChange={(e) => setSalutation(e.target.value)} disabled={pending} />
          </div>
          <div className="grid gap-2 md:col-span-4">
            <Label>First name</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={pending} required />
          </div>
          <div className="grid gap-2 md:col-span-3">
            <Label>Middle name</Label>
            <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} disabled={pending} />
          </div>
          <div className="grid gap-2 md:col-span-3">
            <Label>Last name</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={pending} required />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Suffix</Label>
            <Input value={suffix} onChange={(e) => setSuffix(e.target.value)} disabled={pending} />
          </div>
          <div className="grid gap-2 md:col-span-5">
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={pending} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">Contact</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="grid gap-2"><Label>Alternate email</Label><Input value={alternateEmail} onChange={(e) => setAlternateEmail(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>WhatsApp</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} disabled={pending} /></div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">Scholarly Identifiers</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="grid gap-2"><Label>ORCID ID</Label><Input value={orcidId} onChange={(e) => setOrcidId(e.target.value)} disabled={pending} placeholder="0000-0000-0000-0000" /></div>
          <div className="grid gap-2"><Label>Scopus Author ID</Label><Input value={scopusId} onChange={(e) => setScopusId(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>WoS Researcher ID</Label><Input value={wosId} onChange={(e) => setWosId(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>Google Scholar URL</Label><Input value={googleScholarUrl} onChange={(e) => setGoogleScholarUrl(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>Loop profile URL</Label><Input value={loopProfileUrl} onChange={(e) => setLoopProfileUrl(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>Publons URL</Label><Input value={publonsUrl} onChange={(e) => setPublonsUrl(e.target.value)} disabled={pending} /></div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">Location</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="grid gap-2"><Label>Address line 1</Label><Input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>Address line 2</Label><Input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>State/Region</Label><Input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>Postal code</Label><Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2">
            <Label>Country</Label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              disabled={pending}
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            >
              <option value="">Select country...</option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2"><Label>Timezone</Label><Input value={timezone} onChange={(e) => setTimezone(e.target.value)} disabled={pending} placeholder="Asia/Dhaka" /></div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">Affiliations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add multiple affiliations. Out-of-list institutions are accepted.
        </p>

        <div className="mt-4 grid gap-3">
          {affiliations.length ? (
            affiliations.map((a) => (
              <div key={a.id} className="rounded border p-3">
                {editingAffId === a.id ? (
                  <div className="grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-2"><Label>Institution name</Label><Input value={editInstitution} onChange={(e) => setEditInstitution(e.target.value)} disabled={pending} /></div>
                      <div className="grid gap-2"><Label>Department</Label><Input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} disabled={pending} /></div>
                      <div className="grid gap-2"><Label>Position title</Label><Input value={editPosition} onChange={(e) => setEditPosition(e.target.value)} disabled={pending} /></div>
                      <div className="grid gap-2"><Label>City</Label><Input value={editCity} onChange={(e) => setEditCity(e.target.value)} disabled={pending} /></div>
                      <div className="grid gap-2">
                        <Label>Country</Label>
                        <select
                          value={editCountry}
                          onChange={(e) => setEditCountry(e.target.value)}
                          disabled={pending}
                          className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Select country...</option>
                          {COUNTRY_OPTIONS.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-2"><Label>Start date</Label><Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} disabled={pending} /></div>
                      <div className="grid gap-2"><Label>End date</Label><Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} disabled={pending} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id={`edit-aff-primary-${a.id}`} checked={editPrimary} onCheckedChange={(v) => setEditPrimary(v === true)} disabled={pending} />
                      <Label htmlFor={`edit-aff-primary-${a.id}`}>Set as primary affiliation</Label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const res = await updateProfileAffiliationAction({
                              id: a.id,
                              institution_name: editInstitution,
                              department: editDepartment,
                              position_title: editPosition,
                              city: editCity,
                              country_code: editCountry,
                              start_date: editStartDate,
                              end_date: editEndDate,
                              is_primary: editPrimary,
                            });
                            if (res.ok) setEditingAffId(null);
                            setAffMessage(res.ok ? "Affiliation updated." : res.message ?? "Could not update.");
                          })
                        }
                      >
                        Save
                      </Button>
                      <Button type="button" variant="outline" disabled={pending} onClick={() => setEditingAffId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        {a.institution_name} {a.is_primary ? <span className="text-xs text-primary">(Primary)</span> : null}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => {
                            setEditingAffId(a.id);
                            setEditInstitution(a.institution_name);
                            setEditDepartment(a.department ?? "");
                            setEditPosition(a.position_title ?? "");
                            setEditCity(a.city ?? "");
                            setEditCountry(a.country_code ?? "");
                            setEditStartDate(a.start_date ?? "");
                            setEditEndDate(a.end_date ?? "");
                            setEditPrimary(a.is_primary);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const res = await removeProfileAffiliationAction({ id: a.id });
                              setAffMessage(res.ok ? "Affiliation removed." : res.message ?? "Could not remove.");
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {a.position_title ?? "—"} · {a.department ?? "—"} · {a.city ?? "—"} {a.country_code ?? ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.start_date ?? "—"} to {a.end_date ?? "Present"}
                    </p>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No affiliations added yet.</p>
          )}
        </div>

        <div className="mt-5 rounded border p-4">
          <h3 className="text-sm font-semibold">Add affiliation</h3>
          {!showAddAffForm && affiliations.length > 0 ? (
            <div className="mt-3">
              <Button type="button" onClick={() => setShowAddAffForm(true)} disabled={pending}>
                Add affiliation
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="grid gap-2"><Label>Institution name</Label><Input value={affInstitution} onChange={(e) => setAffInstitution(e.target.value)} disabled={pending} /></div>
                <div className="grid gap-2"><Label>Department</Label><Input value={affDepartment} onChange={(e) => setAffDepartment(e.target.value)} disabled={pending} /></div>
                <div className="grid gap-2"><Label>Position title</Label><Input value={affPosition} onChange={(e) => setAffPosition(e.target.value)} disabled={pending} /></div>
                <div className="grid gap-2"><Label>City</Label><Input value={affCity} onChange={(e) => setAffCity(e.target.value)} disabled={pending} /></div>
                <div className="grid gap-2">
                  <Label>Country</Label>
                  <select
                    value={affCountry}
                    onChange={(e) => setAffCountry(e.target.value)}
                    disabled={pending}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select country...</option>
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2"><Label>Start date</Label><Input type="date" value={affStartDate} onChange={(e) => setAffStartDate(e.target.value)} disabled={pending} /></div>
                <div className="grid gap-2"><Label>End date</Label><Input type="date" value={affEndDate} onChange={(e) => setAffEndDate(e.target.value)} disabled={pending} /></div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Checkbox id="aff-primary" checked={affPrimary} onCheckedChange={(v) => setAffPrimary(v === true)} disabled={pending} />
                <Label htmlFor="aff-primary">Set as primary affiliation</Label>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await addProfileAffiliationAction({
                        institution_name: affInstitution,
                        department: affDepartment,
                        position_title: affPosition,
                        city: affCity,
                        country_code: affCountry,
                        start_date: affStartDate,
                        end_date: affEndDate,
                        is_primary: affPrimary,
                      });
                      if (res.ok) {
                        setAffInstitution("");
                        setAffDepartment("");
                        setAffPosition("");
                        setAffCity("");
                        setAffCountry("");
                        setAffStartDate("");
                        setAffEndDate("");
                        setAffPrimary(false);
                        if (affiliations.length > 0) setShowAddAffForm(false);
                      }
                      setAffMessage(res.ok ? "Affiliation added." : res.message ?? "Could not add.");
                    })
                  }
                >
                  Save affiliation
                </Button>
                {affiliations.length > 0 ? (
                  <Button type="button" variant="outline" disabled={pending} onClick={() => setShowAddAffForm(false)}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </>
          )}
          {affMessage ? <p className="mt-2 text-sm text-muted-foreground">{affMessage}</p> : null}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">Research Profile</h2>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-2"><Label>Biography</Label><Textarea value={biography} onChange={(e) => setBiography(e.target.value)} disabled={pending} rows={5} /></div>
          <div className="grid gap-2"><Label>Degrees (comma-separated)</Label><Input value={degreesCsv} onChange={(e) => setDegreesCsv(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>Expertise keywords (comma-separated)</Label><Input value={expertiseCsv} onChange={(e) => setExpertiseCsv(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>Research areas (comma-separated)</Label><Input value={researchAreasCsv} onChange={(e) => setResearchAreasCsv(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>Reviewer interests (comma-separated)</Label><Input value={reviewerInterestsCsv} onChange={(e) => setReviewerInterestsCsv(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>Methods (comma-separated)</Label><Input value={methodsCsv} onChange={(e) => setMethodsCsv(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>Publication interests (comma-separated)</Label><Input value={publicationInterestsCsv} onChange={(e) => setPublicationInterestsCsv(e.target.value)} disabled={pending} /></div>
          <div className="grid gap-2"><Label>Languages (comma-separated)</Label><Input value={languagesCsv} onChange={(e) => setLanguagesCsv(e.target.value)} disabled={pending} /></div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">Reviewer & Compliance</h2>
        <div className="mt-4 grid gap-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={acceptsReviewInvites} onCheckedChange={(v) => setAcceptsReviewInvites(v === true)} disabled={pending} id="accepts-review" />
            <Label htmlFor="accepts-review">Accept review invites</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={availableForReview} onCheckedChange={(v) => setAvailableForReview(v === true)} disabled={pending} id="available-review" />
            <Label htmlFor="available-review">Available for review</Label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2"><Label>Max reviews/month</Label><Input value={maxReviewsPerMonth} onChange={(e) => setMaxReviewsPerMonth(e.target.value)} disabled={pending} /></div>
            <div className="grid gap-2"><Label>Preferred review model</Label><Input value={preferredReviewModel} onChange={(e) => setPreferredReviewModel(e.target.value)} disabled={pending} placeholder="single_blind / double_blind / open" /></div>
            <div className="grid gap-2"><Label>Review turnaround days</Label><Input value={reviewTurnaroundDays} onChange={(e) => setReviewTurnaroundDays(e.target.value)} disabled={pending} /></div>
          </div>
          <div className="grid gap-2"><Label>Conflict of interest statement</Label><Textarea value={coiStatement} onChange={(e) => setCoiStatement(e.target.value)} disabled={pending} rows={4} /></div>
          <div className="flex items-center gap-2">
            <Checkbox checked={emailOptIn} onCheckedChange={(v) => setEmailOptIn(v === true)} disabled={pending} id="email-optin" />
            <Label htmlFor="email-optin">Email opt-in</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={marketingOptIn} onCheckedChange={(v) => setMarketingOptIn(v === true)} disabled={pending} id="marketing-optin" />
            <Label htmlFor="marketing-optin">Marketing opt-in</Label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Data processing consent at</Label>
              <Input type="datetime-local" value={dataConsentAt} onChange={(e) => setDataConsentAt(e.target.value)} disabled={pending} />
            </div>
            <div className="grid gap-2">
              <Label>Ethics training completed at</Label>
              <Input type="datetime-local" value={ethicsCompletedAt} onChange={(e) => setEthicsCompletedAt(e.target.value)} disabled={pending} />
            </div>
          </div>
        </div>
      </section>

      {message && <p className={`text-sm ${message === "Saved." ? "text-green-600" : "text-red-600"}`}>{message}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

