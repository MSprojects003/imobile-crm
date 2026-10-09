"use client"

import { useEffect, useId, useRef, useState, type ComponentProps } from "react"
import { Languages, Mic, MicOff } from "lucide-react"
import { romanizeSinhalaTamil } from "@/lib/indic-romanization"

type SpeechRecognitionAlternative = {
  transcript: string
}

type SpeechRecognitionResult = {
  isFinal: boolean
  0: SpeechRecognitionAlternative
}

type SpeechRecognitionResultEvent = {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResult>
}

type SpeechRecognitionErrorEvent = {
  error: string
}

type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

type VoiceTextProps = Omit<ComponentProps<"textarea">, "onChange" | "value"> & {
  value: string
  onChange: (value: string) => void
}

function getSpeechRecognitionConstructor() {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

export function VoiceText({
  className,
  onChange,
  value,
  maxLength,
  ...textareaProps
}: VoiceTextProps) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const languageId = useId()
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState("")
  const [language, setLanguage] = useState("en-US")

  valueRef.current = value
  onChangeRef.current = onChange

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const SpeechRecognition = getSpeechRecognitionConstructor()
    if (!SpeechRecognition) {
      setVoiceError("Voice input is not supported in this browser.")
      return
    }

    setVoiceError("")
    const recognition = new SpeechRecognition()
    recognition.lang = language
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }
    recognition.onerror = (event) => {
      setIsListening(false)
      recognitionRef.current = null
      if (event.error === "not-allowed") {
        setVoiceError("Allow microphone access to use voice input.")
      } else if (event.error === "language-not-supported") {
        setVoiceError(
          "This browser's speech service does not support the selected language."
        )
      } else {
        setVoiceError("Voice input could not be captured. Please try again.")
      }
    }
    recognition.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length - event.resultIndex },
        (_, index) => event.results[event.resultIndex + index]
      )
        .filter((result) => result.isFinal)
        .map((result) => result[0].transcript.trim())
        .filter(Boolean)
        .join(" ")

      if (!transcript) return
      const currentValue = valueRef.current
      const separator = currentValue.trim() ? " " : ""
      const nextValue = `${currentValue}${separator}${transcript}`
      onChangeRef.current(
        typeof maxLength === "number"
          ? nextValue.slice(0, maxLength)
          : nextValue
      )
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setVoiceError("Voice input could not be started. Please try again.")
    }
  }

  function handleRomanize() {
    const romanized = romanizeSinhalaTamil(value)
    if (romanized === null) {
      setVoiceError(
        "Enter Sinhala or Tamil text to convert to English letters."
      )
      return
    }

    onChange(
      typeof maxLength === "number" ? romanized.slice(0, maxLength) : romanized
    )
    setVoiceError("")
  }

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#ed1c2e]/30">
        <textarea
          {...textareaProps}
          className={`min-h-28 w-full resize-y bg-transparent px-3 py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 ${className ?? ""}`}
          maxLength={maxLength}
          onChange={(event) => {
            onChange(event.target.value)
            setVoiceError("")
          }}
          value={value}
        />
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-2 py-1.5">
          <label className="sr-only" htmlFor={languageId}>
            Voice input language
          </label>
          <select
            id={languageId}
            aria-label="Voice input language"
            className="h-8 max-w-40 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30"
            disabled={isListening}
            onChange={(event) => setLanguage(event.target.value)}
            value={language}
          >
            <option value="en-US">English</option>
            <option value="si-LK">සිංහල</option>
            <option value="ta-LK">தமிழ்</option>
          </select>
          <button
            type="button"
            onClick={handleRomanize}
            aria-label="Convert Sinhala or Tamil text to English letters"
            title="Convert Sinhala or Tamil text to English letters"
            disabled={isListening || !value.trim()}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Languages className="size-3.5" aria-hidden="true" />
            <span>Romanize</span>
          </button>
          <button
            type="button"
            onClick={toggleListening}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            aria-pressed={isListening}
            title={isListening ? "Stop voice input" : "Add text by voice"}
            className={`grid size-8 shrink-0 place-items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/40 focus-visible:outline-none ${
              isListening
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {isListening ? (
              <MicOff className="size-4" aria-hidden="true" />
            ) : (
              <Mic className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {voiceError && (
        <p role="status" className="mt-1 text-[10px] text-rose-600">
          {voiceError}
        </p>
      )}
    </div>
  )
}
