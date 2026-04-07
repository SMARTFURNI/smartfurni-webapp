"use client";

import { useState } from "react";
import {
  Mail, MessageCircle, ArrowRight, User, Tag, Trash2, X, Send, Loader2,
} from "lucide-react";
import type { Lead, LeadStage } from "@/lib/crm-types";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/crm-types";

interface BulkActionsToolbarProps {
  selectedLeads: Lead[];
  onClearSelection: () => void;
  onLeadsUpdated: (updatedLeads: Lead[]) => void;
  staffList?: Array<{ id: string; fullName: string }>;
}

type ActionModal = "email" | "zalo" | "stage" | "assign" | "tag" | null;

export default function BulkActionsToolbar({
  selectedLeads,
  onClearSelection,
  onLeadsUpdated,
  staffList = [],
}: BulkActionsToolbarProps) {
  const [activeModal, setActiveModal] = useState<ActionModal>(null);
  const [loading, setLoading] = useState(false);

  // Email Modal State
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Zalo Modal State
  const [zaloMessage, setZaloMessage] = useState("");

  // Stage Modal State
  const [selectedStage, setSelectedStage] = useState<LeadStage | "">("");

  // Assign Modal State
  const [selectedStaff, setSelectedStaff] = useState("");

  // Tag Modal State
  const [tagName, setTagName] = useState("");

  if (selectedLeads.length === 0) return null;

  async function handleSendEmail() {
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert("Please fill in subject and body");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/crm/bulk-actions/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedLeads.map(l => l.id),
          subject: emailSubject,
          body: emailBody,
        }),
      });

      if (!response.ok) throw new Error("Failed to send emails");

      alert(`Email sent to ${selectedLeads.length} leads`);
      setActiveModal(null);
      setEmailSubject("");
      setEmailBody("");
      onClearSelection();
    } catch (err) {
      console.error("Error sending emails:", err);
      alert("Failed to send emails");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendZalo() {
    if (!zaloMessage.trim()) {
      alert("Please enter a message");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/crm/bulk-actions/send-zalo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedLeads.map(l => l.id),
          message: zaloMessage,
        }),
      });

      if (!response.ok) throw new Error("Failed to send Zalo messages");

      alert(`Zalo message sent to ${selectedLeads.length} leads`);
      setActiveModal(null);
      setZaloMessage("");
      onClearSelection();
    } catch (err) {
      console.error("Error sending Zalo:", err);
      alert("Failed to send Zalo messages");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeStage() {
    if (!selectedStage) {
      alert("Please select a stage");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/crm/bulk-actions/change-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedLeads.map(l => l.id),
          stage: selectedStage,
        }),
      });

      if (!response.ok) throw new Error("Failed to update stage");

      const updated = selectedLeads.map(l => ({ ...l, stage: selectedStage as LeadStage }));
      onLeadsUpdated(updated);

      alert(`Stage updated for ${selectedLeads.length} leads`);
      setActiveModal(null);
      setSelectedStage("");
      onClearSelection();
    } catch (err) {
      console.error("Error updating stage:", err);
      alert("Failed to update stage");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignTo() {
    if (!selectedStaff) {
      alert("Please select a staff member");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/crm/bulk-actions/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedLeads.map(l => l.id),
          staffId: selectedStaff,
        }),
      });

      if (!response.ok) throw new Error("Failed to assign leads");

      const staffMember = staffList.find(s => s.id === selectedStaff);
      const updated = selectedLeads.map(l => ({
        ...l,
        assignedTo: staffMember?.fullName || "",
      }));
      onLeadsUpdated(updated);

      alert(`Assigned ${selectedLeads.length} leads`);
      setActiveModal(null);
      setSelectedStaff("");
      onClearSelection();
    } catch (err) {
      console.error("Error assigning leads:", err);
      alert("Failed to assign leads");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTag() {
    if (!tagName.trim()) {
      alert("Please enter a tag name");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/crm/bulk-actions/add-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedLeads.map(l => l.id),
          tag: tagName,
        }),
      });

      if (!response.ok) throw new Error("Failed to add tag");

      alert(`Tag added to ${selectedLeads.length} leads`);
      setActiveModal(null);
      setTagName("");
      onClearSelection();
    } catch (err) {
      console.error("Error adding tag:", err);
      alert("Failed to add tag");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${selectedLeads.length} leads? This action cannot be undone.`)) return;

    setLoading(true);
    try {
      const response = await fetch("/api/crm/bulk-actions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedLeads.map(l => l.id),
        }),
      });

      if (!response.ok) throw new Error("Failed to delete leads");

      alert(`${selectedLeads.length} leads deleted`);
      onClearSelection();
    } catch (err) {
      console.error("Error deleting leads:", err);
      alert("Failed to delete leads");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="fixed bottom-6 left-6 right-6 bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 z-40">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm font-medium text-gray-700">
            {selectedLeads.length} leads selected
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveModal("email")}
              className="flex items-center gap-2 px-3 py-2 bg-[rgba(255,255,255,0.07)] border border-gray-300 rounded hover:bg-[rgba(255,255,255,0.05)] text-sm"
              disabled={loading}
            >
              <Mail size={16} />
              Email
            </button>

            <button
              onClick={() => setActiveModal("zalo")}
              className="flex items-center gap-2 px-3 py-2 bg-[rgba(255,255,255,0.07)] border border-gray-300 rounded hover:bg-[rgba(255,255,255,0.05)] text-sm"
              disabled={loading}
            >
              <MessageCircle size={16} />
              Zalo
            </button>

            <button
              onClick={() => setActiveModal("stage")}
              className="flex items-center gap-2 px-3 py-2 bg-[rgba(255,255,255,0.07)] border border-gray-300 rounded hover:bg-[rgba(255,255,255,0.05)] text-sm"
              disabled={loading}
            >
              <ArrowRight size={16} />
              Stage
            </button>

            <button
              onClick={() => setActiveModal("assign")}
              className="flex items-center gap-2 px-3 py-2 bg-[rgba(255,255,255,0.07)] border border-gray-300 rounded hover:bg-[rgba(255,255,255,0.05)] text-sm"
              disabled={loading}
            >
              <User size={16} />
              Assign
            </button>

            <button
              onClick={() => setActiveModal("tag")}
              className="flex items-center gap-2 px-3 py-2 bg-[rgba(255,255,255,0.07)] border border-gray-300 rounded hover:bg-[rgba(255,255,255,0.05)] text-sm"
              disabled={loading}
            >
              <Tag size={16} />
              Tag
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded hover:bg-red-100 text-sm"
              disabled={loading}
            >
              <Trash2 size={16} />
              Delete
            </button>

            <button
              onClick={onClearSelection}
              className="flex items-center gap-2 px-3 py-2 bg-[rgba(255,255,255,0.07)] border border-gray-300 rounded hover:bg-[rgba(255,255,255,0.05)] text-sm"
              disabled={loading}
            >
              <X size={16} />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {activeModal === "email" && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-900">Send Email</h2>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Email body"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <p className="text-xs text-gray-500">
                Will be sent to {selectedLeads.length} leads
              </p>
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-[rgba(255,255,255,0.05)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zalo Modal */}
      {activeModal === "zalo" && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-900">Send Zalo Message</h2>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={zaloMessage}
                  onChange={(e) => setZaloMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={6}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {zaloMessage.length}/1000 characters
                </p>
              </div>

              <p className="text-xs text-gray-500">
                Will be sent to {selectedLeads.length} leads
              </p>
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-[rgba(255,255,255,0.05)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSendZalo}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage Modal */}
      {activeModal === "stage" && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-900">Change Stage</h2>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Stage</label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value as LeadStage)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a stage...</option>
                  {Object.entries(STAGE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-gray-500">
                Will update {selectedLeads.length} leads
              </p>
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-[rgba(255,255,255,0.05)]"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeStage}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {activeModal === "assign" && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-900">Assign To</h2>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member</label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select staff...</option>
                  {staffList.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-gray-500">
                Will assign {selectedLeads.length} leads
              </p>
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-[rgba(255,255,255,0.05)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTo}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {activeModal === "tag" && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-900">Add Tag</h2>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag Name</label>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="e.g., VIP, Hot Lead, Follow-up"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <p className="text-xs text-gray-500">
                Will add tag to {selectedLeads.length} leads
              </p>
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-[rgba(255,255,255,0.05)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTag}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Add Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
