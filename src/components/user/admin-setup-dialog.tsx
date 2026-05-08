import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Shield, Loader2, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "@/components/common/Toast";
import { addCacheBuster } from "@/lib/utils/cache-buster";
import { buildApiHeaders } from "@/lib/utils/api-headers";
import env from "@/env.ts";

interface AdminSetupDialogProps {
  onDone: () => void;
}

export function AdminSetupDialog({ onDone }: AdminSetupDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleSetAdmin = async () => {
    setLoading(true);
    const token = localStorage.getItem("token") || "";
    const currentUidStr = localStorage.getItem("uid");
    
    if (!currentUidStr) {
      toast.error(t("ui.auth.sessionExpired"));
      setLoading(false);
      return;
    }

    const currentUid = parseInt(currentUidStr);

    try {
      const apiUrl = env.API_URL.endsWith("/") ? env.API_URL.slice(0, -1) : env.API_URL
      
      // Directly POST the update
      const saveRes = await fetch(addCacheBuster(`${apiUrl}/api/admin/config`), {
        method: "POST",
        headers: buildApiHeaders({ token }),
        body: JSON.stringify({ adminUid: currentUid }),
      });
      
      const saveResult = await saveRes.json();
      
      if (saveResult.code > 0) {
        toast.success(t("ui.settings.settingAdminSuccess"));
        onDone();
      } else {
        toast.error(saveResult.message || t("ui.settings.saveFailed"));
      }
    } catch (error) {
      console.error("Admin setup failed:", error);
      toast.error(t("ui.settings.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={true}>
      <AlertDialogContent className="rounded-2xl max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t("ui.settings.adminSetupTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-2 text-base">
            {t("ui.settings.adminSetupDesc")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-4">
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleSetAdmin();
            }}
            disabled={loading}
            className="rounded-xl w-full sm:w-auto gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            {t("ui.settings.setCurrentAsAdmin")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
