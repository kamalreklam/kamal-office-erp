"use client";

import { AssistantChat } from "@/components/assistant-chat";

export default function AssistantPage() {
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-6 h-[calc(100vh-3.5rem)]">
      <AssistantChat height="100%" />
    </div>
  );
}
