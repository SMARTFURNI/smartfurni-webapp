"use client";

import { useState, useRef, useEffect } from "react";
import {
  Phone, MessageCircle, History, Send, Mic, Square, Copy, Download, Loader2,
  Play, Trash2, FileText, X,
} from "lucide-react";
import type { Lead } from "@/lib/crm-types";

interface QuickInteractionPanelProps {
  lead: Lead;
  onClose?: () => void;
}

interface CallRecord {
  id: string;
  timestamp: Date;
  duration: number;
  recording?: string;
  transcription?: string;
  notes?: string;
}

interface MessageRecord {
  id: string;
  timestamp: Date;
  type: "sms" | "zalo";
  content: string;
  direction: "sent" | "received";
}

type TabType = "call" | "message" | "history";

export default function QuickInteractionPanel({ lead, onClose }: QuickInteractionPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("call");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [callStatus, setCallStatus] = useState<"ready" | "calling" | "in_progress" | "ended">("ready");
  const [callDuration, setCallDuration] = useState(0);

  // Call Tab State
  const [callNotes, setCallNotes] = useState("");
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Message Tab State
  const [messageType, setMessageType] = useState<"sms" | "zalo">("zalo");
  const [messageContent, setMessageContent] = useState("");

  // History
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [messageHistory, setMessageHistory] = useState<MessageRecord[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load history on mount
  useEffect(() => {
    loadCallHistory();
    loadMessageHistory();
  }, [lead.id]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [isRecording]);

  // Call duration timer
  useEffect(() => {
    if (callStatus === "in_progress") {
      callIntervalRef.current = setInterval(() => {
        setCallDuration(t => t + 1);
      }, 1000);
    } else {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
    }
    return () => {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
    };
  }, [callStatus]);

  async function loadCallHistory() {
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}/call-history`);
      if (res.ok) {
        const data = await res.json();
        setCallHistory(data);
      }
    } catch (err) {
      console.error("Failed to load call history:", err);
    }
  }

  async function loadMessageHistory() {
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}/message-history`);
      if (res.ok) {
        const data = await res.json();
        setMessageHistory(data);
      }
    } catch (err) {
      console.error("Failed to load message history:", err);
    }
  }

  async function handleClickToCall() {
    setCallStatus("calling");
    try {
      const response = await fetch("/api/crm/interactions/initiate-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          phoneNumber: lead.phone,
        }),
      });

      if (response.ok) {
        setCallStatus("in_progress");
        // Start recording automatically
        startRecording();
      } else {
        setCallStatus("ready");
        alert("Failed to initiate call");
      }
    } catch (err) {
      console.error("Error initiating call:", err);
      setCallStatus("ready");
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Cannot access microphone");
    }
  }

  async function stopRecording() {
    if (!mediaRecorderRef.current) return;

    setIsRecording(false);

    return new Promise<Blob>((resolve) => {
      mediaRecorderRef.current!.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        resolve(audioBlob);
      };

      mediaRecorderRef.current!.stop();
      mediaRecorderRef.current!.stream.getTracks().forEach(track => track.stop());
    });
  }

  async function handleEndCall() {
    setCallStatus("ended");

    // Stop recording and save
    if (isRecording) {
      const audioBlob = await stopRecording();

      // Save call record
      try {
        const formData = new FormData();
        formData.append("leadId", lead.id);
        formData.append("duration", callDuration.toString());
        formData.append("notes", callNotes);
        formData.append("audio", audioBlob as Blob);

        const response = await fetch("/api/crm/interactions/save-call", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setCallHistory(prev => [data, ...prev]);
          setCallNotes("");
          setTranscription(null);
        }
      } catch (err) {
        console.error("Error saving call:", err);
      }
    }

    setTimeout(() => setCallStatus("ready"), 2000);
  }

  async function handleGenerateTranscription() {
    if (!callHistory[0]?.recording) return;

    setIsTranscribing(true);
    try {
      const response = await fetch("/api/crm/interactions/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: callHistory[0].recording,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTranscription(data.transcription);
      }
    } catch (err) {
      console.error("Error transcribing:", err);
      alert("Failed to transcribe audio");
    } finally {
      setIsTranscribing(false);
    }
  }

  async function handleSendMessage() {
    if (!messageContent.trim()) {
      alert("Please enter a message");
      return;
    }

    try {
      const response = await fetch("/api/crm/interactions/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          type: messageType,
          content: messageContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessageHistory(prev => [data, ...prev]);
        setMessageContent("");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message");
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Quick Interactions</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("call")}
          className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "call"
              ? "text-blue-600 border-blue-600"
              : "text-gray-600 border-transparent hover:text-gray-900"
          }`}
        >
          <Phone size={16} className="inline mr-1" />
          Call
        </button>
        <button
          onClick={() => setActiveTab("message")}
          className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "message"
              ? "text-blue-600 border-blue-600"
              : "text-gray-600 border-transparent hover:text-gray-900"
          }`}
        >
          <MessageCircle size={16} className="inline mr-1" />
          Message
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "history"
              ? "text-blue-600 border-blue-600"
              : "text-gray-600 border-transparent hover:text-gray-900"
          }`}
        >
          <History size={16} className="inline mr-1" />
          History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Call Tab */}
        {activeTab === "call" && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600 mb-1">Phone Number</p>
              <p className="font-mono text-lg text-gray-900">{lead.phone}</p>
            </div>

            {/* Call Status */}
            <div className="text-center">
              <div className={`text-sm font-medium mb-2 ${
                callStatus === "in_progress" ? "text-green-600" :
                callStatus === "ended" ? "text-gray-600" :
                "text-gray-600"
              }`}>
                {callStatus === "ready" && "Ready to call"}
                {callStatus === "calling" && "Connecting..."}
                {callStatus === "in_progress" && "In Progress"}
                {callStatus === "ended" && "Call Ended"}
              </div>

              {callStatus === "in_progress" && (
                <div className="text-2xl font-mono text-blue-600 mb-3">
                  {formatTime(callDuration)}
                </div>
              )}
            </div>

            {/* Recording Indicator */}
            {isRecording && (
              <div className="flex items-center justify-center gap-2 bg-red-50 p-3 rounded">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <span className="text-sm text-red-600 font-medium">Recording...</span>
                <span className="text-sm text-red-600">{formatTime(recordingTime)}</span>
              </div>
            )}

            {/* Call Buttons */}
            <div className="flex gap-2">
              {callStatus === "ready" && (
                <button
                  onClick={handleClickToCall}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                >
                  <Phone size={18} />
                  Click to Call
                </button>
              )}

              {callStatus === "in_progress" && (
                <button
                  onClick={handleEndCall}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                >
                  <Square size={18} />
                  End Call
                </button>
              )}
            </div>

            {/* Call Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Call Notes</label>
              <textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Add notes about this call..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Transcription */}
            {callHistory.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Transcription</label>
                  {!transcription && (
                    <button
                      onClick={handleGenerateTranscription}
                      disabled={isTranscribing}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50 flex items-center gap-1"
                    >
                      {isTranscribing && <Loader2 size={12} className="animate-spin" />}
                      Generate
                    </button>
                  )}
                </div>

                {isTranscribing && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 size={14} className="animate-spin" />
                    Processing...
                  </div>
                )}

                {transcription && (
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 border border-gray-200 max-h-32 overflow-y-auto">
                    {transcription}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Message Tab */}
        {activeTab === "message" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message Type</label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as "sms" | "zalo")}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sms">SMS</option>
                <option value="zalo">Zalo ZNS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {messageType === "sms" ? "Phone" : "Zalo ID"}
              </label>
              <input
                type="text"
                value={lead.phone}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                maxLength={messageType === "sms" ? 160 : 1000}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                {messageContent.length}/{messageType === "sms" ? 160 : 1000} characters
              </p>
            </div>

            <button
              onClick={handleSendMessage}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              <Send size={16} />
              Send Message
            </button>

            {/* Recent Messages */}
            {messageHistory.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Messages</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {messageHistory.slice(0, 5).map(msg => (
                    <div key={msg.id} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                      <p className="text-gray-600">{new Date(msg.timestamp).toLocaleString()}</p>
                      <p className="text-gray-900 mt-1">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {callHistory.length === 0 && messageHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No interactions yet</p>
            ) : (
              <>
                {callHistory.map(call => (
                  <div key={call.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-gray-600">
                          {new Date(call.timestamp).toLocaleString()}
                        </p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          Call - {formatTime(call.duration)}
                        </p>
                        {call.notes && (
                          <p className="text-xs text-gray-700 mt-1">{call.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {call.recording && (
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <Play size={14} className="text-blue-600" />
                          </button>
                        )}
                        {call.transcription && (
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <FileText size={14} className="text-green-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {messageHistory.map(msg => (
                  <div key={msg.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="text-xs text-gray-600">
                      {new Date(msg.timestamp).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-900 mt-1">{msg.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {msg.type.toUpperCase()} • {msg.direction === "sent" ? "Sent" : "Received"}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
