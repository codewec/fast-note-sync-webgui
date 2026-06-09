import type { LoginFormData, RegisterFormData } from "@/lib/validations/user-schema";
import { addCacheBuster } from "@/lib/utils/cache-buster";
import { buildApiHeaders } from "@/lib/utils/api-headers";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import env from "@/env.ts";


export function useAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useTranslation()

  const login = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const storedTokenId = localStorage.getItem("tokenId")
      const tokenId = storedTokenId ? parseInt(storedTokenId, 10) : undefined

      const response = await fetch(addCacheBuster(env.API_URL + "/api/user/login"), {
        method: "POST",
        body: JSON.stringify({
          ...data,
          tokenId: (tokenId && !isNaN(tokenId)) ? tokenId : undefined,
        }),
        headers: buildApiHeaders({ token: null }),
      })

      if (!response.ok) {
        throw new Error("Network response was not ok")
      }

      const res = await response.json()
      if (res.code < 100 && res.code > 0) {
        localStorage.setItem("token", res.data.token)
        localStorage.setItem("username", res.data.username)
        localStorage.setItem("uid", res.data.uid)
        localStorage.setItem("avatar", res.data.avatar)
        localStorage.setItem("email", res.data.email)
        if (res.data.tokenId) {
          localStorage.setItem("tokenId", String(res.data.tokenId))
        }
        return { success: true, message: res.data.message }
      } else {
        const errorMsg = res.details ? `${res.message}: ${res.details}` : res.message
        return { success: false, error: errorMsg }
      }
    } catch (_error) {
      return { success: false, error: t("ui.auth.loginRequestFailed") }
    } finally {
      setIsLoading(false)
    }
  }

  const registerUser = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch(addCacheBuster(env.API_URL + "/api/user/register"), {
        method: "POST",
        body: JSON.stringify(data),
        headers: buildApiHeaders({ token: null }),
      })

      if (!response.ok) {
        throw new Error("Network response was not ok")
      }

      const res = await response.json()

      if (res.code < 100 && res.code > 0) {
        localStorage.setItem("token", res.data.token)
        localStorage.setItem("username", res.data.username)
        localStorage.setItem("uid", res.data.uid)
        localStorage.setItem("avatar", res.data.avatar)
        localStorage.setItem("email", res.data.email)
        if (res.data.tokenId) {
          localStorage.setItem("tokenId", String(res.data.tokenId))
        }
        return { success: true }
      } else {
        const errorMsg = res.details ? `${res.message}: ${res.details}` : res.message
        return { success: false, error: errorMsg }
      }
    } catch (_error) {
      return { success: false, error: t("ui.auth.registerRequestFailed") }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    login,
    registerUser,
  }
}
