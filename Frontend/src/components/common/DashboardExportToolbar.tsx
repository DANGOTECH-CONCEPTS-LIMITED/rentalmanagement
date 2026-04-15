import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardExportToolbarProps {
  onExportPdf: () => Promise<void> | void;
  onExportExcel: () => Promise<void> | void;
  className?: string;
}

const DashboardExportToolbar = ({
  onExportPdf,
  onExportExcel,
  className,
}: DashboardExportToolbarProps) => {
  const [pendingAction, setPendingAction] = useState<"pdf" | "excel" | null>(null);

  const runAction = async (
    action: "pdf" | "excel",
    callback: () => Promise<void> | void
  ) => {
    setPendingAction(action);

    try {
      await callback();
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div
      data-dashboard-export-ignore
      className={className ?? "flex flex-wrap items-center gap-2"}
    >
      <Button
        type="button"
        variant="outline"
        onClick={() => runAction("excel", onExportExcel)}
        disabled={pendingAction !== null}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        {pendingAction === "excel" ? "Exporting Excel..." : "Export Excel"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => runAction("pdf", onExportPdf)}
        disabled={pendingAction !== null}
      >
        <FileText className="mr-2 h-4 w-4" />
        {pendingAction === "pdf" ? "Exporting PDF..." : "Export PDF"}
      </Button>
    </div>
  );
};

export default DashboardExportToolbar;