// --- WHY THIS CODE EXISTS ---
// Page shell for /chat route.
// Thin wrapper — all logic lives in ChatLayout.jsx.
// Sets metadata for SEO and renders the chat layout inside the page scroll container.

// --- WHAT THIS MADE WORK ---
// /chat route renders ChatLayout which contains the full chat UI
// Metadata set for SEO — title + description + noindex (chat is private/dynamic)

// --- PITFALLS ---
// ⚠️ This page must fill the full available height — uses h-full
// ⚠️ Do NOT add any logic here — page files are shells only
// ⚠️ noindex is correct — chat content should not be indexed by Google
// ⚠️ import ChatLayout with 'use client' inside — this page stays a server component

// --- CHANGE LOG ---
// [May 23, 2026] CREATED: Phase 12 Chat — /chat page shell
// --- END CHANGE LOG ---

import ChatLayout from '@/components/chat/ChatLayout';
import './chat.css';

export const metadata = {
  title: 'Chat — The Real Medico Community',
  description: 'Chat with nurses, doctors, and healthcare students in real time.',
  robots: { index: false, follow: false },
};

export default function ChatPage() {
  return (
    <div className="chat-page-wrapper">
      <ChatLayout />
    </div>
  );
}
