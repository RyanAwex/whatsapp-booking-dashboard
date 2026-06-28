"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  MessageSquare,
  Calendar,
  Scissors,
  MapPin,
  ExternalLink,
  Edit,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  Play,
  X,
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

export default function FlowBuilderPage() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activePath, setActivePath] = useState<
    "booking" | "services" | "location" | null
  >(null);

  // Flow Nodes state
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
      link: "https://bookly.com/book",
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
      text: "We are located at:\n📍 123 Beauty Lane, Suite 100, New York, NY 10001\n\nWe look forward to seeing you!",
      iconName: "location",
    },
  });

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Inspector form states
  const [tempText, setTempText] = useState("");
  const [tempLink, setTempLink] = useState("");
  const [tempOptions, setTempOptions] = useState<
    { id: string; text: string; targetNodeId: string }[]
  >([]);
  const [tempItems, setTempItems] = useState<string[]>([]);
  const [newItemText, setNewItemText] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({
    triggerToGreeting: "",
    opt1ToBooking: "",
    opt2ToServices: "",
    opt3ToLocation: "",
  });

  const openInspector = (nodeId: string) => {
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

    setNodes((prev) => ({
      ...prev,
      [editingNodeId]: {
        ...prev[editingNodeId],
        text: tempText,
        link: tempLink || undefined,
        options: tempOptions.length > 0 ? tempOptions : undefined,
        items: tempItems.length > 0 ? tempItems : undefined,
      },
    }));

    setEditingNodeId(null);
  };

  const handleSaveFlow = () => {
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  // Helper to recalculate relative coordinates of sockets inside canvas
  const updateConnectorCoords = React.useCallback(() => {
    const getSocketCenter = (id: string) => {
      const el = document.getElementById(id);
      const canvasEl = canvasRef.current;
      if (!el || !canvasEl) return { x: 0, y: 0 };
      const elRect = el.getBoundingClientRect();
      const canvasRect = canvasEl.getBoundingClientRect();
      return {
        x: elRect.left - canvasRect.left + elRect.width / 2,
        y: elRect.top - canvasRect.top + elRect.height / 2,
      };
    };

    const triggerOut = getSocketCenter("socket-trigger-out");
    const greetingIn = getSocketCenter("socket-greeting-in");
    const opt1Out = getSocketCenter("socket-booking-out");
    const opt2Out = getSocketCenter("socket-services-out");
    const opt3Out = getSocketCenter("socket-location-out");
    const bookingIn = getSocketCenter("socket-booking-in");
    const servicesIn = getSocketCenter("socket-services-in");
    const locationIn = getSocketCenter("socket-location-in");

    setCoords({
      triggerToGreeting: `M ${triggerOut.x} ${triggerOut.y} L ${greetingIn.x} ${greetingIn.y}`,
      opt1ToBooking: `M ${opt1Out.x} ${opt1Out.y} C ${(opt1Out.x + bookingIn.x) / 2} ${opt1Out.y}, ${(opt1Out.x + bookingIn.x) / 2} ${bookingIn.y}, ${bookingIn.x} ${bookingIn.y}`,
      opt2ToServices: `M ${opt2Out.x} ${opt2Out.y} C ${(opt2Out.x + servicesIn.x) / 2} ${opt2Out.y}, ${(opt2Out.x + servicesIn.x) / 2} ${servicesIn.y}, ${servicesIn.x} ${servicesIn.y}`,
      opt3ToLocation: `M ${opt3Out.x} ${opt3Out.y} C ${(opt3Out.x + locationIn.x) / 2} ${opt3Out.y}, ${(opt3Out.x + locationIn.x) / 2} ${locationIn.y}, ${locationIn.x} ${locationIn.y}`,
    });
  }, []);

  // Update whenever nodes or resize occurs
  useEffect(() => {
    updateConnectorCoords();
    window.addEventListener("resize", updateConnectorCoords);
    const t = setTimeout(updateConnectorCoords, 150);
    return () => {
      window.removeEventListener("resize", updateConnectorCoords);
      clearTimeout(t);
    };
  }, [nodes, editingNodeId, updateConnectorCoords]);

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
    <div className="h-[calc(100vh-140px)] flex flex-col font-sans text-slate-800">
      {/* CSS Dotted Grid Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .dotted-bg {
          background-image: radial-gradient(#cbd5e1 1.2px, transparent 0);
          background-size: 16px 16px;
        }
      `,
        }}
      />

      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0 mb-4 select-none">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Flow Builder
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Map out customer automated reply paths for WhatsApp incoming
            messages.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold shadow-sm">
            <span className="size-2 bg-emerald-500 rounded-full animate-pulse" />
            Live
          </span>

          <button
            onClick={handleSaveFlow}
            className="flex items-center gap-2 rounded-xl bg-[#0f294a] px-4.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-[#0f294a]/10 hover:bg-slate-800 transition active:scale-95 cursor-pointer"
          >
            <Save className="size-4" /> Save Flow
          </button>
        </div>
      </div>

      {/* Save Success Alert Banner */}
      {saveSuccess && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200/60 p-3.5 text-emerald-850 flex items-center gap-2.5 text-xs sm:text-sm font-semibold shadow-sm animate-in fade-in slide-in-from-top-1 duration-200 shrink-0">
          <CheckCircle2 className="size-4.5 text-emerald-600" />
          <span>
            All flow builder changes successfully synchronized with the WhatsApp
            router!
          </span>
        </div>
      )}

      {/* Main Flow Editor Layout */}
      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden relative">
        {/* CENTER COLUMN: Responsive Canvas Workspace */}
        <div
          ref={canvasRef}
          id="flow-canvas-container"
          className="flex-1 border border-slate-200 bg-slate-50/50 rounded-3xl overflow-hidden relative flex flex-col shadow-inner h-full z-10"
        >
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/95 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-xs font-semibold text-slate-600 select-none">
            <span className="size-2 bg-indigo-500 rounded-full animate-ping" />
            Interactive Flow Canvas
          </div>

          {/* SVG CONNECTOR LINES */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full z-0">
            <path
              d={coords.triggerToGreeting}
              stroke="#6366f1"
              strokeWidth="2.5"
              fill="none"
            />
            <path
              d={coords.opt1ToBooking}
              stroke={activePath === "booking" ? "#10b981" : "#cbd5e1"}
              strokeWidth={activePath === "booking" ? "3" : "2"}
              fill="none"
              className="transition-all duration-300"
            />
            <path
              d={coords.opt2ToServices}
              stroke={activePath === "services" ? "#10b981" : "#cbd5e1"}
              strokeWidth={activePath === "services" ? "3" : "2"}
              fill="none"
              className="transition-all duration-300"
            />
            <path
              d={coords.opt3ToLocation}
              stroke={activePath === "location" ? "#10b981" : "#cbd5e1"}
              strokeWidth={activePath === "location" ? "3" : "2"}
              fill="none"
              className="transition-all duration-300"
            />
          </svg>

          {/* Dotted Grid Layout for Column Cards */}
          <div className="w-full h-full dotted-bg p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center z-10 overflow-y-auto md:overflow-hidden select-none">
            {/* COLUMN 1: Trigger Card */}
            <div className="flex justify-center items-center">
              <div
                className={`w-full max-w-[250px] bg-white rounded-2xl border p-4 flex flex-col justify-between shadow-sm transition hover:shadow-md cursor-pointer relative ${
                  editingNodeId === "trigger"
                    ? "border-indigo-500 ring-2 ring-indigo-100"
                    : "border-slate-200"
                }`}
                onClick={() => openInspector("trigger")}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    {getNodeIcon(nodes.trigger.iconName)}
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                      Trigger Message
                    </span>
                  </div>
                  <Edit className="size-3.5 text-slate-400" />
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-2">
                  Client texts:
                  <div className="mt-1 bg-slate-50 border border-slate-100 rounded-lg p-2 text-slate-800 font-extrabold truncate">
                    &quot;{nodes.trigger.text}&quot;
                  </div>
                </div>

                {/* Connection output point socket */}
                <div
                  id="socket-trigger-out"
                  className="absolute right-[-4px] top-1/2 -translate-y-1/2 size-2 bg-indigo-500 border border-white rounded-full shadow-sm"
                />
              </div>
            </div>

            {/* COLUMN 2: Greeting Router Card */}
            <div className="flex justify-center items-center">
              <div
                className={`w-full max-w-[260px] h-[320px] bg-white rounded-2xl border p-4 flex flex-col justify-between shadow-sm transition hover:shadow-md cursor-pointer relative ${
                  editingNodeId === "greeting"
                    ? "border-indigo-500 ring-2 ring-indigo-100"
                    : "border-slate-200"
                }`}
                onClick={() => openInspector("greeting")}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    {getNodeIcon(nodes.greeting.iconName)}
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                      Greeting & Menu
                    </span>
                  </div>
                  <Edit className="size-3.5 text-slate-400" />
                </div>

                <div className="text-[11px] text-slate-550 leading-relaxed line-clamp-4 mt-2">
                  {nodes.greeting.text}
                </div>

                {/* Interactive Menu Sockets */}
                <div className="space-y-2 mt-3 flex-1 flex flex-col justify-end">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                    Outgoing Paths
                  </span>

                  {nodes.greeting.options?.map((opt) => {
                    const isHovered = activePath === opt.targetNodeId;
                    const pathName = opt.targetNodeId as
                      | "booking"
                      | "services"
                      | "location";

                    return (
                      <div
                        key={opt.id}
                        onMouseEnter={() => setActivePath(pathName)}
                        onMouseLeave={() => setActivePath(null)}
                        className={`relative flex items-center justify-between p-2 rounded-xl border text-[11px] font-bold transition ${
                          isHovered
                            ? "border-emerald-500 bg-emerald-50/40 text-emerald-800"
                            : "border-slate-150 bg-slate-50 text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="truncate">{opt.text}</span>
                        <Play className="size-3 text-slate-400 shrink-0" />

                        {/* Connection Dot socket on Right */}
                        <div
                          id={`socket-${opt.targetNodeId}-out`}
                          className={`absolute right-[-20px] size-2 border border-white rounded-full shadow-sm z-10 transition-colors ${
                            isHovered ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                          style={{ top: "12px" }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Connection Input Point socket */}
                <div
                  id="socket-greeting-in"
                  className="absolute left-[-5px] top-1/2 -translate-y-1/2 size-2 bg-indigo-500 border border-white rounded-full shadow-sm"
                />
              </div>
            </div>

            {/* COLUMN 3: Outcome Action Cards Stack */}
            <div className="flex flex-col gap-4 justify-center h-full max-h-[580px]">
              {/* Card 3A: Booking outcome */}
              <div
                className={`w-full max-w-[250px] h-[140px] bg-white rounded-2xl border p-3 flex flex-col justify-between shadow-sm transition hover:shadow-md cursor-pointer relative mx-auto ${
                  editingNodeId === "booking"
                    ? "border-indigo-500 ring-2 ring-indigo-100"
                    : activePath === "booking"
                      ? "border-emerald-500 shadow-md shadow-emerald-50"
                      : "border-slate-200"
                }`}
                onClick={() => openInspector("booking")}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {getNodeIcon(nodes.booking.iconName)}
                      <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                        Reply: Booking Link
                      </span>
                    </div>
                    <Edit className="size-3.5 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-550 leading-normal line-clamp-3">
                    {nodes.booking.text}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] bg-rose-50 border border-rose-100 text-rose-700 font-bold px-2 py-1 rounded-lg truncate mt-1">
                  <ExternalLink className="size-3 shrink-0" />
                  {nodes.booking.link}
                </div>

                {/* Connection Input point socket */}
                <div
                  id="socket-booking-in"
                  className={`absolute left-[-5px] top-1/2 -translate-y-1/2 size-2 border border-white rounded-full shadow-sm transition-colors ${
                    activePath === "booking" ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
              </div>

              {/* Card 3B: Services Catalog outcome */}
              <div
                className={`w-full max-w-[250px] h-[210px] bg-white rounded-2xl border p-3.5 flex flex-col justify-between shadow-sm transition hover:shadow-md cursor-pointer relative mx-auto ${
                  editingNodeId === "services"
                    ? "border-indigo-500 ring-2 ring-indigo-100"
                    : activePath === "services"
                      ? "border-emerald-500 shadow-md shadow-emerald-50"
                      : "border-slate-200"
                }`}
                onClick={() => openInspector("services")}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {getNodeIcon(nodes.services.iconName)}
                      <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                        Reply: Services List
                      </span>
                    </div>
                    <Edit className="size-3.5 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-550 leading-normal line-clamp-2">
                    {nodes.services.text}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1 max-h-[85px] overflow-y-auto scrollbar pr-1">
                  {nodes.services.items?.map((service, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-150 text-[10px] font-semibold text-slate-600 px-2 py-1.5 rounded-lg truncate flex items-center gap-1"
                    >
                      <span className="w-1 h-1 rounded-full bg-cyan-400 shrink-0" />
                      {service}
                    </div>
                  ))}
                </div>

                {/* Connection Input point socket */}
                <div
                  id="socket-services-in"
                  className={`absolute left-[-5px] top-1/2 -translate-y-1/2 size-2 border border-white rounded-full shadow-sm transition-colors ${
                    activePath === "services"
                      ? "bg-emerald-500"
                      : "bg-slate-300"
                  }`}
                />
              </div>

              {/* Card 3C: Location outcome */}
              <div
                className={`w-full max-w-[250px] h-[140px] bg-white rounded-2xl border p-3 flex flex-col justify-between shadow-sm transition hover:shadow-md cursor-pointer relative mx-auto ${
                  editingNodeId === "location"
                    ? "border-indigo-500 ring-2 ring-indigo-100"
                    : activePath === "location"
                      ? "border-emerald-500 shadow-md shadow-emerald-50"
                      : "border-slate-200"
                }`}
                onClick={() => openInspector("location")}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {getNodeIcon(nodes.location.iconName)}
                      <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                        Reply: Location Details
                      </span>
                    </div>
                    <Edit className="size-3.5 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-550 leading-normal line-clamp-4 whitespace-pre-line">
                    {nodes.location.text}
                  </p>
                </div>

                {/* Connection Input point socket */}
                <div
                  id="socket-location-in"
                  className={`absolute left-[-5px] top-1/2 -translate-y-1/2 size-2 border border-white rounded-full shadow-sm transition-colors ${
                    activePath === "location"
                      ? "bg-emerald-500"
                      : "bg-slate-300"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE INSPECTOR DRAWER BACKDROP */}
        {editingNodeId && (
          <div
            onClick={() => setEditingNodeId(null)}
            className="xl:hidden fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 cursor-pointer"
          />
        )}

        {/* RIGHT COLUMN: Node Properties Inspector Panel (drawer on mobile/tablet, inline on desktop) */}
        <div
          className={`border border-slate-200 bg-white p-5 shadow-lg flex flex-col justify-between overflow-y-auto shrink-0 select-none transition-transform duration-300 z-50 xl:z-10
            fixed xl:relative top-[73px] xl:top-auto bottom-0 xl:bottom-auto right-0 xl:right-auto h-[calc(100vh-73px)] xl:h-full w-80 xl:rounded-3xl
            ${editingNodeId ? "translate-x-0" : "translate-x-full xl:translate-x-0 xl:relative xl:flex"}`}
        >
          {editingNodeId ? (
            <div className="flex-grow flex flex-col justify-between h-full min-h-0">
              <div className="flex-grow flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5 shrink-0">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Node Inspector
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Customize properties dynamically
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingNodeId(null)}
                    className="flex size-7 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="flex-grow flex flex-col min-h-0 space-y-4">
                  <div className="shrink-0">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">
                      Node Title
                    </label>
                    <input
                      type="text"
                      disabled
                      value={nodes[editingNodeId].title}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-400 select-none outline-none"
                    />
                  </div>

                  <div className="shrink-0">
                    <label className="text-[10px] font-bold text-slate-440 uppercase tracking-wider block mb-1.5">
                      WhatsApp Message Text
                    </label>
                    <textarea
                      value={tempText}
                      onChange={(e) => setTempText(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200 resize-none h-24 leading-relaxed scrollbar"
                    />
                  </div>

                  {editingNodeId === "booking" && (
                    <div className="shrink-0">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">
                        Redirect Link URL
                      </label>
                      <input
                        type="url"
                        value={tempLink}
                        onChange={(e) => setTempLink(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                      />
                    </div>
                  )}

                  {nodes[editingNodeId].type === "options_menu" && (
                    <div className="shrink-0 space-y-3">
                      <label className="text-[10px] font-bold text-slate-440 uppercase tracking-wider block">
                        Options Routing
                      </label>
                      <div className="space-y-2">
                        {tempOptions.map((opt, idx) => (
                          <div key={opt.id} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const copy = [...tempOptions];
                                copy[idx].text = e.target.value;
                                setTempOptions(copy);
                              }}
                              className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {nodes[editingNodeId].type === "list" && (
                    <div className="flex-grow flex flex-col min-h-0">
                      <label className="text-[10px] font-bold text-slate-440 uppercase tracking-wider block mb-1.5 shrink-0">
                        Service Items
                      </label>
                      <div className="flex-grow overflow-y-auto border border-slate-100 bg-slate-50/50 p-2.5 rounded-2xl space-y-1.5 scrollbar min-h-[140px]">
                        {tempItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-white border border-slate-150 px-2.5 py-1.5 rounded-xl shrink-0 shadow-sm"
                          >
                            <span className="text-xs font-bold text-slate-655 truncate">
                              {item}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setTempItems(
                                  tempItems.filter((_, i) => i !== idx),
                                )
                              }
                              className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4 shrink-0 flex flex-col gap-4">
                {/* Only render Add Service Item if editing list node */}
                {nodes[editingNodeId].type === "list" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-440 uppercase tracking-wider block">
                      Add Service Item
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add new service..."
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 focus:bg-white transition"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newItemText.trim()) {
                            setTempItems([...tempItems, newItemText.trim()]);
                            setNewItemText("");
                          }
                        }}
                        className="w-10 h-10 rounded-xl bg-[#0f294a] text-white hover:bg-slate-800 transition active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSaveNodeChanges}
                  className="w-full rounded-xl bg-[#0f294a] text-white py-2.5 text-xs font-bold transition hover:bg-slate-800 active:scale-95 cursor-pointer shadow-sm"
                >
                  Save Card Details
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col justify-center items-center text-center p-4 my-auto">
              <Edit className="size-8 text-slate-350 stroke-[1.5] mb-2" />
              <h4 className="font-bold text-slate-700 text-xs">
                No Selected Card
              </h4>
              <p className="text-[10px] text-slate-450 mt-1 max-w-[180px] leading-relaxed">
                Click the edit icon or click any card inside the interactive
                canvas to inspect and configure its settings.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
