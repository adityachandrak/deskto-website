interface StatusBadgeProps {
  status: string;
  variant?: "default" | "sm";
}

const STATUS_VARIANT: Record<string, { class: string; label?: string }> = {
  // Order
  placed:       { class: "glass-pill-warn",    label: "Placed" },
  verified:     { class: "glass-pill-info",    label: "Verified" },
  packing:      { class: "glass-pill-info",    label: "Packing" },
  shipped:      { class: "glass-pill-info",    label: "Shipped" },
  delivered:    { class: "glass-pill-success", label: "Delivered" },
  cancelled:    { class: "glass-pill-red",     label: "Cancelled" },
  // Repair
  submitted:    { class: "glass-pill-warn",    label: "Submitted" },
  received:     { class: "glass-pill-warn",    label: "Received" },
  "admin-approved": { class: "glass-pill-success", label: "Admin Approved" },
  assigned:     { class: "glass-pill-info",    label: "Assigned" },
  diagnosing:   { class: "glass-pill-info",    label: "Diagnosing" },
  quotation:    { class: "glass-pill-info",    label: "Quotation" },
  "quote-approved": { class: "glass-pill-success", label: "Quote Approved" },
  "payment-pending": { class: "glass-pill-warn", label: "Payment Pending" },
  approved:     { class: "glass-pill-success", label: "Approved" },
  "device-received": { class: "glass-pill-info", label: "Device Received" },
  "in-repair":  { class: "glass-pill-info",    label: "In Repair" },
  "repair-progress": { class: "glass-pill-info", label: "Repair Progress" },
  qc:           { class: "glass-pill-info",    label: "QC" },
  completed:    { class: "glass-pill-success", label: "Completed" },
  "invoice-generated": { class: "glass-pill-info", label: "Invoice Generated" },
  "warranty-generated": { class: "glass-pill-info", label: "Warranty Generated" },
  ready:        { class: "glass-pill-success", label: "Ready" },
  "review-requested": { class: "glass-pill-success", label: "Review Requested" },
  closed:       { class: "glass-pill",         label: "Closed" },
  // Rental
  reserved:     { class: "glass-pill-warn",    label: "Reserved" },
  active:       { class: "glass-pill-success", label: "Active" },
  returning:    { class: "glass-pill-info",    label: "Returning" },
  returned:     { class: "glass-pill",         label: "Returned" },
  overdue:      { class: "glass-pill-red",     label: "Overdue" },
  // PC Build
  requested:    { class: "glass-pill-warn",    label: "Requested" },
  "admin-review": { class: "glass-pill-info",  label: "Admin Review" },
  "components-verified": { class: "glass-pill-success", label: "Components Verified" },
  paid:         { class: "glass-pill-success", label: "Paid" },
  "technician-assigned": { class: "glass-pill-info", label: "Technician Assigned" },
  assembling:   { class: "glass-pill-info",    label: "Assembling" },
  "software-install": { class: "glass-pill-info", label: "Software Install" },
  "stress-test": { class: "glass-pill-info",   label: "Stress Test" },
  packed:       { class: "glass-pill-info",    label: "Packed" },
  // Assembly
  queued:       { class: "glass-pill-warn",   label: "Queued" },
  building:     { class: "glass-pill-info",    label: "Building" },
  tested:       { class: "glass-pill-info",    label: "Tested" },
  // Service Request
  inspection:   { class: "glass-pill-info",    label: "Inspection" },
  diagnosis:    { class: "glass-pill-info",    label: "Diagnosis" },
  "compatibility-verified": { class: "glass-pill-success", label: "Compatibility Verified" },
  "documents-verified": { class: "glass-pill-success", label: "Documents Verified" },
  "agreement-generated": { class: "glass-pill-info", label: "Agreement Generated" },
  "offer-sent":  { class: "glass-pill-info",    label: "Offer Sent" },
  accepted:     { class: "glass-pill-success", label: "Accepted" },
  "product-prepared": { class: "glass-pill-info", label: "Product Prepared" },
  "product-received": { class: "glass-pill-info", label: "Product Received" },
  "return-requested": { class: "glass-pill-info", label: "Return Requested" },
  refunded:     { class: "glass-pill-warn",    label: "Refunded" },
  "inventory-added": { class: "glass-pill-success", label: "Inventory Added" },
  "quality-testing": { class: "glass-pill-info", label: "Quality Testing" },
  optimization: { class: "glass-pill-info",    label: "Optimization" },
  "data-recovery": { class: "glass-pill-info", label: "Data Recovery" },
  // Ticket
  open:         { class: "glass-pill-warn",    label: "Open" },
  "in-progress": { class: "glass-pill-info",   label: "In Progress" },
  "waiting-customer": { class: "glass-pill-warn", label: "Waiting on Customer" },
  resolved:     { class: "glass-pill-success", label: "Resolved" },
  // Task
  todo:         { class: "glass-pill-warn",    label: "To Do" },
  done:         { class: "glass-pill-success", label: "Done" },
  // Delivery
  dispatched:   { class: "glass-pill-info",    label: "Dispatched" },
  // PO
  draft:        { class: "glass-pill",         label: "Draft" },
  sent:         { class: "glass-pill-info",    label: "Sent" },
  // Inventory
  pending:      { class: "glass-pill-warn",    label: "Pending" },
  rejected:     { class: "glass-pill-red",    label: "Rejected" },
  // Marketplace
  inspecting:   { class: "glass-pill-info",    label: "Inspecting" },
  priced:       { class: "glass-pill-info",    label: "Priced" },
  published:    { class: "glass-pill-success", label: "Published" },
  // Support/Ticket
  "session-scheduled": { class: "glass-pill-info", label: "Session Scheduled" },
  connected:    { class: "glass-pill-success", label: "Connected" },
};

export function StatusBadge({ status, variant = "sm" }: StatusBadgeProps) {
  const conf = STATUS_VARIANT[status] || { class: "glass-pill", label: status };
  return (
    <span className={`glass-pill ${conf.class} ${variant === "sm" ? "glass-pill-sm" : ""}`} style={{ pointerEvents: "none" }}>
      {conf.label}
    </span>
  );
}