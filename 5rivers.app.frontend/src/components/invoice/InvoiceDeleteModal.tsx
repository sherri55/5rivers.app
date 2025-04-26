"use client";
import Modal from "react-modal";
import { Button } from "@/components/ui/Button";

interface Props {
  invoiceNumber: string | null;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}
export function InvoiceDeleteModal({
  invoiceNumber,
  isOpen,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onCancel}
      style={{ content: { maxWidth: "400px", margin: "auto" } }}
    >
      <div className="p-4">
        <h3 className="text-lg font-medium mb-2">Confirm Delete</h3>
        <p className="mb-4">
          Delete invoice <strong>{invoiceNumber}</strong>? This cannot be
          undone.
        </p>
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
