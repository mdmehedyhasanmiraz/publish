import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductionHomePage() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Production overview</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Open the pipeline for copyediting, typesetting, and publication status.
      </p>
      <div className="mt-5">
        <Button asChild>
          <Link href="/production/pipeline">Open pipeline</Link>
        </Button>
      </div>
    </div>
  );
}
