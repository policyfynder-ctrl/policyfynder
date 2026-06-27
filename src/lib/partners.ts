// Insurance partners shown in the "Our Insurance Partners" section.
//
// IMPORTANT (per approval): names below are the clearly legible insurers from the
// reference partner image (bnetinsurancebrokers.com). Unclear / unverified emblems
// were deliberately excluded. No logos are invented — this list renders as polished
// TEXT placeholders that are logo-ready: once approved logo image assets are supplied,
// swap each entry's `logo` in and the grid renders the image instead of the name.
//
// Pending: final partner list + logo source approval before real logo implementation.

export type Partner = {
  name: string
  /** Optional path to an approved logo asset (e.g. /partners/lic.svg). Until then, text placeholder. */
  logo?: string
}

export const partners: Partner[] = [
  { name: 'LIC' },
  { name: 'HDFC Life' },
  { name: 'SBI Life' },
  { name: 'ICICI Prudential' },
  { name: 'Max Life' },
  { name: 'Tata AIA' },
  { name: 'Bajaj Allianz Life' },
  { name: 'PNB MetLife' },
  { name: 'Reliance Nippon Life' },
  { name: 'ICICI Lombard' },
  { name: 'HDFC ERGO' },
  { name: 'Bajaj Allianz' },
  { name: 'IFFCO-Tokio' },
  { name: 'New India Assurance' },
  { name: 'National Insurance' },
  { name: 'SBI General' },
  { name: 'Tata AIG' },
  { name: 'Future Generali' },
  { name: 'Reliance General' },
  { name: 'Go Digit' },
  { name: 'Universal Sompo' },
  { name: 'Cholamandalam MS' },
  { name: 'Royal Sundaram' },
  { name: 'Liberty General' },
  { name: 'Niva Bupa' },
  { name: 'Care Health' },
  { name: 'Star Health' },
  { name: 'ManipalCigna' },
  { name: 'Aditya Birla Health' },
  { name: 'Zurich Kotak' },
]
