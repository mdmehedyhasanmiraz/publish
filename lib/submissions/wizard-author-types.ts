/** Payload shape stored in submissions.author_affiliations (wizard step 3). */
export type WizardAuthorAffiliation = {
  institution_name: string;
  department: string;
  position_title: string;
  city: string;
  country_code: string;
  start_date: string;
  end_date: string;
  is_primary: boolean;
};

export type WizardAuthorRow = {
  salutation: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  display_name: string;
  email: string;
  alternate_email: string;
  phone: string;
  whatsapp: string;
  orcid_id: string;
  scopus_author_id: string;
  wos_researcher_id: string;
  google_scholar_url: string;
  loop_profile_url: string;
  publons_url: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_region: string;
  postal_code: string;
  country_code: string;
  affiliations: WizardAuthorAffiliation[];
  credit_roles?: string[];
  is_corresponding_author?: boolean;
};
