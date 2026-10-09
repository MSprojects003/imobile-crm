"use client"

import Tesseract from "tesseract.js"

export async function readNicFromImage(
  image: File,
  onProgress?: (progress: number) => void
) {
  let worker: Tesseract.Worker | null = null

  try {
    worker = await Tesseract.createWorker("eng", undefined, {
      logger: (message) => {
        if (message.status === "recognizing text") {
          onProgress?.(Math.round(message.progress * 100))
        }
      },
    })
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789VXvx",
      preserve_interword_spaces: "1",
    })

    const {
      data: { text },
    } = await worker.recognize(image)

    const candidates = new Set<string>()
    for (const line of text.toUpperCase().split(/\r?\n/)) {
      for (const match of line.matchAll(
        /(?:^|[^A-Z0-9])(\d(?:[\s-]*\d){11}|\d(?:[\s-]*\d){8}[\s-]*[VX])(?=$|[^A-Z0-9])/g
      )) {
        candidates.add(match[1].replace(/[\s-]/g, ""))
      }
    }

    if (candidates.size === 0) {
      throw new Error(
        "We couldn’t clearly read a NIC number. Try a sharper, well-lit image."
      )
    }
    if (candidates.size > 1) {
      throw new Error(
        "More than one possible NIC number was found. Use a clear image showing only one NIC."
      )
    }

    return [...candidates][0]
  } finally {
    if (worker) await worker.terminate()
  }
}
