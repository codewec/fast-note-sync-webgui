import { addCacheBuster } from "@/lib/utils/cache-buster"
import { buildApiHeaders } from "@/lib/utils/api-headers"
import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import env from "@/env.ts"
import type { UserInfo } from "@/lib/types/user"

export function useUsers(initialPageSize = 3) {
  const { t } = useTranslation()
  const token = localStorage.getItem("token")
  const [users, setUsers] = useState<UserInfo[]>([])
  const [page, setPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(
    async (isActive?: { current: boolean }) => {
      if (!token) return
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(
          addCacheBuster(env.API_URL + `/api/admin/users/list?page=${page}&pageSize=${initialPageSize}`),
          {
            method: "GET",
            headers: buildApiHeaders({
              token,
              includeDomain: false,
            }),
          },
        )

        if (!response.ok) {
          throw new Error("Network response was not ok")
        }

        const res = await response.json()
        if (isActive && !isActive.current) {
          return
        }
        if (res.code < 100 && res.code > 0 && res.data) {
          setUsers(res.data.list || [])
          setTotalRows(res.data.pager?.totalRows || 0)
        } else {
          setError(res.message || t("ui.users.getUserListError"))
        }
      } catch (error: unknown) {
        if (isActive && !isActive.current) {
          return
        }
        if (error instanceof Error && error.name === "AbortError") {
          return
        }
        setError(t("ui.users.getUserListError"))
      } finally {
        if (!isActive || isActive.current) {
          setIsLoading(false)
        }
      }
    },
    [token, page, initialPageSize, t],
  )

  useEffect(() => {
    const isActive = { current: true }
    fetchUsers(isActive)

    return () => {
      isActive.current = false
    }
  }, [fetchUsers])

  return {
    users,
    totalRows,
    page,
    setPage,
    isLoading,
    error,
    refresh: fetchUsers,
  }
}
