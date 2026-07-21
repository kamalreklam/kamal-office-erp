"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

// Wraps the Web Speech API for Arabic voice dictation into notes-style text fields.
// Not available in all browsers — callers should hide/disable the mic button when
// isSupported() is false rather than assuming it always works.
export function useVoiceDictation(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  function isSupported() {
    return typeof window !== "undefined" && (("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window));
  }

  function toggleDictation() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      toast.info("تم إيقاف الإملاء الصوتي");
      return;
    }

    if (!isSupported()) {
      toast.error("متصفحك لا يدعم خاصية الإملاء الصوتي");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
      }
      if (finalTranscript) onTranscriptRef.current(finalTranscript);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        toast.error("حدث خطأ أثناء الإملاء الصوتي");
        setIsListening(false);
      }
    };

    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      toast.success("تحدث الآن باللغة العربية...");
    } catch {
      toast.error("تعذر تشغيل الميكروفون");
    }
  }

  return { isListening, toggleDictation, isSupported: isSupported() };
}
