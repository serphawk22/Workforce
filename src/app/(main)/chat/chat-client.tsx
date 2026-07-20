"use client";

import { useSession } from "next-auth/react";
import { ChatProvider } from "@/components/chat/chat-provider";
import { ChannelSidebar } from "@/components/chat/channel-sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { RightPanel } from "@/components/chat/right-panel";

export function ChatClient() {
  const { data: session } = useSession();
  const userId = session?.user?.id || "";
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";

  return (
    <ChatProvider userId={userId} userName={userName} userEmail={userEmail}>
      <div className="flex h-full">
        <ChannelSidebar />
        <ChatArea />
        <RightPanel />
      </div>
    </ChatProvider>
  );
}
