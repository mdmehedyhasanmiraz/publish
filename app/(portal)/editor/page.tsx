import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EditorHomePage() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Editorial overview</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Open the queue to see manuscripts in editorial stages and recent decisions.
      </p>
      <div className="mt-5">
        <Button asChild>
          <Link href="/editor/queue">Open editorial queue</Link>
        </Button>
      </div>
    </div>
  );
}
