import Image from "next/image";
import Link from "next/link";

/** Canonical CC BY 4.0 deed (Creative Commons). */
export const CC_BY_4_0_URL = "https://creativecommons.org/licenses/by/4.0/";

type Props = {
  className?: string;
  /** When true, adds a short caption above the badge. */
  showCaption?: boolean;
};

/**
 * Standard CC BY 4.0 button linking to the license deed ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
 */
export function CcByLicenseBadge({ className, showCaption }: Props) {
  return (
    <div className={className}>
      {showCaption ? (
        <p className="mb-2 text-xs font-medium text-muted-foreground">License</p>
      ) : null}
      <Link
        href={CC_BY_4_0_URL}
        target="_blank"
        rel="license noopener noreferrer"
        className="inline-flex items-center"
      >
        <img
          src="https://licensebuttons.net/l/by/4.0/88x31.png"
          alt="Creative Commons Attribution 4.0 International"
          width={88}
          height={31}
        />
      </Link>
    </div>
  );
}
