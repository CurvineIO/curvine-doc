/**
 * Adopters of Curvine, rendered in the "Who's Using Curvine" section on the homepage.
 *
 * SOURCE OF TRUTH: the `ADOPTERS.md` file in the CurvineIO/curvine repository.
 * When a new adopter PR is merged there, mirror the entry here:
 *   1. Add the logo file to `static/img/adopters/<org-name>.svg` (or .png)
 *   2. Append an entry to `ADOPTERS` below
 * Organizations without a logo yet are rendered with a text placeholder.
 */
export type Adopter = {
  /** Organization name as displayed */
  name: string;
  /** Logo file under /img/adopters/, without leading slash. Omit to render a text placeholder. */
  logo?: string;
  /** Optional website URL; when set the logo/name links to the organization */
  website?: string;
};

export const ADOPTERS: Adopter[] = [
  {
    name: 'OPPO',
    logo: 'img/adopters/oppo.svg',
  },
];
