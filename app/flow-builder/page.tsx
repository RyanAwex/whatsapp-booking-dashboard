"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  RefreshCw,
  Zap,
  MessageSquare,
  Calendar,
  Scissors,
  MapPin,
  ExternalLink,
  ChevronLeft,
  Video,
  Phone,
  MoreVertical,
  Wifi,
  Battery,
  Edit,
  Smile,
  Paperclip,
  Camera,
  Mic,
  ArrowRight,
  X,
  Plus,
  Trash2,
  Undo2,
  CheckCheck,
} from "lucide-react";

// Flow Node Interface
interface FlowNode {
  id: string;
  title: string;
  type: "trigger" | "message" | "options_menu" | "list";
  text: string;
  options?: {
    id: string;
    text: string;
    targetNodeId: string;
  }[];
  link?: string;
  items?: string[];
  iconName: "trigger" | "message" | "link" | "services" | "location";
}

// Chat Message Interface for Phone Simulation
interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
  type?: "text" | "options" | "list" | "link";
  options?: string[];
  listItems?: string[];
  linkUrl?: string;
}

export default function FlowBuilderPage() {
  // 1. Initial State for all conversation flow nodes
  const [nodes, setNodes] = useState<Record<string, FlowNode>>({
    trigger: {
      id: "trigger",
      title: "Trigger: Customer Message",
      type: "trigger",
      text: "Hi Salon",
      iconName: "trigger",
    },
    greeting: {
      id: "greeting",
      title: "Greeting & Menu Options",
      type: "options_menu",
      text: "Hello! Welcome to Bookly Salon assistant. 🤖\n\nWhat would you like to do today? Please choose an option below:",
      options: [
        { id: "opt-1", text: "Book appointment", targetNodeId: "booking" },
        { id: "opt-2", text: "View services", targetNodeId: "services" },
        { id: "opt-3", text: "Location", targetNodeId: "location" },
      ],
      iconName: "message",
    },
    booking: {
      id: "booking",
      title: "Reply: Appointment Link",
      type: "message",
      text: "Sure! Let's get you scheduled. Click the link below to visit our booking page and select your slot:",
      link: "http://localhost:3000/book",
      iconName: "link",
    },
    services: {
      id: "services",
      title: "Reply: Services Catalog",
      type: "list",
      text: "Here are our signature salon services:",
      items: [
        "Haircut",
        "Beard trim",
        "Haircut + beard",
        "Hair color",
        "Facial",
        "Kids haircut",
      ],
      iconName: "services",
    },
    location: {
      id: "location",
      title: "Reply: Location Info",
      type: "message",
      text: "We are located at:\n📍 123 Beauty Lane, Salon Suite 100, New York, NY 10001\n\nWe look forward to seeing you!",
      iconName: "location",
    },
  });

  // 2. State variables for popups and path tracking
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<
    "booking" | "services" | "location" | null
  >(null);
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);

  // Temp editing states (used inside modal popup)
  const [tempText, setTempText] = useState("");
  const [tempLink, setTempLink] = useState("");
  const [tempOptions, setTempOptions] = useState<
    { id: string; text: string; targetNodeId: string }[]
  >([]);
  const [tempItems, setTempItems] = useState<string[]>([]);
  const [newItemText, setNewItemText] = useState("");

  // 3. WhatsApp Chat Simulation Engine States
  const msgCounterRef = useRef(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: "msg-init",
      sender: "user",
      text: "Hi Salon",
      time: "10:00 AM",
    },
    {
      id: "msg-greeting",
      sender: "bot",
      text: "Hello! Welcome to Bookly Salon assistant. 🤖\n\nWhat would you like to do today? Please choose an option below:",
      time: "10:00 AM",
      type: "options",
      options: ["Book appointment", "View services", "Location"],
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedSimOption, setSelectedSimOption] = useState<string | null>(
    null,
  );
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize and Reset WhatsApp Simulation
  const handleResetSimulation = () => {
    setSelectedSimOption(null);
    setIsTyping(false);
    setActivePath(null);
    msgCounterRef.current = 0;
    setChatMessages([
      {
        id: "msg-init",
        sender: "user",
        text: nodes.trigger.text,
        time: "10:00 AM",
      },
      {
        id: "msg-greeting",
        sender: "bot",
        text: nodes.greeting.text,
        time: "10:00 AM",
        type: "options",
        options: nodes.greeting.options?.map((o) => o.text) || [],
      },
    ]);
  };

  // Keep chat scrolled to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  // Handle simulation option button click inside phone mockup
  const handleSimOptionClick = (optionText: string, targetId: string) => {
    if (isTyping || selectedSimOption) return;

    setSelectedSimOption(optionText);
    setActivePath(targetId as "booking" | "services" | "location" | null);

    // 1. Add user reply message
    msgCounterRef.current += 1;
    const userMsg: ChatMessage = {
      id: `user-${msgCounterRef.current}`,
      sender: "user",
      text: optionText,
      time: "10:01 AM",
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // 2. Simulate bot typing delay (900ms)
    setTimeout(() => {
      setIsTyping(false);
      msgCounterRef.current += 1;

      let botMsg: ChatMessage;

      if (targetId === "booking") {
        botMsg = {
          id: `bot-booking-${msgCounterRef.current}`,
          sender: "bot",
          text: nodes.booking.text,
          time: "10:02 AM",
          type: "link",
          linkUrl: nodes.booking.link,
        };
      } else if (targetId === "services") {
        botMsg = {
          id: `bot-services-${msgCounterRef.current}`,
          sender: "bot",
          text: nodes.services.text,
          time: "10:02 AM",
          type: "list",
          listItems: nodes.services.items || [],
        };
      } else {
        botMsg = {
          id: `bot-location-${msgCounterRef.current}`,
          sender: "bot",
          text: nodes.location.text,
          time: "10:02 AM",
          type: "text",
        };
      }

      setChatMessages((prev) => [...prev, botMsg]);
    }, 900);
  };

  // Helper back button to return to greeting list in phone mockup
  const handleBackToMenu = () => {
    setSelectedSimOption(null);
    setActivePath(null);
    setIsTyping(false);
    setChatMessages([
      {
        id: "msg-init",
        sender: "user",
        text: nodes.trigger.text,
        time: "10:00 AM",
      },
      {
        id: "msg-greeting",
        sender: "bot",
        text: nodes.greeting.text,
        time: "10:00 AM",
        type: "options",
        options: nodes.greeting.options?.map((o) => o.text) || [],
      },
    ]);
  };

  // 4. Node editing modal functions
  const openEditModal = (nodeId: string) => {
    const node = nodes[nodeId];
    setEditingNodeId(nodeId);
    setTempText(node.text);
    setTempLink(node.link || "");
    setTempOptions(node.options ? [...node.options] : []);
    setTempItems(node.items ? [...node.items] : []);
    setNewItemText("");
  };

  const handleSaveNodeChanges = () => {
    if (!editingNodeId) return;

    setNodes((prev) => {
      const updatedNodes = {
        ...prev,
        [editingNodeId]: {
          ...prev[editingNodeId],
          text: tempText,
          link: tempLink || undefined,
          options: tempOptions.length > 0 ? tempOptions : undefined,
          items: tempItems.length > 0 ? tempItems : undefined,
        },
      };

      // Reset simulation with the updated nodes directly inside the event handler
      setSelectedSimOption(null);
      setIsTyping(false);
      setActivePath(null);
      setChatMessages([
        {
          id: "msg-init",
          sender: "user",
          text: updatedNodes.trigger.text,
          time: "10:00 AM",
        },
        {
          id: "msg-greeting",
          sender: "bot",
          text: updatedNodes.greeting.text,
          time: "10:00 AM",
          type: "options",
          options: updatedNodes.greeting.options?.map((o) => o.text) || [],
        },
      ]);

      return updatedNodes;
    });

    setEditingNodeId(null);
  };

  // Helper render for Node Icons
  const getNodeIcon = (iconName: string, className: string = "size-4") => {
    switch (iconName) {
      case "trigger":
        return <Zap className={`${className} text-indigo-500`} />;
      case "message":
        return <MessageSquare className={`${className} text-emerald-500`} />;
      case "link":
        return <Calendar className={`${className} text-rose-500`} />;
      case "services":
        return <Scissors className={`${className} text-cyan-500`} />;
      case "location":
        return <MapPin className={`${className} text-purple-500`} />;
      default:
        return <MessageSquare className={className} />;
    }
  };

  return (
    <main className="w-full flex flex-col mt-2 text-slate-800 pb-6">
      {/* Custom Styles Injection */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .active-path-glow {
          stroke: #10b981 !important;
          stroke-width: 3.5px !important;
        }
        .whatsapp-wallpaper-solid {
          background-color: #eae6df;
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .typing-dot {
          animation: pulseDot 1.4s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
      `,
        }}
      />

      {/* Title & Toolbar section */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Flow Builder
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Customize and test client conversation flows that run automatically
            on WhatsApp.
          </p>
        </div>

        <button
          onClick={handleResetSimulation}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-750 shadow-sm transition hover:bg-slate-50 hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          Reset Simulation
        </button>
      </div>

      {/* Main Flex Layout (Stretches to fill available viewport height) */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch flex-1 min-h-0 pb-4">
        {/* Left Column: Visual Flowchart Canvas Card */}
        <div className="flex-1 flex flex-col rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur h-[580px] xl:h-[650px] min-h-0">
          <div className="border-b border-slate-100 pb-4 mb-4 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Conversation Flow Chart
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Click a node&apos;s edit icon to configure details. Click
                options in greeting to test simulator.
              </p>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-3 font-medium select-none">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-slate-200 border border-slate-300 inline-block"></span>
                Inactive Path
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500 inline-block"></span>
                Active Flow
              </span>
            </div>
          </div>

          <div className="flex-1 w-full overflow-auto scrollbar bg-slate-50/50 rounded-2xl border border-slate-200/80 relative min-h-0 p-4">
            {/* Whiteboard Board - dynamically stretches, but sets a min-width matching the nodes to prevent overlap */}
            <div className="w-full min-w-[630px] h-[580px] relative bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:20px_20px] bg-white select-none shrink-0 rounded-2xl border border-slate-200/50 shadow-[inset_0_2px_8px_rgba(15,23,42,0.02)]">
              {/* SVG Connector Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#cbd5e1" />
                  </marker>
                  <marker
                    id="arrow-active"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
                  </marker>
                </defs>

                {/* 1. Trigger Output (140, 130) -> Greeting Input (140, 160) - Straight down line */}
                <path
                  d="M 140 130 L 140 160"
                  fill="none"
                  className="stroke-slate-200 transition-all duration-300"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  markerEnd="url(#arrow)"
                />

                {/* 2. Option 1 (260, 315) -> Booking Response Input (340, 97) */}
                <path
                  d="M 260 315 C 305 315, 305 97, 340 97"
                  fill="none"
                  className={`stroke-slate-200 transition-all duration-300 ${
                    activePath === "booking" || hoveredOptionId === "opt-1"
                      ? "active-path-glow"
                      : ""
                  }`}
                  strokeWidth="2"
                  markerEnd={
                    activePath === "booking" || hoveredOptionId === "opt-1"
                      ? "url(#arrow-active)"
                      : "url(#arrow)"
                  }
                />

                {/* 3. Option 2 (260, 365) -> Services Response Input (340, 300) */}
                <path
                  d="M 260 365 C 305 365, 305 300, 340 300"
                  fill="none"
                  className={`stroke-slate-200 transition-all duration-300 ${
                    activePath === "services" || hoveredOptionId === "opt-2"
                      ? "active-path-glow"
                      : ""
                  }`}
                  strokeWidth="2"
                  markerEnd={
                    activePath === "services" || hoveredOptionId === "opt-2"
                      ? "url(#arrow-active)"
                      : "url(#arrow)"
                  }
                />

                {/* 4. Option 3 (260, 415) -> Location Response Input (340, 492) */}
                <path
                  d="M 260 415 C 305 415, 305 492, 340 492"
                  fill="none"
                  className={`stroke-slate-200 transition-all duration-300 ${
                    activePath === "location" || hoveredOptionId === "opt-3"
                      ? "active-path-glow"
                      : ""
                  }`}
                  strokeWidth="2"
                  markerEnd={
                    activePath === "location" || hoveredOptionId === "opt-3"
                      ? "url(#arrow-active)"
                      : "url(#arrow)"
                  }
                />
              </svg>

              {/* COLUMN 1: CONTROLS & MAIN FLOW */}

              {/* CARD 1: TRIGGER NODE */}
              <div className="absolute left-[20px] top-[15px] w-[240px] bg-white/95 border border-slate-200 rounded-2xl p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:border-slate-350 hover:shadow-[0_8px_25px_rgba(15,23,42,0.08)] transition duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 rounded-lg bg-indigo-50 flex items-center justify-center">
                      {getNodeIcon(nodes.trigger.iconName, "size-4")}
                    </span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Trigger
                    </span>
                  </div>
                  <button
                    onClick={() => openEditModal("trigger")}
                    className="p-1.5 text-slate-400 hover:text-slate-900 transition rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200"
                  >
                    <Edit className="size-3.5" />
                  </button>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 select-none">
                  When client sends:
                </p>
                <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200/60 text-sm font-semibold text-slate-700 italic shadow-inner">
                  &quot;{nodes.trigger.text}&quot;
                </div>

                {/* Connection output point (Bottom Center) */}
                <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 size-2.5 bg-slate-300 border border-white rounded-full shadow-sm"></div>
              </div>

              {/* CARD 2: GREETING & MENU NODE */}
              <div className="absolute left-[20px] top-[160px] w-[240px] h-[395px] bg-white/95 border border-slate-200 rounded-2xl p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:border-slate-350 hover:shadow-[0_8px_25px_rgba(15,23,42,0.08)] transition duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-lg bg-emerald-50 flex items-center justify-center">
                        {getNodeIcon(nodes.greeting.iconName, "size-4")}
                      </span>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Greeting Menu
                      </span>
                    </div>
                    <button
                      onClick={() => openEditModal("greeting")}
                      className="p-1.5 text-slate-400 hover:text-slate-900 transition rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      <Edit className="size-3.5" />
                    </button>
                  </div>

                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 select-none">
                    Greeting message:
                  </p>
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200/60 text-sm font-medium text-slate-655 leading-relaxed max-h-[105px] overflow-y-auto mb-3 scrollbar shadow-inner">
                    {nodes.greeting.text}
                  </div>
                </div>

                <div className="space-y-2 mt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1 select-none">
                    Interactive options (Click to test)
                  </span>
                  {nodes.greeting.options?.map((opt) => (
                    <div
                      key={opt.id}
                      onMouseEnter={() => setHoveredOptionId(opt.id)}
                      onMouseLeave={() => setHoveredOptionId(null)}
                      onClick={() =>
                        handleSimOptionClick(opt.text, opt.targetNodeId)
                      }
                      className={`group/opt w-full flex items-center justify-between bg-white border border-slate-200/80 hover:border-emerald-500 hover:bg-emerald-50/5 rounded-xl px-3 py-2 text-xs text-slate-700 transition duration-200 cursor-pointer shadow-sm ${
                        activePath === opt.targetNodeId ||
                        hoveredOptionId === opt.id
                          ? "border-emerald-400 bg-emerald-50/30 text-emerald-800 ring-1 ring-emerald-500/20"
                          : ""
                      }`}
                      title={`Click to test '${opt.text}' in simulator`}
                    >
                      <span className="font-semibold text-xs">{opt.text}</span>
                      <ArrowRight className="size-3.5 text-slate-400 group-hover/opt:translate-x-0.5 transition" />
                    </div>
                  ))}
                </div>

                {/* Connection points (Top Center input, Right Edge outputs) */}
                <div className="absolute top-[-5px] left-1/2 -translate-x-1/2 size-2.5 bg-slate-350 border border-white rounded-full shadow-sm"></div>

                <div className="absolute right-[-5px] top-0 bottom-0 pointer-events-none w-2.5">
                  <div
                    style={{ top: "155px" }}
                    className={`absolute right-0 size-2.5 border border-white rounded-full shadow-sm ${activePath === "booking" || hoveredOptionId === "opt-1" ? "bg-emerald-500" : "bg-slate-300"}`}
                  ></div>
                  <div
                    style={{ top: "205px" }}
                    className={`absolute right-0 size-2.5 border border-white rounded-full shadow-sm ${activePath === "services" || hoveredOptionId === "opt-2" ? "bg-emerald-500" : "bg-slate-300"}`}
                  ></div>
                  <div
                    style={{ top: "255px" }}
                    className={`absolute right-0 size-2.5 border border-white rounded-full shadow-sm ${activePath === "location" || hoveredOptionId === "opt-3" ? "bg-emerald-500" : "bg-slate-300"}`}
                  ></div>
                </div>
              </div>

              {/* COLUMN 2: THREE LEAF ACTION NODES */}

              {/* CARD 3A: BOOKING URL RESPONSE */}
              <div
                className={`absolute left-[350px] top-[15px] w-[260px] h-[155px] bg-white/95 border border-slate-200 rounded-2xl p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:border-slate-350 hover:shadow-[0_8px_25px_rgba(15,23,42,0.08)] transition duration-200 flex flex-col justify-between ${
                  activePath === "booking" || hoveredOptionId === "opt-1"
                    ? "border-emerald-500 shadow-[0_8px_30px_rgba(16,185,129,0.06)] scale-[1.01]"
                    : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-lg bg-rose-50 flex items-center justify-center">
                        {getNodeIcon(nodes.booking.iconName, "size-4")}
                      </span>
                      <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        Reply: Booking Link
                      </span>
                    </div>
                    <button
                      onClick={() => openEditModal("booking")}
                      className="p-1.5 text-slate-400 hover:text-slate-900 transition rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      <Edit className="size-3.5" />
                    </button>
                  </div>

                  <div className="text-sm text-slate-600 leading-relaxed max-h-[55px] overflow-y-auto scrollbar">
                    {nodes.booking.text}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs bg-rose-50/55 border border-rose-100 text-rose-700 font-bold px-2.5 py-1.5 rounded-xl truncate mt-1">
                  <ExternalLink className="size-3.5 shrink-0" />
                  {nodes.booking.link}
                </div>

                {/* Connection input point */}
                <div
                  className={`absolute left-[-5px] top-[82px] size-2.5 border border-white rounded-full shadow-sm ${
                    activePath === "booking" || hoveredOptionId === "opt-1"
                      ? "bg-emerald-500"
                      : "bg-slate-300"
                  }`}
                ></div>
              </div>

              {/* CARD 3B: SERVICES CATALOG RESPONSE */}
              <div
                className={`absolute left-[350px] top-[190px] w-[260px] h-[210px] bg-white/95 border border-slate-200 rounded-2xl p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:border-slate-350 hover:shadow-[0_8px_25px_rgba(15,23,42,0.08)] transition duration-200 flex flex-col justify-between ${
                  activePath === "services" || hoveredOptionId === "opt-2"
                    ? "border-emerald-500 shadow-[0_8px_30px_rgba(16,185,129,0.06)] scale-[1.01]"
                    : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-lg bg-cyan-50 flex items-center justify-center">
                        {getNodeIcon(nodes.services.iconName, "size-4")}
                      </span>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Reply: Services Catalog
                      </span>
                    </div>
                    <button
                      onClick={() => openEditModal("services")}
                      className="p-1.5 text-slate-400 hover:text-slate-900 transition rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      <Edit className="size-3.5" />
                    </button>
                  </div>

                  <div className="text-sm text-slate-655 leading-relaxed max-h-[50px] overflow-y-auto scrollbar mb-2">
                    {nodes.services.text}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-[75px] overflow-y-auto scrollbar pr-1">
                  {nodes.services.items?.map((service, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-55 border border-slate-200/60 text-xs font-semibold text-slate-600 px-2 py-1.5 rounded-xl truncate flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                      {service}
                    </div>
                  ))}
                </div>

                {/* Connection input point */}
                <div
                  className={`absolute left-[-5px] top-[105px] size-2.5 border border-white rounded-full shadow-sm ${
                    activePath === "services" || hoveredOptionId === "opt-2"
                      ? "bg-emerald-500"
                      : "bg-slate-300"
                  }`}
                ></div>
              </div>

              {/* CARD 3C: LOCATION DETAILS RESPONSE */}
              <div
                className={`absolute left-[350px] top-[420px] w-[260px] h-[145px] bg-white/95 border border-slate-200 rounded-2xl p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:border-slate-350 hover:shadow-[0_8px_25px_rgba(15,23,42,0.08)] transition duration-200 flex flex-col justify-between ${
                  activePath === "location" || hoveredOptionId === "opt-3"
                    ? "border-emerald-500 shadow-[0_8px_30px_rgba(16,185,129,0.06)] scale-[1.01]"
                    : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-lg bg-purple-50 flex items-center justify-center">
                        {getNodeIcon(nodes.location.iconName, "size-4")}
                      </span>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Reply: Location Address
                      </span>
                    </div>
                    <button
                      onClick={() => openEditModal("location")}
                      className="p-1.5 text-slate-400 hover:text-slate-900 transition rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      <Edit className="size-3.5" />
                    </button>
                  </div>

                  <div className="text-sm text-slate-600 leading-relaxed max-h-[70px] overflow-y-auto scrollbar whitespace-pre-line">
                    {nodes.location.text}
                  </div>
                </div>

                {/* Connection input point */}
                <div
                  className={`absolute left-[-5px] top-[72px] size-2.5 border border-white rounded-full shadow-sm ${
                    activePath === "location" || hoveredOptionId === "opt-3"
                      ? "bg-emerald-500"
                      : "bg-slate-300"
                  }`}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: WhatsApp Simulator Card */}
        <div className="w-full xl:w-[280px] shrink-0 flex flex-col rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur h-[550px] xl:h-[650px] min-h-0">
          <div className="border-b border-slate-100 pb-4 mb-4 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Simulator
              </h2>
              <p className="text-xs text-slate-550 mt-1">
                Test client conversation routes.
              </p>
            </div>

            <button
              onClick={handleResetSimulation}
              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition rounded-lg cursor-pointer border border-slate-200"
              title="Restart Simulator"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>
          {/* Smartphone Chassis Container (No scrollbar outside phone chassis) */}
          <div className="flex-1 flex items-center justify-center p-1 bg-slate-50/50 rounded-2xl select-none overflow-hidden min-h-0">
            {/* Phone Body Mockup - Compact (235px width x 470px height) */}
            <div className="relative w-[235px] h-[470px] rounded-[45px] border-[5px] border-slate-900 bg-slate-950 flex flex-col shrink-0 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)]">
              {/* Phone Lock Button Decor */}
              <div className="absolute right-[-6px] top-20 w-[3px] h-10 bg-slate-900 rounded-r-md z-0" />
              {/* Phone Volume Buttons Decor */}
              <div className="absolute left-[-6px] top-16 w-[3px] h-8 bg-slate-900 rounded-l-md z-0" />
              <div className="absolute left-[-6px] top-26 w-[3px] h-8 bg-slate-900 rounded-l-md z-0" />

              {/* Screen Content Wrapper (handles overflow clipping and border-radius matching phone shape) */}
              <div className="w-full h-full rounded-[42px] overflow-hidden flex flex-col relative z-10">
                {/* Camera Punch Hole - Centered Dynamic Island Decor */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-4 bg-black rounded-full z-50 flex items-center justify-end px-2">
                  <span className="size-1.5 bg-[#1a1a1a] rounded-full"></span>
                </div>

                {/* High-Fidelity Phone Status Bar */}
                <div className="bg-[#008069] text-white pt-2.5 pb-1 h-7 px-4 flex items-center justify-between text-[11px] font-semibold z-40 select-none relative">
                  <span className="w-10 text-left">10:10</span>
                  <div className="w-10 flex items-center justify-end gap-1">
                    <Wifi className="size-2.5" />
                    <div className="flex items-center gap-0.5">
                      <Battery className="size-3 fill-white" />
                    </div>
                  </div>
                </div>

                {/* WhatsApp App Profile Bar */}
                <div className="bg-[#008069] text-white pb-2.5 pt-0.5 px-2 flex items-center justify-between z-35 shadow-sm">
                  <div className="flex items-center gap-1">
                    <ChevronLeft className="size-4 text-white cursor-pointer hover:bg-emerald-800 rounded-full" />
                    <div className="relative">
                      <div className="size-6.5 rounded-full bg-[#128c7e] text-white flex items-center justify-center font-bold text-[11px] shadow-sm border border-emerald-400/20">
                        BS
                      </div>
                      <div className="absolute bottom-0 right-0 size-1 rounded-full bg-emerald-400 border-[1px] border-[#008069]"></div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold leading-tight tracking-wide">
                        Bookly Salon
                      </h4>
                      <span className="text-[10px] text-emerald-255 block leading-none">
                        {isTyping ? "typing..." : "online"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <Video className="size-3 cursor-pointer hover:text-white" />
                    <Phone className="size-2.5 cursor-pointer hover:text-white" />
                    <MoreVertical className="size-3 cursor-pointer hover:text-white" />
                  </div>
                </div>

                {/* Chat Area Scroll Wrapper (Solid background) */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 whatsapp-wallpaper-solid p-2 overflow-y-auto space-y-2.5 flex flex-col scrollbar z-10"
                >
                  {chatMessages.map((msg) => {
                    const isBot = msg.sender === "bot";
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] animate-fade-in ${
                          isBot
                            ? "self-start items-start"
                            : "self-end items-end"
                        }`}
                      >
                        {/* Message bubble wrapper */}
                        <div
                          className={`rounded-xl px-2.5 py-1.5 text-xs shadow-[0_1px_1.5px_rgba(0,0,0,0.1)] relative ${
                            isBot
                              ? "bg-white text-slate-800 rounded-tl-none border-l-[1.5px] border-emerald-500"
                              : "bg-[#e2f9c3] text-slate-800 rounded-tr-none"
                          }`}
                        >
                          {/* WhatsApp speech bubble tail */}
                          <div
                            className={`absolute top-0 size-1.5 ${
                              isBot
                                ? "left-[-3px] bg-white border-l-[1.5px] border-emerald-500 rounded-bl-full"
                                : "right-[-3px] bg-[#e2f9c3] rounded-br-full"
                            }`}
                            style={{
                              clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                              transform: isBot ? "scaleX(-1)" : "none",
                            }}
                          ></div>

                          <p className="whitespace-pre-line leading-normal font-medium text-xs text-slate-750">
                            {msg.text}
                          </p>

                          {/* Displaying Service items list */}
                          {isBot && msg.type === "list" && msg.listItems && (
                            <div className="mt-2 space-y-1 border-t border-slate-100 pt-1.5 select-none">
                              {msg.listItems.map((item, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded-md text-slate-600 font-semibold text-[11px]"
                                >
                                  <span className="size-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                  {item}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Displaying Booking Link */}
                          {isBot && msg.type === "link" && msg.linkUrl && (
                            <div className="mt-1.5 select-none">
                              <a
                                href={msg.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 transition rounded-lg text-[11px] font-bold shadow-sm"
                              >
                                <ExternalLink className="size-2.5" />
                                {msg.linkUrl.replace("http://", "")}
                              </a>
                            </div>
                          )}

                          {/* Message metadata details */}
                          <div className="flex justify-end items-center gap-1 mt-0.5 text-[8.5px] text-slate-400 font-bold select-none">
                            <span>{msg.time}</span>
                            {!isBot && (
                              <CheckCheck className="size-2 text-[#34b7f1]" />
                            )}
                          </div>
                        </div>

                        {/* Rendering Options Selection Buttons (WhatsApp Message Template) */}
                        {isBot && msg.type === "options" && msg.options && (
                          <div className="flex flex-col gap-1.5 mt-2 w-full select-none max-w-[190px]">
                            {nodes.greeting.options?.map((opt) => (
                              <button
                                key={opt.id}
                                disabled={selectedSimOption !== null}
                                onClick={() =>
                                  handleSimOptionClick(
                                    opt.text,
                                    opt.targetNodeId,
                                  )
                                }
                                className={`w-full text-xs font-semibold text-center py-1.5 px-2.5 rounded-xl shadow-sm border transition duration-205 active:scale-97 text-[#008069] bg-white border-slate-100 hover:bg-slate-50 cursor-pointer ${
                                  selectedSimOption === opt.text
                                    ? "bg-emerald-50 border-emerald-350 text-emerald-700 font-bold shadow-inner"
                                    : selectedSimOption !== null
                                      ? "opacity-60 saturate-50"
                                      : ""
                                }`}
                              >
                                {opt.text}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Bot Typing Bubble */}
                  {isTyping && (
                    <div className="flex flex-col max-w-[80%] self-start items-start">
                      <div className="rounded-xl px-2.5 py-1.5 bg-white shadow-sm rounded-tl-none border-l-[1.5px] border-emerald-500 relative flex items-center gap-1">
                        <span className="size-1 rounded-full bg-slate-400 typing-dot"></span>
                        <span className="size-1 rounded-full bg-slate-400 typing-dot"></span>
                        <span className="size-1 rounded-full bg-slate-400 typing-dot"></span>
                      </div>
                    </div>
                  )}

                  {/* UX IMPROVEMENT: Conversation Loop */}
                  {selectedSimOption && !isTyping && (
                    <button
                      onClick={handleBackToMenu}
                      className="self-center mt-2.5 text-[10.5px] font-bold text-[#008069] bg-white border border-emerald-100 hover:bg-emerald-55 py-1 px-3 rounded-full shadow-sm cursor-pointer transition active:scale-95 flex items-center gap-1"
                    >
                      <Undo2 className="size-3" /> Back to Main Menu
                    </button>
                  )}
                </div>

                {/* Bottom Keyboard Bar Placeholder */}
                <div className="bg-[#f0f2f5] p-1.5 pb-3.5 flex items-center gap-1.5 border-t border-slate-200 z-20 select-none">
                  <div className="flex items-center gap-1 text-slate-400 px-0.5">
                    <Smile className="size-4 cursor-pointer hover:text-slate-650" />
                    <Paperclip className="size-3.5 cursor-pointer hover:text-slate-655 rotate-45" />
                  </div>

                  <div className="flex-1 bg-white rounded-full px-2.5 py-1 border border-slate-200 text-[11px] text-slate-400 select-none">
                    Click above
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 px-0.5">
                    <Camera className="size-4 cursor-pointer hover:text-slate-650" />
                    <div className="size-5 rounded-full bg-[#008069] text-white flex items-center justify-center shadow-sm">
                      <Mic className="size-2.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MODAL EDITOR */}
      {editingNodeId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-[0_20px_50px_rgba(15,23,42,0.3)] text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-3.5">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-slate-100 flex items-center justify-center">
                  {getNodeIcon(nodes[editingNodeId].iconName, "size-4")}
                </span>
                <h3 className="text-lg font-semibold text-slate-900">
                  Edit Node Details
                </h3>
              </div>
              <button
                onClick={() => setEditingNodeId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 transition rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 scrollbar mb-4">
              {/* Field 1: Message Text */}
              <div>
                <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block mb-1.5 select-none">
                  {nodes[editingNodeId].type === "trigger"
                    ? "Trigger keyword text"
                    : "Bot response text"}
                </label>
                <textarea
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-755 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200 leading-relaxed resize-none h-24 scrollbar"
                />
              </div>

              {/* Field 2: Booking Redirect URL */}
              {nodes[editingNodeId].type === "message" &&
                nodes[editingNodeId].id === "booking" && (
                  <div>
                    <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block mb-1.5 select-none">
                      Website booking link URL
                    </label>
                    <input
                      type="text"
                      value={tempLink}
                      onChange={(e) => setTempLink(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-750 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                      placeholder="http://localhost:3000/book"
                    />
                  </div>
                )}

              {/* Field 3: Edit Buttons/Options titles */}
              {nodes[editingNodeId].type === "options_menu" && (
                <div className="space-y-3.5">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block select-none">
                    Menu button titles
                  </label>
                  <div className="space-y-2">
                    {tempOptions.map((opt, idx) => (
                      <div
                        key={opt.id}
                        className="flex flex-col gap-1 bg-slate-50/50 p-2.5 border border-slate-200/80 rounded-xl"
                      >
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none px-1">
                          Option {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const updated = [...tempOptions];
                            updated[idx].text = e.target.value;
                            setTempOptions(updated);
                          }}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-750 outline-none focus:border-slate-450 focus:ring-2 focus:ring-slate-150 transition"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Field 4: Edit Services List Catalog */}
              {nodes[editingNodeId].type === "list" && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block select-none">
                    Configure catalog services
                  </label>

                  {/* Service Add Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add new service..."
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm font-medium text-slate-750 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newItemText.trim() !== "") {
                          e.preventDefault();
                          setTempItems([...tempItems, newItemText.trim()]);
                          setNewItemText("");
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newItemText.trim() !== "") {
                          setTempItems([...tempItems, newItemText.trim()]);
                          setNewItemText("");
                        }
                      }}
                      type="button"
                      className="px-4.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition hover:scale-[1.02] active:scale-95 cursor-pointer shadow-md shadow-slate-900/10"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  {/* List of items */}
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto scrollbar pr-1">
                    {tempItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-50/70 px-3 py-2 border border-slate-200/80 rounded-xl text-sm transition duration-150 hover:bg-white hover:border-slate-350"
                      >
                        <span className="font-semibold text-slate-755 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                          {item}
                        </span>
                        <button
                          onClick={() => {
                            const updated = tempItems.filter(
                              (_, i) => i !== idx,
                            );
                            setTempItems(updated);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 transition hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Delete Service"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3.5">
              <button
                onClick={() => setEditingNodeId(null)}
                className="px-3.5 py-2 text-sm font-semibold text-slate-550 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNodeChanges}
                className="px-4.5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition rounded-xl shadow-md shadow-slate-900/10 hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
