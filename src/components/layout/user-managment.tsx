import { Pen, Plus, Users, ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useUsers } from "../api-handle/user-users"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { CreateUser } from "@/components/user/create-form"
import { UserInfo } from "@/lib/types/user"
import { EditUser } from "../user/edit-form"
import { cn } from "@/lib/utils"
import { Tooltip } from "@/components/ui/tooltip"
import { Badge } from "../ui/badge"

export function UserManagment({ adminUid = 0 }: { adminUid?: number }) {
  const { t } = useTranslation()
  const { users, totalRows, page, setPage, isLoading, error, refresh } = useUsers(3)
  const totalPages = Math.ceil(totalRows / 3)
  const [createUserFormOpen, setCreateUserFormOpen] = useState(false)
  const [editUserFormOpen, setEditUserFormOpen] = useState<UserInfo | null>(null)

  const onCreateUserFormClose = (needRefresh: boolean) => {
    setCreateUserFormOpen(false)
    if (needRefresh) {
      refresh()
    }
  }

  const onEditUserFormClose = (needRefresh: boolean) => {
    setEditUserFormOpen(null)
    if (needRefresh) {
      refresh()
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 custom-shadow">
      <Dialog open={createUserFormOpen} onOpenChange={setCreateUserFormOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>{t("ui.users.createUser")}</DialogTitle>
          </DialogHeader>
          <CreateUser onClose={onCreateUserFormClose} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={editUserFormOpen != null}
        onOpenChange={() => setEditUserFormOpen(null)}
      >
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>{t("ui.users.editUser")}</DialogTitle>
          </DialogHeader>
          {editUserFormOpen && (
            <EditUser user={editUserFormOpen} disableDeletion={ adminUid !== 0 && editUserFormOpen.uid === adminUid  } onClose={onEditUserFormClose} />
          )}
        </DialogContent>
      </Dialog>
      <div className="flex justify-between">
        <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("ui.users.userManagment")}
        </h2>
        <Button
          onClick={() => {
            setCreateUserFormOpen(true)
          }}
          className="rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("ui.common.add")}
        </Button>
      </div>
      {isLoading && (
        <div className="p-8 text-center">{t("ui.common.loading")}</div>
      )}
      {error && <div className="p-8 text-center">{error}</div>}
      {!error && (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">{t("ui.users.userUid")}</TableHead>
                <TableHead className="w-20">
                  {t("ui.users.user")}
                </TableHead>
                <TableHead className="text-center">{t("ui.users.createdAtOrUpdatedAt")}</TableHead>
                <TableHead className="text-center">{t("ui.users.userStatus")}</TableHead>
                <TableHead className="text-center">
                  {t("ui.common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.uid}
                  className={cn(
                    "hover:bg-muted/50 transition-colors",
                    user.isDeleted ? "bg-muted/90" : "",
                  )}
                >
                  <TableCell className="font-mono">{user.uid}</TableCell>
                  <TableCell>
                    <div  className="flex gap-4">
                    <button
                      className="size-9 rounded-full bg-muted flex items-center justify-center transition-all duration-200 ring-2 ring-ring/30 hover:ring-ring/50 focus-visible:outline-none focus-visible:ring-ring"
                      aria-label={t("ui.auth.userUid", { uid: user.uid })}
                    >
                      <span className="text-sm font-medium text-muted-foreground">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </button>
                    <div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{user.username}</span>
                        {adminUid !== 0 && user.uid === adminUid && (
                          <Badge className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 rounded-lg text-[10px] px-1.5 py-0 font-normal shadow-none">
                            {t("ui.users.userRoleAdmin")}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div></div>
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                      <Tooltip content={`${t("ui.common.createdAt")}: ${new Date(user.createdAt).toLocaleString()}`}>
                        <div className="text-muted-foreground/80 cursor-default text-[12px] leading-none">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </Tooltip>
                      <Tooltip content={`${t("ui.common.updatedAt")}: ${new Date(user.updatedAt).toLocaleString()}`}>
                        <div className="text-muted-foreground/45 text-[10px] leading-none border-t border-border/40 w-full pt-1.5 cursor-default">
                          {new Date(user.updatedAt).toLocaleDateString()}
                        </div>
                      </Tooltip>
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    <Badge variant={user.isDeleted ? 'destructive' : 'outline'} className="text-[10px] font-normal opacity-70">
                         {user.isDeleted ? t("ui.users.userStatusBlocked") : t("ui.users.userStatusActive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl shrink-0"
                      onClick={() => {
                        setEditUserFormOpen(user)
                      }}
                      title={t("ui.common.delete")}
                    >
                      <Pen className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1 px-4 py-1.5 bg-muted/50 rounded-xl border border-border/50 shadow-inner">
                <span className="text-sm font-semibold">{page}</span>
                <span className="text-sm text-muted-foreground">/</span>
                <span className="text-sm text-muted-foreground">{totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
