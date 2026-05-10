import { addCacheBuster } from "@/lib/utils/cache-buster";
import { buildApiHeaders } from "@/lib/utils/api-headers";
import type { ChangePassword } from "@/lib/types/user";
import { toast } from "@/components/common/Toast";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";
import env from "@/env.ts";


export function useUserHandle() {
  const { t } = useTranslation()
  const token = localStorage.getItem("token")!


  const handleUserInfo = useCallback(async (logout: () => void) => {
    try {
      const response = await fetch(addCacheBuster(env.API_URL + "/api/user/info"), {
        method: "GET",
        headers: buildApiHeaders({ token }),
      })

      if (!response.ok) {
        console.warn("User info fetch failed, but not logging out as per requirement.")
        return
      }

      const res = await response.json()
      // 只有 请求成功 且接口里 的 data 不存在的时候 才清理用户信息
      if (!res.data) {
        toast.error(t("sessionExpired"))
        logout()
      }
    } catch (e) {
      console.error(t("getWebGuiConfigError"), e)
      // 请求失败时不清理本地存储
    }
  }, [token, t])


  const handleLogout = useCallback(async () => {
    if (!token) return
    try {
      await fetch(addCacheBuster(env.API_URL + "/api/auth/logout"), {
        method: "POST",
        headers: buildApiHeaders({ token }),
      })
    } catch (e) {
      console.error("Logout request failed", e)
    }
  }, [token])


  const handleUserChangePassword = useCallback(async (data: ChangePassword, callback: (data2: ChangePassword) => void) => {

    const formData = { ...data }

    const response = await fetch(addCacheBuster(env.API_URL + "/api/user/change_password"), {
      method: "POST",
      body: JSON.stringify(formData),
      headers: buildApiHeaders({ token }),
    })
    if (!response.ok) {
      throw new Error("Network response was not ok")
    }
    const res = await response.json()
    if (res.code < 100 && res.code > 0) {
      toast.success(res.message)

      callback(data)
    } else {
      toast.error(res.message + ": " + res.details)
    }
  }, [token])


  return useMemo(() => ({
    handleUserChangePassword, handleUserInfo, handleLogout
  }), [handleUserChangePassword, handleUserInfo, handleLogout])
}
