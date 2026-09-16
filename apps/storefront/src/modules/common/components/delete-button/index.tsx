import { deleteLineItem } from "@lib/data/cart"
import { Spinner, Trash } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"
import { useCartCount } from "@modules/common/components/cart-count"
import { useState } from "react"

const DeleteButton = ({
  id,
  children,
  className,
  quantity,
  "data-testid": dataTestid,
}: {
  id: string
  children?: React.ReactNode
  className?: string
  // Line quantity, when known: the badge drops instantly and rolls back if
  // the server delete fails.
  quantity?: number
  "data-testid"?: string
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const { bump } = useCartCount()

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    if (quantity) {
      bump(-quantity)
    }
    await deleteLineItem(id).catch((_err) => {
      if (quantity) {
        bump(quantity)
      }
      setIsDeleting(false)
    })
  }

  return (
    <div
      className={clx(
        "flex items-center justify-between text-small-regular",
        className
      )}
    >
      <button
        className="flex gap-x-1 text-ui-fg-subtle hover:text-ui-fg-base cursor-pointer"
        onClick={() => handleDelete(id)}
        aria-label={typeof children === "string" ? children : "Remove item"}
        data-testid={dataTestid}
      >
        {isDeleting ? <Spinner className="animate-spin" /> : <Trash />}
        {children && <span>{children}</span>}
      </button>
    </div>
  )
}

export default DeleteButton
